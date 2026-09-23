import Phaser from 'phaser';
import type { PrototypeSnapshot } from '@junqverse/sim';

export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

export class WorldView {
  public readonly player: Phaser.GameObjects.Arc;
  private readonly floor: Phaser.GameObjects.Graphics;
  private readonly blockers: Phaser.GameObjects.Graphics;

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
  }

  public render(snapshot: PrototypeSnapshot): void {
    this.player.setPosition(
      snapshot.player.position.x,
      snapshot.player.position.y
    );
  }

  public destroy(): void {
    this.player.destroy();
    this.blockers.destroy();
    this.floor.destroy();
  }
}
