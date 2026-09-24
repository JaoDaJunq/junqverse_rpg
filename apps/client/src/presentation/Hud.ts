import Phaser from 'phaser';
import {
  calculateHudLayout,
  cooldownSeconds,
  type CombatHudSnapshot,
  type CombatHudSlot,
  type HudLayout
} from './hud-model.js';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ratio(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    throw new RangeError('HUD resources must be finite and max > 0');
  }
  return clamp(value / max, 0, 1);
}

export class Hud {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly resourceText: Phaser.GameObjects.Text;
  private readonly slotTexts: Phaser.GameObjects.Text[] = [];
  private readonly dodgeText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly targetText: Phaser.GameObjects.Text;
  private layout: HudLayout;

  public constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    initial: CombatHudSnapshot
  ) {
    this.layout = calculateHudLayout(width, height);
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(1100);

    const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#f9fafb',
      fontFamily: 'system-ui, sans-serif'
    };

    this.resourceText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '12px'
    }).setScrollFactor(0).setDepth(1101);

    for (let i = 0; i < 4; i += 1) {
      this.slotTexts.push(
        scene.add.text(0, 0, '', {
          ...baseStyle,
          align: 'center',
          fontSize: '13px'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1101)
      );
    }

    this.dodgeText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '14px'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(1101);

    this.objectiveText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '14px',
      backgroundColor: '#111827cc',
      padding: { x: 10, y: 8 },
      wordWrap: { width: this.layout.objectiveWidth }
    }).setScrollFactor(0).setDepth(1101);

    this.targetText = scene.add.text(0, 0, '', {
      ...baseStyle,
      align: 'center',
      fontSize: '14px',
      backgroundColor: '#111827cc',
      padding: { x: 8, y: 5 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1101);

    this.render(initial);
  }

  public resize(width: number, height: number): void {
    this.layout = calculateHudLayout(width, height);
    this.objectiveText.setWordWrapWidth(this.layout.objectiveWidth);
  }

  public render(snapshot: CombatHudSnapshot): void {
    if (snapshot.slots.length !== 4) {
      throw new Error('HUD requires exactly four ability slots');
    }

    const l = this.layout;
    this.graphics.clear();

    this.drawBar(l.resourceX, l.resourceY, l.resourceWidth, 12,
      ratio(snapshot.health, snapshot.maxHealth), 0xef4444);
    this.drawBar(l.resourceX, l.resourceY + 18, l.resourceWidth, 12,
      ratio(snapshot.focus, snapshot.maxFocus), 0x3b82f6);
    this.drawBar(l.resourceX, l.resourceY + 36, l.resourceWidth, 12,
      ratio(snapshot.ultimateCharge, snapshot.maxUltimateCharge), 0xa855f7);

    this.resourceText
      .setPosition(l.resourceX, l.resourceY - 17)
      .setText(
        `VIDA ${Math.round(snapshot.health)}/${Math.round(snapshot.maxHealth)} • ` +
        `FOCO ${Math.round(snapshot.focus)} • ULT ${Math.round(snapshot.ultimateCharge)}%`
      );

    snapshot.slots.forEach((slot, index) => {
      const x = l.slotsStartX + index * (l.slotSize + l.slotGap);
      this.drawIcon(slot, x, l.slotsY, l.slotSize);
      const seconds = cooldownSeconds(slot.cooldownTicks);
      this.slotTexts[index]!
        .setPosition(x + l.slotSize / 2, l.slotsY + l.slotSize / 2)
        .setText(seconds > 0
          ? `${slot.label} [${slot.key}]\n${seconds.toFixed(1)}s`
          : `${slot.label} [${slot.key}]`);
    });

    this.dodgeText
      .setPosition(l.dodgeX, l.dodgeY)
      .setText(
        `ESQUIVA ${'●'.repeat(snapshot.dodgeCharges)}${'○'.repeat(
          Math.max(0, snapshot.maxDodgeCharges - snapshot.dodgeCharges)
        )}`
      );

    this.objectiveText
      .setPosition(l.objectiveX, l.objectiveY)
      .setText(snapshot.objective ? `OBJETIVO\n${snapshot.objective}` : '')
      .setVisible(Boolean(snapshot.objective));

    const target = snapshot.targetLabel;
    this.targetText
      .setPosition(l.telegraphX, l.telegraphY)
      .setText(target ?? '')
      .setVisible(Boolean(target));

    if (target && snapshot.telegraphProgress !== null) {
      const progress = clamp(snapshot.telegraphProgress, 0, 1);
      const width = Math.round(clamp(l.width * 0.18, 150, 260));
      this.graphics.fillStyle(0x111827, 0.92);
      this.graphics.fillRect(l.telegraphX - width / 2, l.telegraphY + 29, width, 8);
      this.graphics.fillStyle(0xf59e0b, 1);
      this.graphics.fillRect(
        l.telegraphX - width / 2,
        l.telegraphY + 29,
        width * progress,
        8
      );
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.resourceText.destroy();
    this.slotTexts.forEach((text) => text.destroy());
    this.dodgeText.destroy();
    this.objectiveText.destroy();
    this.targetText.destroy();
  }

  private drawBar(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    color: number
  ): void {
    this.graphics.fillStyle(0x0f172a, 0.92);
    this.graphics.fillRoundedRect(x, y, width, height, 4);
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRoundedRect(x, y, width * fill, height, 4);
    this.graphics.lineStyle(1, 0xe5e7eb, 0.55);
    this.graphics.strokeRoundedRect(x, y, width, height, 4);
  }

  private drawIcon(
    slot: CombatHudSlot,
    x: number,
    y: number,
    size: number
  ): void {
    const cooling = slot.cooldownTicks > 0;
    this.graphics.fillStyle(cooling ? 0x334155 : 0x1e3a8a, 0.95);
    this.graphics.lineStyle(2, 0xe5e7eb, 0.85);

    if (slot.id === 'q') {
      this.graphics.fillCircle(x + size / 2, y + size / 2, size * 0.44);
      this.graphics.strokeCircle(x + size / 2, y + size / 2, size * 0.44);
    } else if (slot.id === 'w') {
      this.graphics.fillRect(x + 3, y + 3, size - 6, size - 6);
      this.graphics.strokeRect(x + 3, y + 3, size - 6, size - 6);
    } else if (slot.id === 'e') {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const half = size * 0.43;
      this.graphics.fillTriangle(cx, cy - half, cx + half, cy + half, cx - half, cy + half);
      this.graphics.strokeTriangle(cx, cy - half, cx + half, cy + half, cx - half, cy + half);
    } else {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const half = size * 0.42;
      this.graphics.fillTriangle(cx, cy - half, cx + half, cy, cx, cy + half);
      this.graphics.fillTriangle(cx, cy - half, cx - half, cy, cx, cy + half);
    }
  }
}
