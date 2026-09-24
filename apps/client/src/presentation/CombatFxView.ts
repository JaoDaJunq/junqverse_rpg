import Phaser from 'phaser';
import {
  ECO_RASTEIRO_DEFINITION,
  JAO_BASIC_DEFINITION,
  JAO_E_DEFINITION,
  JAO_Q_DEFINITION,
  JAO_W_DEFINITION,
  type Vec2
} from '@junqverse/content';
import type { LocalSessionSnapshot } from '../adapters/LocalSession.js';

function normalized(direction: Vec2): Vec2 {
  const length = Math.hypot(direction.x, direction.y);
  return length > 0
    ? { x: direction.x / length, y: direction.y / length }
    : { x: 1, y: 0 };
}

function sectorPoints(
  origin: Vec2,
  direction: Vec2,
  range: number,
  angleDegrees: number
): Phaser.Geom.Point[] {
  const dir = normalized(direction);
  const center = Math.atan2(dir.y, dir.x);
  const half = angleDegrees * Math.PI / 360;
  const points = [new Phaser.Geom.Point(origin.x, origin.y)];
  const segments = 14;

  for (let index = 0; index <= segments; index += 1) {
    const angle =
      center - half + (index / segments) * half * 2;
    points.push(new Phaser.Geom.Point(
      origin.x + Math.cos(angle) * range,
      origin.y + Math.sin(angle) * range
    ));
  }

  return points;
}

export class CombatFxView {
  private readonly scene: Phaser.Scene;
  private readonly telegraphs: Phaser.GameObjects.Graphics;
  private readonly previousHealth = new Map<number, number>();
  private previousQDash = false;
  private previousECharging = false;
  private previousUltimate = false;
  private previousPlayerHealth: number;
  private lastEDirection: Vec2 = { x: 1, y: 0 };
  private previousAbility: string | null = null;
  private previousAbilityPhase:
    | 'windup'
    | 'active'
    | 'recovery'
    | null = null;

  public constructor(
    scene: Phaser.Scene,
    initial: LocalSessionSnapshot
  ) {
    this.scene = scene;
    this.telegraphs = scene.add.graphics().setDepth(10);

    this.previousPlayerHealth = initial.player.health;

    for (const enemy of initial.enemies) {
      this.previousHealth.set(enemy.entityId, enemy.health);
    }
  }

  public render(snapshot: LocalSessionSnapshot): void {
    this.telegraphs.clear();

    if (snapshot.combat.eDirection !== null) {
      this.lastEDirection = snapshot.combat.eDirection;
    }

    this.drawPlayerAreas(snapshot);
    this.drawEnemyTelegraphs(snapshot);
    this.spawnTransitions(snapshot);
    this.spawnDamageImpacts(snapshot);

    this.previousQDash = snapshot.combat.qDashActive;
    this.previousECharging = snapshot.combat.eCharging;
    this.previousUltimate = snapshot.combat.ultimateActive;
    this.previousAbility = snapshot.combat.activeAbilityId;
    this.previousAbilityPhase = snapshot.combat.activeAbilityPhase;
  }

  public destroy(): void {
    this.telegraphs.destroy();
    this.previousHealth.clear();
  }

  private drawPlayerAreas(snapshot: LocalSessionSnapshot): void {
    const origin = snapshot.player.position;

    if (
      snapshot.combat.activeAbilityId === 'jao_basic' &&
      snapshot.combat.basicDirection !== null
    ) {
      this.drawSector(
        origin,
        snapshot.combat.basicDirection,
        JAO_BASIC_DEFINITION.rangePx,
        JAO_BASIC_DEFINITION.coneAngleDegrees,
        0xe2e8f0
      );
    }

    if (
      snapshot.combat.qDashActive &&
      snapshot.combat.qDirection !== null
    ) {
      const direction = normalized(snapshot.combat.qDirection);
      const end = {
        x: origin.x + direction.x * JAO_Q_DEFINITION.rangePx,
        y: origin.y + direction.y * JAO_Q_DEFINITION.rangePx
      };

      this.telegraphs.lineStyle(20, 0x38bdf8, 0.14);
      this.telegraphs.lineBetween(origin.x, origin.y, end.x, end.y);
      this.telegraphs.lineStyle(2, 0x7dd3fc, 0.85);
      this.telegraphs.lineBetween(origin.x, origin.y, end.x, end.y);
    }

    if (snapshot.combat.activeAbilityId === 'jao_w') {
      this.telegraphs.fillStyle(0xa78bfa, 0.08);
      this.telegraphs.fillCircle(
        origin.x,
        origin.y,
        JAO_W_DEFINITION.radiusPx
      );
      this.telegraphs.lineStyle(2, 0xc4b5fd, 0.7);
      this.telegraphs.strokeCircle(
        origin.x,
        origin.y,
        JAO_W_DEFINITION.radiusPx
      );
    }

    if (
      snapshot.combat.eCharging &&
      snapshot.combat.eDirection !== null
    ) {
      this.drawSector(
        origin,
        snapshot.combat.eDirection,
        JAO_E_DEFINITION.rangePx,
        JAO_E_DEFINITION.coneAngleDegrees,
        0xfacc15
      );
    }

    if (snapshot.combat.ultimateActive) {
      this.telegraphs.fillStyle(0x60a5fa, 0.06);
      this.telegraphs.fillCircle(origin.x, origin.y, 92);
      this.telegraphs.lineStyle(2, 0x93c5fd, 0.55);
      this.telegraphs.strokeCircle(origin.x, origin.y, 92);
    }
  }

  private drawEnemyTelegraphs(snapshot: LocalSessionSnapshot): void {
    for (const enemy of snapshot.enemies) {
      if (!enemy.alive || enemy.aiPhase !== 'telegraph') {
        continue;
      }

      const radius = enemy.archetype === 'eco_rasteiro'
        ? ECO_RASTEIRO_DEFINITION.attackRangePx
        : 120;

      this.telegraphs.fillStyle(0xef4444, 0.18);
      this.telegraphs.fillCircle(
        enemy.position.x,
        enemy.position.y,
        radius
      );
      this.telegraphs.lineStyle(3, 0xf87171, 0.95);
      this.telegraphs.strokeCircle(
        enemy.position.x,
        enemy.position.y,
        radius
      );
      this.telegraphs.lineStyle(2, 0xfca5a5, 0.55);
      this.telegraphs.lineBetween(
        enemy.position.x,
        enemy.position.y,
        snapshot.player.position.x,
        snapshot.player.position.y
      );
    }
  }

  private drawSector(
    origin: Vec2,
    direction: Vec2,
    range: number,
    angleDegrees: number,
    color: number
  ): void {
    const points = sectorPoints(
      origin,
      direction,
      range,
      angleDegrees
    );

    this.telegraphs.fillStyle(color, 0.14);
    this.telegraphs.fillPoints(points, true);
    this.telegraphs.lineStyle(2, color, 0.8);
    this.telegraphs.strokePoints(points, true);
  }

  private spawnTransitions(snapshot: LocalSessionSnapshot): void {
    const combat = snapshot.combat;
    const player = snapshot.player.position;

    if (combat.qDashActive && !this.previousQDash) {
      this.spawnBurst(
        'vfx-spark',
        player.x,
        player.y,
        0x38bdf8,
        0.075,
        170
      );
    }

    if (
      combat.activeAbilityId === 'jao_w' &&
      this.previousAbility !== 'jao_w'
    ) {
      this.spawnBurst(
        'vfx-magic',
        player.x,
        player.y,
        0xa78bfa,
        0.10,
        260
      );
    }

    if (
      this.previousECharging &&
      !combat.eCharging
    ) {
      this.spawnDirectionalBurst(
        'vfx-slash',
        player,
        this.lastEDirection,
        0xfacc15
      );
    }

    if (
      combat.activeAbilityId === 'jao_basic' &&
      combat.activeAbilityPhase === 'active' &&
      !(
        this.previousAbility === 'jao_basic' &&
        this.previousAbilityPhase === 'active'
      ) &&
      combat.basicDirection !== null
    ) {
      this.spawnDirectionalBurst(
        'vfx-slash',
        player,
        combat.basicDirection,
        0xe2e8f0
      );
    }

    if (combat.ultimateActive && !this.previousUltimate) {
      this.spawnBurst(
        'vfx-circle',
        player.x,
        player.y,
        0x60a5fa,
        0.18,
        420
      );
      this.spawnBurst(
        'vfx-magic',
        player.x,
        player.y,
        0x93c5fd,
        0.13,
        360
      );
    }
  }

  private spawnDamageImpacts(snapshot: LocalSessionSnapshot): void {
    if (snapshot.player.health < this.previousPlayerHealth) {
      this.spawnBurst(
        'vfx-impact',
        snapshot.player.position.x,
        snapshot.player.position.y,
        0xf87171,
        0.07,
        170
      );
    }
    this.previousPlayerHealth = snapshot.player.health;

    for (const enemy of snapshot.enemies) {
      const previous = this.previousHealth.get(enemy.entityId);

      if (
        previous !== undefined &&
        enemy.health < previous
      ) {
        this.spawnBurst(
          'vfx-impact',
          enemy.position.x,
          enemy.position.y,
          enemy.vulnerable ? 0xfacc15 : 0xffffff,
          0.065,
          150
        );
      }

      this.previousHealth.set(enemy.entityId, enemy.health);
    }
  }

  private spawnDirectionalBurst(
    texture: string,
    origin: Vec2,
    direction: Vec2,
    tint: number
  ): void {
    const dir = normalized(direction);
    const image = this.scene.add.image(
      origin.x + dir.x * 34,
      origin.y + dir.y * 34,
      texture
    )
      .setDepth(35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tint)
      .setRotation(Math.atan2(dir.y, dir.x))
      .setScale(0.085)
      .setAlpha(0.85);

    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      scaleX: 0.13,
      scaleY: 0.13,
      duration: 160,
      onComplete: () => image.destroy()
    });
  }

  private spawnBurst(
    texture: string,
    x: number,
    y: number,
    tint: number,
    scale: number,
    duration: number
  ): void {
    const image = this.scene.add.image(x, y, texture)
      .setDepth(35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tint)
      .setScale(scale)
      .setAlpha(0.8);

    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      scaleX: scale * 1.45,
      scaleY: scale * 1.45,
      duration,
      onComplete: () => image.destroy()
    });
  }
}
