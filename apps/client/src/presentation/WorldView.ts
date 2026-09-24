import Phaser from 'phaser';
import type { PrototypeSnapshot } from '@junqverse/sim';

export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

type Facing = 'down' | 'up' | 'side';

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
    end: number,
    frameRate: number
  ): void => {
    if (scene.anims.exists(key)) {
      return;
    }

    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, {
        start: 0,
        end
      }),
      frameRate,
      repeat: -1
    });
  };

  create('jao-idle-down', 'jao-idle-down-sheet', 3, 5);
  create('jao-idle-side', 'jao-idle-side-sheet', 3, 5);
  create('jao-idle-up', 'jao-idle-up-sheet', 3, 5);
  create('jao-walk-down', 'jao-walk-down-sheet', 5, 9);
  create('jao-walk-side', 'jao-walk-side-sheet', 5, 9);
  create('jao-walk-up', 'jao-walk-up-sheet', 5, 9);
  create('eco-idle', 'eco-skeleton-idle-sheet', 3, 6);
}

export class WorldView {
  public readonly player: Phaser.GameObjects.Sprite;
  private readonly floor: Phaser.GameObjects.TileSprite;
  private readonly blockerTiles: Phaser.GameObjects.TileSprite[] = [];
  private readonly blockerOutline: Phaser.GameObjects.Graphics;
  private readonly enemies = new Map<number, EnemyVisual>();
  private lastPlayerPosition: { x: number; y: number };
  private facing: Facing = 'down';

  public constructor(
    scene: Phaser.Scene,
    initial: PrototypeSnapshot,
    bounds: WorldBounds
  ) {
    createAnimations(scene);

    this.floor = scene.add.tileSprite(
      0,
      0,
      bounds.width,
      bounds.height,
      'pixel-floor',
      0
    ).setOrigin(0).setDepth(-20);

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
        .setTint(0x94a3b8);

      this.blockerTiles.push(tile);
      this.blockerOutline.strokeRect(
        blocker.x,
        blocker.y,
        blocker.width,
        blocker.height
      );
    }

    this.player = scene.add.sprite(
      initial.player.position.x,
      initial.player.position.y,
      'jao-idle-down-sheet',
      0
    )
      .setScale(1.5)
      .setDepth(20)
      .play('jao-idle-down');

    this.lastPlayerPosition = {
      ...initial.player.position
    };

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

      this.enemies.set(enemy.entityId, {
        body,
        health
      });
    }
  }

  public setUltimateActive(active: boolean): void {
    if (active) {
      this.player.setTint(0x93c5fd);
    } else {
      this.player.clearTint();
    }
  }

  public render(snapshot: PrototypeSnapshot): void {
    const dx =
      snapshot.player.position.x - this.lastPlayerPosition.x;
    const dy =
      snapshot.player.position.y - this.lastPlayerPosition.y;
    const moving = Math.hypot(dx, dy) > 0.1;

    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = 'side';
        this.player.setFlipX(dx < 0);
      } else if (dy < 0) {
        this.facing = 'up';
        this.player.setFlipX(false);
      } else {
        this.facing = 'down';
        this.player.setFlipX(false);
      }
    }

    const animation = moving
      ? `jao-walk-${this.facing}`
      : `jao-idle-${this.facing}`;

    if (this.player.anims.currentAnim?.key !== animation) {
      this.player.play(animation);
    }

    this.player.setPosition(
      snapshot.player.position.x,
      snapshot.player.position.y
    );

    this.lastPlayerPosition = {
      ...snapshot.player.position
    };

    for (const enemy of snapshot.enemies) {
      const visual = this.enemies.get(enemy.entityId);
      if (!visual) {
        continue;
      }

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

  public destroy(): void {
    for (const visual of this.enemies.values()) {
      visual.body.destroy();
      visual.health.destroy();
    }
    this.enemies.clear();
    this.player.destroy();
    this.blockerTiles.forEach((tile) => tile.destroy());
    this.blockerTiles.length = 0;
    this.blockerOutline.destroy();
    this.floor.destroy();
  }
}
