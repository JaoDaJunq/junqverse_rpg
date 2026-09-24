import type { Vec2 } from '@junqverse/content';
import {
  JAO_BASIC_DEFINITION,
  JAO_E_DEFINITION,
  JAO_R_DEFINITION,
  JAO_W_DEFINITION
} from '@junqverse/content';
import { resolveConeHits } from '../areas.js';
import type { Aabb } from '../geometry.js';
import {
  createHitRegistry,
  type HitRegistry
} from '../hit-registry.js';
import {
  tryDetonateResonance,
  type ResonanceState,
  type ResonanceVisualEvent
} from '../resonance.js';
import type { CombatResources } from '../resources.js';
import {
  applyStatus,
  getHasteMagnitude,
  type StatusState
} from '../status.js';
import {
  applyJaoAttackDamage,
  type JaoCombatTarget,
  type JaoPassiveState
} from './jao.js';

const EPSILON = 1e-9;

export interface JaoRevealEntry {
  readonly id: string;
  readonly kind: 'enemy' | 'clue' | 'trap';
  readonly expiresAtTick: number;
}

export interface JaoRevealState {
  readonly entries: readonly JaoRevealEntry[];
}

export interface JaoRevealable {
  readonly id: string;
  readonly kind: 'clue' | 'trap';
  readonly position: Vec2;
}

export interface JaoWResult {
  readonly reveal: JaoRevealState;
  readonly targets: readonly JaoCombatTarget[];
  readonly revealedEnemyIds: readonly number[];
  readonly revealedObjectIds: readonly string[];
}

export interface JaoEChargeState {
  readonly ownerEntityId: number;
  readonly attackInstanceId: string;
  readonly startedAtTick: number;
  readonly direction: Vec2;
}

export interface JaoEReleasePlan {
  readonly ownerEntityId: number;
  readonly attackInstanceId: string;
  readonly direction: Vec2;
  readonly releaseTick: number;
  readonly chargeTicks: number;
  readonly baseDamage: number;
}

export interface JaoEResult {
  readonly registry: HitRegistry;
  readonly resonance: ResonanceState;
  readonly targets: readonly JaoCombatTarget[];
  readonly hitTargetIds: readonly number[];
  readonly visualEvents: readonly ResonanceVisualEvent[];
}

export interface JaoUltimateState {
  readonly charge: number;
  readonly activeUntilTick: number | null;
}

export interface JaoUltimateActivationResult {
  readonly accepted: boolean;
  readonly reason: 'accepted' | 'insufficient_charge' | 'already_active';
  readonly ultimate: JaoUltimateState;
  readonly resources: CombatResources;
  readonly qResetApplied: boolean;
}

export interface JaoTransientAbilityState {
  readonly ultimate: JaoUltimateState;
  readonly eCharge: JaoEChargeState | null;
}

function assertTick(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function assertEntityId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function assertStableId(value: string, name: string): void {
  if (!/^[a-z0-9_:-]{1,128}$/.test(value) || value === '__proto__') {
    throw new RangeError(`${name} must be a valid stable id`);
  }
}

function assertFiniteVec(value: Vec2, name: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${name} must contain finite coordinates`);
  }
}

function normalizeDirection(direction: Vec2): Vec2 {
  assertFiniteVec(direction, 'direction');
  const length = Math.hypot(direction.x, direction.y);
  if (length <= EPSILON) {
    throw new RangeError('direction must be non-zero');
  }
  return {
    x: direction.x / length,
    y: direction.y / length
  };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function upsertReveal(
  entries: readonly JaoRevealEntry[],
  incoming: JaoRevealEntry
): readonly JaoRevealEntry[] {
  return [
    ...entries.filter((entry) => entry.id !== incoming.id),
    incoming
  ].sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

export function createJaoRevealState(): JaoRevealState {
  return { entries: [] };
}

export function pruneJaoRevealState(
  state: JaoRevealState,
  currentTick: number
): JaoRevealState {
  assertTick(currentTick, 'currentTick');
  const entries = state.entries.filter(
    (entry) => entry.expiresAtTick > currentTick
  );
  return entries.length === state.entries.length
    ? state
    : { entries };
}

export function resolveJaoW(input: {
  readonly currentTick: number;
  readonly origin: Vec2;
  readonly reveal: JaoRevealState;
  readonly targets: readonly JaoCombatTarget[];
  readonly revealables: readonly JaoRevealable[];
}): JaoWResult {
  assertTick(input.currentTick, 'currentTick');
  assertFiniteVec(input.origin, 'origin');

  let reveal = pruneJaoRevealState(input.reveal, input.currentTick);
  const revealedEnemyIds: number[] = [];
  const revealedObjectIds: string[] = [];

  const targets = input.targets.map((target) => {
    assertEntityId(target.entityId, 'target entityId');
    assertFiniteVec(target.position, 'target position');

    if (
      !target.health.alive ||
      distance(input.origin, target.position) > JAO_W_DEFINITION.radiusPx
    ) {
      return target;
    }

    revealedEnemyIds.push(target.entityId);
    reveal = {
      entries: upsertReveal(reveal.entries, {
        id: `enemy:${target.entityId}`,
        kind: 'enemy',
        expiresAtTick:
          input.currentTick + JAO_W_DEFINITION.revealDurationTicks
      })
    };

    if (target.invulnerable === true) {
      return target;
    }

    return {
      ...target,
      status: applyStatus(target.status, {
        kind: 'vulnerable',
        sourceId: JAO_W_DEFINITION.id,
        durationTicks: JAO_W_DEFINITION.vulnerableDurationTicks
      }, {
        isBoss: target.isBoss ?? false
      }).state
    };
  });

  for (const revealable of input.revealables) {
    assertStableId(revealable.id, 'revealable id');
    assertFiniteVec(revealable.position, 'revealable position');

    if (
      distance(input.origin, revealable.position) >
      JAO_W_DEFINITION.radiusPx
    ) {
      continue;
    }

    revealedObjectIds.push(revealable.id);
    reveal = {
      entries: upsertReveal(reveal.entries, {
        id: revealable.id,
        kind: revealable.kind,
        expiresAtTick:
          input.currentTick + JAO_W_DEFINITION.revealDurationTicks
      })
    };
  }

  return {
    reveal,
    targets,
    revealedEnemyIds: revealedEnemyIds.sort((a, b) => a - b),
    revealedObjectIds: revealedObjectIds.sort()
  };
}

export function createJaoECharge(input: {
  readonly ownerEntityId: number;
  readonly attackInstanceId: string;
  readonly startedAtTick: number;
  readonly direction: Vec2;
}): JaoEChargeState {
  assertEntityId(input.ownerEntityId, 'ownerEntityId');
  assertStableId(input.attackInstanceId, 'attackInstanceId');
  assertTick(input.startedAtTick, 'startedAtTick');

  return {
    ownerEntityId: input.ownerEntityId,
    attackInstanceId: input.attackInstanceId,
    startedAtTick: input.startedAtTick,
    direction: normalizeDirection(input.direction)
  };
}

export function isJaoUltimateActive(
  state: JaoUltimateState,
  currentTick: number
): boolean {
  assertTick(currentTick, 'currentTick');
  return (
    state.activeUntilTick !== null &&
    state.activeUntilTick > currentTick
  );
}

export function getJaoEMaxChargeTicks(
  ultimate: JaoUltimateState,
  currentTick: number
): number {
  return isJaoUltimateActive(ultimate, currentTick)
    ? JAO_R_DEFINITION.eMaxChargeTicks
    : JAO_E_DEFINITION.maxChargeTicks;
}

export function getJaoEBaseDamage(chargeTicks: number): number {
  if (!Number.isInteger(chargeTicks)) {
    throw new RangeError('chargeTicks must be an integer');
  }

  const clamped = Math.max(
    JAO_E_DEFINITION.minChargeTicks,
    Math.min(JAO_E_DEFINITION.maxChargeTicks, chargeTicks)
  );
  const range =
    JAO_E_DEFINITION.maxChargeTicks - JAO_E_DEFINITION.minChargeTicks;
  const ratio =
    (clamped - JAO_E_DEFINITION.minChargeTicks) / range;

  return (
    JAO_E_DEFINITION.minBaseDamage +
    (
      JAO_E_DEFINITION.maxBaseDamage -
      JAO_E_DEFINITION.minBaseDamage
    ) * ratio
  );
}

export function planJaoERelease(input: {
  readonly charge: JaoEChargeState;
  readonly requestedReleaseTick: number;
  readonly ultimate: JaoUltimateState;
}): JaoEReleasePlan {
  assertTick(input.requestedReleaseTick, 'requestedReleaseTick');
  if (input.requestedReleaseTick < input.charge.startedAtTick) {
    throw new RangeError('release cannot precede charge acceptance');
  }

  const maxChargeTicks = getJaoEMaxChargeTicks(
    input.ultimate,
    input.requestedReleaseTick
  );
  const requestedChargeTicks =
    input.requestedReleaseTick - input.charge.startedAtTick;
  const chargeTicks = Math.max(
    JAO_E_DEFINITION.minChargeTicks,
    Math.min(maxChargeTicks, requestedChargeTicks)
  );

  const baseDamage =
    maxChargeTicks === JAO_R_DEFINITION.eMaxChargeTicks
      ? JAO_E_DEFINITION.maxBaseDamage
      : getJaoEBaseDamage(chargeTicks);

  return {
    ownerEntityId: input.charge.ownerEntityId,
    attackInstanceId: input.charge.attackInstanceId,
    direction: input.charge.direction,
    releaseTick: input.charge.startedAtTick + chargeTicks,
    chargeTicks,
    baseDamage
  };
}

export function resolveJaoERelease(input: {
  readonly plan: JaoEReleasePlan;
  readonly currentTick: number;
  readonly origin: Vec2;
  readonly rank: number;
  readonly blockers: readonly Aabb[];
  readonly targets: readonly JaoCombatTarget[];
  readonly passive: JaoPassiveState;
  readonly resonance: ResonanceState;
  readonly registry?: HitRegistry;
}): JaoEResult {
  assertTick(input.currentTick, 'currentTick');
  if (input.currentTick < input.plan.releaseTick) {
    throw new Error('E release is not ready yet');
  }
  assertFiniteVec(input.origin, 'origin');

  let registry = input.registry ?? createHitRegistry();
  const cone = resolveConeHits({
    attackInstanceId: input.plan.attackInstanceId,
    ownerEntityId: input.plan.ownerEntityId,
    origin: input.origin,
    direction: input.plan.direction,
    rangePx: JAO_E_DEFINITION.rangePx,
    halfAngleRadians:
      (JAO_E_DEFINITION.coneAngleDegrees * Math.PI / 180) / 2
  }, input.targets, input.blockers, registry);

  registry = cone.registry;
  let resonance = input.resonance;
  let targets = input.targets.map((target) => ({ ...target }));
  const visualEvents: ResonanceVisualEvent[] = [];

  for (const targetEntityId of cone.targetEntityIds) {
    targets = targets.map((target) => {
      if (target.entityId !== targetEntityId) {
        return target;
      }
      return applyJaoAttackDamage(
        target,
        input.plan.baseDamage,
        input.rank,
        input.passive,
        input.currentTick
      ).target;
    });

    const directTarget = targets.find(
      (target) => target.entityId === targetEntityId
    );
    const originalTarget = input.targets.find(
      (target) => target.entityId === targetEntityId
    );

    if (
      !directTarget ||
      !originalTarget ||
      (
        directTarget.health.health === originalTarget.health.health &&
        JSON.stringify(directTarget.health.shields) ===
          JSON.stringify(originalTarget.health.shields)
      )
    ) {
      continue;
    }

    const detonated = tryDetonateResonance(resonance, {
      triggerKind: 'detonator',
      primaryTargetEntityId: targetEntityId,
      detonatorEntityId: input.plan.ownerEntityId,
      detonatorRank: input.rank,
      currentTick: input.currentTick
    }, targets);

    resonance = detonated.state;
    visualEvents.push(...detonated.visualEvents);

    const byId = new Map(
      detonated.targets.map((target) => [target.entityId, target])
    );
    targets = targets.map((target) => {
      const updated = byId.get(target.entityId);
      return updated
        ? {
            ...target,
            health: updated.health,
            status: updated.status
          }
        : target;
    });
  }

  return {
    registry,
    resonance,
    targets,
    hitTargetIds: cone.targetEntityIds,
    visualEvents
  };
}

export function createJaoUltimateState(
  charge = 0
): JaoUltimateState {
  if (!Number.isFinite(charge) || charge < 0 || charge > 100) {
    throw new RangeError('ultimate charge must be between 0 and 100');
  }
  return {
    charge,
    activeUntilTick: null
  };
}

export function addJaoUltimateCharge(
  state: JaoUltimateState,
  amount: number
): JaoUltimateState {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('ultimate charge amount must be non-negative');
  }
  return {
    ...state,
    charge: Math.min(100, state.charge + amount)
  };
}

function resetJaoQCooldown(
  resources: CombatResources
): CombatResources {
  const cooldowns = { ...resources.cooldowns };
  delete cooldowns.jao_q;
  return {
    ...resources,
    cooldowns
  };
}

export function tryActivateJaoUltimate(input: {
  readonly ultimate: JaoUltimateState;
  readonly resources: CombatResources;
  readonly currentTick: number;
}): JaoUltimateActivationResult {
  assertTick(input.currentTick, 'currentTick');

  if (isJaoUltimateActive(input.ultimate, input.currentTick)) {
    return {
      accepted: false,
      reason: 'already_active',
      ultimate: input.ultimate,
      resources: input.resources,
      qResetApplied: false
    };
  }

  if (input.ultimate.charge < JAO_R_DEFINITION.ultimateChargeCost) {
    return {
      accepted: false,
      reason: 'insufficient_charge',
      ultimate: input.ultimate,
      resources: input.resources,
      qResetApplied: false
    };
  }

  return {
    accepted: true,
    reason: 'accepted',
    ultimate: {
      charge:
        input.ultimate.charge - JAO_R_DEFINITION.ultimateChargeCost,
      activeUntilTick:
        input.currentTick + JAO_R_DEFINITION.durationTicks
    },
    resources: resetJaoQCooldown(input.resources),
    qResetApplied: true
  };
}

export function getJaoHasteMagnitude(
  ultimate: JaoUltimateState,
  status: StatusState,
  currentTick: number
): number {
  return Math.max(
    getHasteMagnitude(status),
    isJaoUltimateActive(ultimate, currentTick)
      ? JAO_R_DEFINITION.hasteMagnitude
      : 0
  );
}

export function getJaoBasicCadenceTicks(
  ultimate: JaoUltimateState,
  currentTick: number
): number {
  return isJaoUltimateActive(ultimate, currentTick)
    ? Math.ceil(
        JAO_BASIC_DEFINITION.cadenceTicks *
        JAO_R_DEFINITION.basicCadenceMultiplier
      )
    : JAO_BASIC_DEFINITION.cadenceTicks;
}

export function getJaoEChargeMovementMultiplier(): number {
  return JAO_E_DEFINITION.movementMultiplierWhileCharging;
}

export function getJaoWorldTimeScale(): number {
  return JAO_R_DEFINITION.worldTimeScale;
}

export function clearJaoTransientBuffsOnDeath(
  state: JaoTransientAbilityState
): JaoTransientAbilityState {
  return {
    ultimate: {
      ...state.ultimate,
      activeUntilTick: null
    },
    eCharge: null
  };
}
