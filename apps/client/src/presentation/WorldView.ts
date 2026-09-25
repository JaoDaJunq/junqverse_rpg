import Phaser from 'phaser';
import type { PrototypeCombatSnapshot, PrototypeSnapshot } from '@junqverse/sim';
import type { PrototypeHeroId } from '../ui/LabCatalog.js';

export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

type Facing = 'down' | 'up' | 'left' | 'right';
type SkillFacing = 'down' | 'up' | 'side';

interface WorldRenderSnapshot extends PrototypeSnapshot {
  readonly combat: PrototypeCombatSnapshot;
}

function facingFromVector(
  x: number,
  y: number,
  fallback: Facing
): Facing {
  if (Math.hypot(x, y) <= 0.01) return fallback;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}

function skillFacing(facing: Facing): SkillFacing {
  return facing === 'left' || facing === 'right' ? 'side' : facing;
}

interface EnemyVisual {
  readonly body: Phaser.GameObjects.Sprite;
  readonly health: Phaser.GameObjects.Text;
}

function enemyHealthText(
  enemy: PrototypeSnapshot['enemies'][number]
): string {
  const vulnerable = enemy.vulnerable ? ' • VULN' : '';
  const resonance = enemy.resonanceMarked
    ? ' • RESSONÂNCIA'
    : '';
  const ai = enemy.aiPhase === 'idle'
    ? ''
    : ` • ${enemy.aiPhase.toUpperCase()}`;
  return `${enemy.health}/${enemy.maxHealth}${vulnerable}${resonance}${ai}`;
}

function createAnimations(scene: Phaser.Scene): void {
  const create = (
    key: string,
    texture: string,
    start: number,
    end: number,
    frameRate: number,
    repeat: number
  ): void => {
    if (scene.anims.exists(key)) return;

    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, { start, end }),
      frameRate,
      repeat
    });
  };

  create('jao-idle-down', 'jao-actions-sheet', 0, 3, 5, -1);
  create('jao-idle-up', 'jao-actions-sheet', 4, 7, 5, -1);
  create('jao-idle-left', 'jao-actions-sheet', 8, 11, 5, -1);
  create('jao-idle-right', 'jao-actions-sheet', 12, 15, 5, -1);

  create('jao-run-down', 'jao-actions-sheet', 16, 19, 9, -1);
  create('jao-run-up', 'jao-actions-sheet', 20, 23, 9, -1);
  create('jao-run-left', 'jao-actions-sheet', 24, 27, 9, -1);
  create('jao-run-right', 'jao-actions-sheet', 28, 31, 9, -1);

  create('jao-basic-down', 'jao-actions-sheet', 32, 37, 18, 0);
  create('jao-basic-up', 'jao-actions-sheet', 38, 43, 18, 0);
  create('jao-basic-left', 'jao-actions-sheet', 44, 49, 18, 0);
  create('jao-basic-right', 'jao-actions-sheet', 50, 55, 18, 0);

  create('jao-q-down', 'jao-actions-sheet', 56, 61, 18, 0);
  create('jao-q-up', 'jao-actions-sheet', 62, 67, 18, 0);
  create('jao-q-side', 'jao-actions-sheet', 68, 73, 18, 0);

  create('jao-w-down', 'jao-actions-sheet', 74, 79, 18, 0);
  create('jao-w-up', 'jao-actions-sheet', 80, 85, 18, 0);
  create('jao-w-side', 'jao-actions-sheet', 86, 91, 18, 0);

  create('jao-e-down-charge', 'jao-actions-sheet', 92, 95, 8, -1);
  create('jao-e-down-release', 'jao-actions-sheet', 96, 99, 15, 0);
  create('jao-e-up-charge', 'jao-actions-sheet', 100, 103, 8, -1);
  create('jao-e-up-release', 'jao-actions-sheet', 104, 107, 15, 0);
  create('jao-e-side-charge', 'jao-actions-sheet', 108, 111, 8, -1);
  create('jao-e-side-release', 'jao-actions-sheet', 112, 115, 15, 0);

  create('jao-r-down-activation', 'jao-actions-sheet', 116, 119, 20, 0);
  create('jao-r-down-loop', 'jao-actions-sheet', 120, 123, 8, -1);
  create('jao-r-down-exit', 'jao-actions-sheet', 124, 125, 10, 0);
  create('jao-r-up-activation', 'jao-actions-sheet', 126, 129, 20, 0);
  create('jao-r-up-loop', 'jao-actions-sheet', 130, 133, 8, -1);
  create('jao-r-up-exit', 'jao-actions-sheet', 134, 135, 10, 0);
  create('jao-r-side-activation', 'jao-actions-sheet', 136, 139, 20, 0);
  create('jao-r-side-loop', 'jao-actions-sheet', 140, 143, 8, -1);
  create('jao-r-side-exit', 'jao-actions-sheet', 144, 145, 10, 0);

  create('eco-idle', 'eco-skeleton-idle-sheet', 0, 3, 6, -1);
  create('test-idle', 'test-rogue-idle-sheet', 0, 3, 7, -1);
}

export class WorldView {
  public readonly player: Phaser.GameObjects.Sprite;
  private readonly heroId: PrototypeHeroId;
  private readonly floor: Phaser.GameObjects.TileSprite;
  private readonly blockerTiles: Phaser.GameObjects.TileSprite[] = [];
  private readonly blockerOutline: Phaser.GameObjects.Graphics;
  private readonly decorations: Phaser.GameObjects.GameObject[] = [];
  private readonly enemies = new Map<number, EnemyVisual>();
  private lastPlayerPosition: { x: number; y: number };
  private facing: Facing = 'down';
  private lastActionFacing: Facing = 'down';
  private previousUltimate = false;

  public constructor(
    scene: Phaser.Scene,
    initial: PrototypeSnapshot,
    bounds: WorldBounds,
    heroId: PrototypeHeroId = 'jao'
  ) {
    this.heroId = heroId;
    createAnimations(scene);

    this.floor = scene.add.tileSprite(
      0,
      0,
      bounds.width,
      bounds.height,
      'pixel-floor',
      0
    ).setOrigin(0).setDepth(-20).setTileScale(2, 2);

    this.blockerOutline = scene.add.graphics().setDepth(-5);
    this.blockerOutline.lineStyle(1, 0x94a3b8, 0.5);

    for (const blocker of initial.blockers) {
      const tile = scene.add.tileSprite(
        blocker.x,
        blocker.y,
        blocker.width,
        blocker.height,
        'pixel-wall',
        0
      )
        .setOrigin(0)
        .setDepth(-10)
        .setTileScale(2, 2)
        .setTint(0x94a3b8);

      this.blockerTiles.push(tile);
      this.blockerOutline.strokeRect(
        blocker.x,
        blocker.y,
        blocker.width,
        blocker.height
      );
    }

    const addDecoration = (
      x: number,
      y: number,
      texture: string,
      frame: number,
      scale = 2,
      depth = -2,
      tint?: number
    ): void => {
      const shadow = scene.add.ellipse(
        x,
        y + 8,
        22,
        8,
        0x020617,
        0.28
      ).setDepth(depth - 1);
      const sprite = scene.add.sprite(x, y, texture, frame)
        .setScale(scale)
        .setDepth(depth);
      if (tint !== undefined) sprite.setTint(tint);
      this.decorations.push(shadow, sprite);
    };

    addDecoration(112, 96, 'pixel-rocks', 3, 2.2);
    addDecoration(1090, 110, 'pixel-rocks', 7, 2.1);
    addDecoration(1080, 650, 'pixel-rocks', 5, 1.8);
    addDecoration(96, 640, 'pixel-rocks', 9, 1.7);
    addDecoration(520, 88, 'pixel-dungeon-props', 8, 2);
    addDecoration(688, 88, 'pixel-dungeon-props', 9, 2);
    addDecoration(1040, 312, 'pixel-dungeon-props', 79, 2);
    addDecoration(248, 472, 'pixel-dungeon-props', 80, 2);
    addDecoration(904, 160, 'pixel-esoteric', 26, 1.9, -2, 0x93c5fd);
    addDecoration(232, 176, 'pixel-esoteric', 27, 1.9, -2, 0xc4b5fd);
    addDecoration(672, 600, 'pixel-esoteric', 54, 1.9, -2, 0xfacc15);

    const playerTexture = heroId === 'test'
      ? 'test-rogue-idle-sheet'
      : 'jao-actions-sheet';

    this.player = scene.add.sprite(
      initial.player.position.x,
      initial.player.position.y,
      playerTexture,
      0
    )
      .setScale(heroId === 'test' ? 2 : 2.5)
      .setOrigin(0.5, heroId === 'test' ? 0.5 : 0.875)
      .setDepth(20)
      .play(heroId === 'test' ? 'test-idle' : 'jao-idle-down');

    this.lastPlayerPosition = { ...initial.player.position };

    for (const enemy of initial.enemies) {
      const body = scene.add.sprite(
        enemy.position.x,
        enemy.position.y,
        'eco-skeleton-idle-sheet',
        0
      )
        .setScale(1.5)
        .setDepth(18)
        .play('eco-idle');

      const health = scene.add.text(
        enemy.position.x,
        enemy.position.y - 28,
        enemyHealthText(enemy),
        {
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          backgroundColor: '#111827cc',
          padding: { x: 4, y: 2 }
        }
      ).setOrigin(0.5).setDepth(30);

      this.enemies.set(enemy.entityId, { body, health });
    }
  }

  public setUltimateActive(active: boolean): void {
    if (this.heroId === 'jao') {
      this.player.clearTint();
      return;
    }

    if (active) this.player.setTint(0x93c5fd);
    else this.player.clearTint();
  }

  public render(snapshot: WorldRenderSnapshot): void {
    const dx =
      snapshot.player.position.x - this.lastPlayerPosition.x;
    const dy =
      snapshot.player.position.y - this.lastPlayerPosition.y;
    const moving = Math.hypot(dx, dy) > 0.1;

    if (this.heroId === 'test') {
      if (Math.abs(dx) > 0.1) {
        this.player.setFlipX(dx < 0);
      }
      if (this.player.anims.currentAnim?.key !== 'test-idle') {
        this.player.play('test-idle');
      }
    } else {
      this.renderJaoAnimation(snapshot, moving, dx, dy);
    }

    this.player.setPosition(
      snapshot.player.position.x,
      snapshot.player.position.y
    );
    this.lastPlayerPosition = { ...snapshot.player.position };

    for (const enemy of snapshot.enemies) {
      const visual = this.enemies.get(enemy.entityId);
      if (!visual) continue;

      visual.body
        .setPosition(enemy.position.x, enemy.position.y)
        .setVisible(enemy.alive);

      if (enemy.vulnerable) {
        visual.body.setTint(0xfacc15);
      } else if (enemy.resonanceMarked) {
        visual.body.setTint(0x60a5fa);
      } else {
        visual.body.clearTint();
      }

      visual.health
        .setPosition(enemy.position.x, enemy.position.y - 28)
        .setText(enemyHealthText(enemy))
        .setVisible(enemy.alive);
    }
  }

  private renderJaoAnimation(
    snapshot: WorldRenderSnapshot,
    moving: boolean,
    dx: number,
    dy: number
  ): void {
    if (moving) {
      this.facing = facingFromVector(dx, dy, this.facing);
    }

    const combat = snapshot.combat;

    if (combat.basicDirection !== null) {
      const actionFacing = facingFromVector(
        combat.basicDirection.x,
        combat.basicDirection.y,
        this.facing
      );
      this.lastActionFacing = actionFacing;
      this.playJaoAnimation('jao-basic-' + actionFacing);
    } else if (
      combat.qDashActive ||
      combat.activeAbilityId === 'jao_q'
    ) {
      if (combat.qDirection !== null) {
        this.lastActionFacing = facingFromVector(
          combat.qDirection.x,
          combat.qDirection.y,
          this.facing
        );
      }
      this.playJaoSkillAnimation('q', this.lastActionFacing);
    } else if (combat.activeAbilityId === 'jao_w') {
      this.lastActionFacing = this.facing;
      this.playJaoSkillAnimation('w', this.lastActionFacing);
    } else if (combat.eCharging) {
      if (combat.eDirection !== null) {
        this.lastActionFacing = facingFromVector(
          combat.eDirection.x,
          combat.eDirection.y,
          this.facing
        );
      }
      this.playJaoSkillAnimation(
        'e',
        this.lastActionFacing,
        'charge'
      );
    } else if (combat.activeAbilityId === 'jao_e') {
      this.playJaoSkillAnimation(
        'e',
        this.lastActionFacing,
        'release'
      );
    } else if (
      combat.activeAbilityId === 'jao_r' &&
      combat.activeAbilityPhase === 'windup'
    ) {
      this.lastActionFacing = this.facing;
      this.playJaoSkillAnimation(
        'r',
        this.lastActionFacing,
        'activation'
      );
    } else if (combat.ultimateActive) {
      this.playJaoSkillAnimation(
        'r',
        this.lastActionFacing,
        'loop'
      );
    } else if (this.previousUltimate) {
      this.playJaoSkillAnimation(
        'r',
        this.lastActionFacing,
        'exit'
      );
    } else if (!this.isFinishingJaoAction()) {
      this.playJaoAnimation(
        moving
          ? 'jao-run-' + this.facing
          : 'jao-idle-' + this.facing
      );
    }

    this.previousUltimate = combat.ultimateActive;
  }

  private playJaoSkillAnimation(
    skill: 'q' | 'w' | 'e' | 'r',
    facing: Facing,
    phase?: 'charge' | 'release' | 'activation' | 'loop' | 'exit'
  ): void {
    const direction = skillFacing(facing);
    const suffix = phase === undefined ? '' : '-' + phase;
    this.playJaoAnimation(
      'jao-' + skill + '-' + direction + suffix,
      direction === 'side' && facing === 'left'
    );
  }

  private playJaoAnimation(key: string, flipX = false): void {
    this.player.setFlipX(flipX);
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key);
    }
  }

  private isFinishingJaoAction(): boolean {
    const key = this.player.anims.currentAnim?.key ?? '';
    if (!this.player.anims.isPlaying) return false;

    return (
      key.startsWith('jao-basic-') ||
      key.startsWith('jao-q-') ||
      key.startsWith('jao-w-') ||
      key.includes('-release') ||
      key.includes('-activation') ||
      key.includes('-exit')
    );
  }

  public destroy(): void {
    for (const visual of this.enemies.values()) {
      visual.body.destroy();
      visual.health.destroy();
    }
    this.enemies.clear();
    this.player.destroy();
    this.decorations.forEach((item) => item.destroy());
    this.decorations.length = 0;
    this.blockerTiles.forEach((tile) => tile.destroy());
    this.blockerTiles.length = 0;
    this.blockerOutline.destroy();
    this.floor.destroy();
  }
}
