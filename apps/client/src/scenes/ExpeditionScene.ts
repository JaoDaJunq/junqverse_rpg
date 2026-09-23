import Phaser from 'phaser';
import { createPrototypeWorld, type Aabb } from '@junqverse/sim';
import { LocalSession } from '../adapters/LocalSession.js';
import { InputMapper } from '../input/InputMapper.js';
import { WorldView } from '../presentation/WorldView.js';

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 720;

const TEST_BLOCKERS: readonly Aabb[] = [
  { x: 0, y: 0, width: WORLD_WIDTH, height: 32 },
  { x: 0, y: WORLD_HEIGHT - 32, width: WORLD_WIDTH, height: 32 },
  { x: 0, y: 0, width: 32, height: WORLD_HEIGHT },
  { x: WORLD_WIDTH - 32, y: 0, width: 32, height: WORLD_HEIGHT },
  { x: 560, y: 128, width: 32, height: 360 },
  { x: 760, y: 360, width: 260, height: 32 },
  { x: 320, y: 520, width: 320, height: 32 }
];

export class ExpeditionScene extends Phaser.Scene {
  private mapper: InputMapper | null = null;
  private session: LocalSession | null = null;
  private view: WorldView | null = null;
  private detachInput: (() => void) | null = null;
  private pauseLabel: Phaser.GameObjects.Text | null = null;
  private cleanedUp = false;

  public constructor() {
    super('expedition');
  }

  public create(): void {
    this.cleanedUp = false;

    const mapper = new InputMapper();
    const world = createPrototypeWorld(
      'prototype_room',
      20260923,
      { x: 160, y: 160 },
      TEST_BLOCKERS,
      { radius: 12, speedPxPerSecond: 180 }
    );
    const session = new LocalSession(world, mapper);
    const initial = session.getSnapshot();
    const view = new WorldView(this, initial, {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT
    });

    this.mapper = mapper;
    this.session = session;
    this.view = view;

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.startFollow(view.player, true, 0.12, 0.12);
    camera.setDeadzone(120, 80);

    this.add.text(
      16,
      16,
      'JUNQVERSE • Sala técnica T007\nWASD mover • Esc pausar',
      {
        color: '#f9fafb',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        backgroundColor: '#111827cc',
        padding: { x: 10, y: 8 }
      }
    ).setScrollFactor(0).setDepth(1000);

    this.pauseLabel = this.add.text(
      480,
      270,
      'PAUSADO\nEsc para continuar',
      {
        align: 'center',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        backgroundColor: '#111827dd',
        padding: { x: 18, y: 14 }
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    const canvas = this.game.canvas;
    this.detachInput = mapper.attachDom({
      keyboardTarget: window,
      pointerTarget: canvas,
      screenToWorld: (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        const gameX = (clientX - rect.left) * (canvas.width / rect.width);
        const gameY = (clientY - rect.top) * (canvas.height / rect.height);
        return camera.getWorldPoint(gameX, gameY);
      },
      isPointerOverUi: (event) => event.target !== canvas
    });

    window.addEventListener('blur', this.onWindowBlur);
    this.input.keyboard?.on('keydown-ESC', this.onEscape, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  public update(_time: number, delta: number): void {
    if (!this.session || !this.view) {
      return;
    }

    const snapshot = this.session.advance(delta);
    this.view.render(snapshot);
  }

  private readonly onWindowBlur = (): void => {
    this.session?.setPaused(true);
    this.pauseLabel?.setVisible(true);
  };

  private onEscape(): void {
    if (!this.session) {
      return;
    }

    const paused = !this.session.isPaused();
    this.session.setPaused(paused);
    this.pauseLabel?.setVisible(paused);
  }

  private cleanup(): void {
    if (this.cleanedUp) {
      return;
    }

    this.cleanedUp = true;
    window.removeEventListener('blur', this.onWindowBlur);
    this.input.keyboard?.off('keydown-ESC', this.onEscape, this);
    this.detachInput?.();
    this.detachInput = null;
    this.session?.stop();
    this.session = null;
    this.mapper = null;
    this.view?.destroy();
    this.view = null;
    this.pauseLabel = null;
  }
}
