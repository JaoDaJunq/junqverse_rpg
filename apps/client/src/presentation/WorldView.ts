import Phaser from 'phaser';
import type { PrototypeSnapshot } from '@junqverse/sim';

export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

interface EnemyVisual {
  readonly body: Phaser.GameObjects.Arc;
  readonly health: Phaser.GameObjects.Text;
}

function enemyHealthText(
  enemy: PrototypeSnapshot['enemies'][number]
): string {
  const vulnerable = enemy.vulnerable ? ' • VULN' : '';
  return `${enemy.health}/${enemy.maxHealth}${vulnerable}`;
}

export class WorldView {
  public readonly player: Phaser.GameObjects.Arc;
  private readonly floor: Phaser.GameObjects.Graphics;
  private readonly blockers: Phaser.GameObjects.Graphics;
  private readonly enemies = new Map<number, EnemyVisual>();

  public constructor(
    scene: Phaser.Scene,
    initial: PrototypeSnapshot,
    bounds: WorldBounds
  ) {
    this.floor = scene.add.graphics();
    this.floor.fillStyle(0x111827, 1);
    this.floor.fillRect(0, 0, bounds.width, bounds.height);
    this.floor.lineStyle(1, 0x263244, 0.75);

    for (let x = 0; x <= bounds.width; x += 32) {
      this.floor.lineBetween(x, 0, x, bounds.height);
    }
    for (let y = 0; y <= bounds.height; y += 32) {
      this.floor.lineBetween(0, y, bounds.width, y);
    }

    this.blockers = scene.add.graphics();
    this.blockers.fillStyle(0x374151, 1);

    for (const blocker of initial.blockers) {
      this.blockers.fillRect(
        blocker.x,
        blocker.y,
        blocker.width,
        blocker.height
      );
    }

    this.player = scene.add.circle(
      initial.player.position.x,
      initial.player.position.y,
      initial.player.radius,
      0x60a5fa,
      1
    );
    this.player.setStrokeStyle(2, 0xe5e7eb, 1);

    for (const enemy of initial.enemies) {
      const body = scene.add.circle(
        enemy.position.x,
        enemy.position.y,
        enemy.radius,
        0xef4444,
        1
      );
      body.setStrokeStyle(
        enemy.vulnerable ? 4 : 2,
        enemy.vulnerable ? 0xfacc15 : 0xfef2f2,
        1
      );

      const health = scene.add.text(
        enemy.position.x,
        enemy.position.y - 24,
        enemyHealthText(enemy),
        {
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          backgroundColor: '#111827cc',
          padding: { x: 4, y: 2 }
        }
      ).setOrigin(0.5);

      this.enemies.set(enemy.entityId, {
        body,
        health
      });
    }
  }

  public render(snapshot: PrototypeSnapshot): void {
    this.player.setPosition(
      snapshot.player.position.x,
      snapshot.player.position.y
    );

    for (const enemy of snapshot.enemies) {
      const visual = this.enemies.get(enemy.entityId);
      if (!visual) {
        continue;
      }

      visual.body
        .setPosition(enemy.position.x, enemy.position.y)
        .setStrokeStyle(
          enemy.vulnerable ? 4 : 2,
          enemy.vulnerable ? 0xfacc15 : 0xfef2f2,
          1
        )
        .setVisible(enemy.alive);
      visual.health
        .setPosition(enemy.position.x, enemy.position.y - 24)
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
    this.blockers.destroy();
    this.floor.destroy();
  }
}
