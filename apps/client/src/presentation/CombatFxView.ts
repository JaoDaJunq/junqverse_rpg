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
import {
  DEFAULT_LAB_LOADOUT,
  type LabEffectId,
  type LabLoadout,
  type LabSlotId,
  type PrototypeHeroId
} from '../ui/LabCatalog.js';

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
  private readonly playerSprite: Phaser.GameObjects.Sprite;
  private readonly heroId: PrototypeHeroId;
  private labLoadout: LabLoadout;
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
  private lastAfterimageTick = -1;
  private lastUltimatePulseTick = -1;
  private previousPlayerPosition: Vec2;

  public constructor(
    scene: Phaser.Scene,
    initial: LocalSessionSnapshot,
    playerSprite: Phaser.GameObjects.Sprite,
    heroId: PrototypeHeroId = 'jao',
    labLoadout: LabLoadout = DEFAULT_LAB_LOADOUT
  ) {
    this.scene = scene;
    this.playerSprite = playerSprite;
    this.heroId = heroId;
    this.labLoadout = labLoadout;
    this.telegraphs = scene.add.graphics().setDepth(10);

    this.previousPlayerHealth = initial.player.health;
    this.previousPlayerPosition = { ...initial.player.position };

    for (const enemy of initial.enemies) {
      this.previousHealth.set(enemy.entityId, enemy.health);
    }
  }

  public setLabLoadout(loadout: LabLoadout): void {
    this.labLoadout = loadout;
  }

  public previewEffect(effectId: LabEffectId): void {
    this.playEffect(
      effectId,
      { x: this.playerSprite.x, y: this.playerSprite.y },
      { x: this.playerSprite.flipX ? -1 : 1, y: 0 }
    );
  }

  public render(snapshot: LocalSessionSnapshot): void {
    this.telegraphs.clear();

    if (snapshot.combat.eDirection !== null) {
      this.lastEDirection = snapshot.combat.eDirection;
    }

    this.drawPlayerAreas(snapshot);
    this.drawEnemyTelegraphs(snapshot);
    this.spawnUltimatePresentation(snapshot);
    this.spawnTransitions(snapshot);
    this.spawnDamageImpacts(snapshot);

    this.previousQDash = snapshot.combat.qDashActive;
    this.previousECharging = snapshot.combat.eCharging;
    this.previousUltimate = snapshot.combat.ultimateActive;
    this.previousAbility = snapshot.combat.activeAbilityId;
    this.previousAbilityPhase = snapshot.combat.activeAbilityPhase;
    this.previousPlayerPosition = { ...snapshot.player.position };
  }

  public destroy(): void {
    this.telegraphs.destroy();
    this.previousHealth.clear();
  }

  private effect(slot: LabSlotId): LabEffectId {
    return this.labLoadout.effects[slot];
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
      snapshot.combat.qDirection !== null &&
      this.heroId === 'jao'
    ) {
      const direction = normalized(snapshot.combat.qDirection);
      const end = {
        x: origin.x + direction.x * JAO_Q_DEFINITION.rangePx,
        y: origin.y + direction.y * JAO_Q_DEFINITION.rangePx
      };

      this.telegraphs.lineStyle(8, 0x38bdf8, 0.10);
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
      this.telegraphs.lineStyle(2, 0x93c5fd, 0.65);
      this.telegraphs.strokeCircle(origin.x, origin.y, 24);
      this.telegraphs.lineStyle(1, 0x60a5fa, 0.42);
      this.telegraphs.strokeCircle(origin.x, origin.y, 34);
    }
  }

  private drawEnemyTelegraphs(snapshot: LocalSessionSnapshot): void {
    for (const enemy of snapshot.enemies) {
      if (!enemy.alive || enemy.aiPhase !== 'telegraph') continue;

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

  private spawnUltimatePresentation(
    snapshot: LocalSessionSnapshot
  ): void {
    if (!snapshot.combat.ultimateActive) return;

    const moved = Math.hypot(
      snapshot.player.position.x - this.previousPlayerPosition.x,
      snapshot.player.position.y - this.previousPlayerPosition.y
    ) > 0.5;

    if (
      moved &&
      snapshot.tick !== this.lastAfterimageTick &&
      snapshot.tick % 3 === 0
    ) {
      this.lastAfterimageTick = snapshot.tick;
      const ghost = this.scene.add.sprite(
        this.previousPlayerPosition.x,
        this.previousPlayerPosition.y,
        this.playerSprite.texture.key,
        this.playerSprite.frame.name
      )
        .setScale(this.playerSprite.scaleX, this.playerSprite.scaleY)
        .setOrigin(this.playerSprite.originX, this.playerSprite.originY)
        .setFlipX(this.playerSprite.flipX)
        .setDepth(19)
        .setTint(0x60a5fa)
        .setAlpha(0.28);

      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 140,
        onComplete: () => ghost.destroy()
      });
    }

    if (
      snapshot.tick !== this.lastUltimatePulseTick &&
      snapshot.tick % 12 === 0
    ) {
      this.lastUltimatePulseTick = snapshot.tick;
      this.spawnBurst(
        'vfx-spark',
        snapshot.player.position.x,
        snapshot.player.position.y,
        0x93c5fd,
        0.045,
        150
      );
    }
  }

  private spawnTransitions(snapshot: LocalSessionSnapshot): void {
    if (this.heroId === 'jao') return;

    const combat = snapshot.combat;
    const player = snapshot.player.position;

    if (combat.qDashActive && !this.previousQDash) {
      if (this.heroId === 'test') {
        this.playEffect(
          this.effect('q'),
          player,
          combat.qDirection ?? { x: 1, y: 0 }
        );
      } else {
        this.spawnBurst('vfx-spark', player.x, player.y, 0x38bdf8, 0.075, 170);
      }
    }

    if (
      combat.activeAbilityId === 'jao_w' &&
      this.previousAbility !== 'jao_w'
    ) {
      if (this.heroId === 'test') {
        this.playEffect(this.effect('w'), player, { x: 1, y: 0 });
      } else {
        this.spawnBurst('vfx-magic', player.x, player.y, 0xa78bfa, 0.10, 260);
      }
    }

    if (this.previousECharging && !combat.eCharging) {
      if (this.heroId === 'test') {
        this.playEffect(this.effect('e'), player, this.lastEDirection);
      } else {
        this.spawnDirectionalBurst(
          'vfx-slash',
          player,
          this.lastEDirection,
          0xfacc15
        );
      }
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
      if (this.heroId === 'test') {
        this.playEffect(
          this.effect('basic'),
          player,
          combat.basicDirection
        );
      } else {
        this.spawnDirectionalBurst(
          'vfx-slash',
          player,
          combat.basicDirection,
          0xe2e8f0
        );
      }
    }

    if (combat.ultimateActive && !this.previousUltimate) {
      if (this.heroId === 'test') {
        this.playEffect(this.effect('r'), player, { x: 1, y: 0 });
      } else {
        this.spawnBurst('vfx-circle', player.x, player.y, 0x60a5fa, 0.18, 420);
        this.spawnBurst('vfx-magic', player.x, player.y, 0x93c5fd, 0.13, 360);
      }
    }
  }

  private playEffect(
    effectId: LabEffectId,
    origin: Vec2,
    direction: Vec2
  ): void {
    switch (effectId) {
      case 'slash_white':
        this.spawnDirectionalBurst('vfx-slash', origin, direction, 0xf8fafc);
        return;
      case 'spark_blue':
        this.spawnBurst('vfx-spark', origin.x, origin.y, 0x38bdf8, 0.08, 190);
        return;
      case 'magic_violet':
        this.spawnBurst('vfx-magic', origin.x, origin.y, 0xa78bfa, 0.11, 260);
        return;
      case 'circle_cyan':
        this.spawnBurst('vfx-circle', origin.x, origin.y, 0x22d3ee, 0.16, 340);
        return;
      case 'impact_gold':
        this.spawnBurst('vfx-impact', origin.x, origin.y, 0xfacc15, 0.075, 190);
        return;
      case 'arcane_combo':
        this.spawnBurst('vfx-magic', origin.x, origin.y, 0xa78bfa, 0.11, 300);
        this.spawnBurst('vfx-circle', origin.x, origin.y, 0x22d3ee, 0.15, 360);
        this.spawnBurst('vfx-impact', origin.x, origin.y, 0xffffff, 0.045, 170);
        return;
      case 'electric_combo':
        this.spawnBurst('vfx-spark', origin.x, origin.y, 0x38bdf8, 0.08, 220);
        this.spawnDirectionalBurst('vfx-slash', origin, direction, 0x7dd3fc);
        this.spawnBurst('vfx-impact', origin.x, origin.y, 0x93c5fd, 0.045, 160);
        return;
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

      if (previous !== undefined && enemy.health < previous) {
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
