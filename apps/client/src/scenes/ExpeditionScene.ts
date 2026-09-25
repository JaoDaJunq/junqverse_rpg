import Phaser from 'phaser';
import {
  createHealthState,
  createPrototypeWorld,
  type Aabb
} from '@junqverse/sim';
import {
  LocalSession,
  type LocalSessionSnapshot
} from '../adapters/LocalSession.js';
import { InputMapper } from '../input/InputMapper.js';
import { WorldView } from '../presentation/WorldView.js';
import { CombatFxView } from '../presentation/CombatFxView.js';
import { Hud } from '../presentation/Hud.js';
import {
  createJaoHudSnapshot,
  createTestHudSnapshot
} from '../presentation/hud-model.js';
import { DefeatPanel } from '../ui/DefeatPanel.js';
import {
  LabPanel,
  loadLabLoadout,
  loadPrototypeHeroId,
  savePrototypeHeroId
} from '../ui/LabPanel.js';
import type {
  LabLoadout,
  PrototypeHeroId
} from '../ui/LabCatalog.js';

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

function technicalDefeatEnabled(): boolean {
  return (
    import.meta.env.DEV ||
    new URLSearchParams(window.location.search).get('debugDefeat') === '1'
  );
}

export class ExpeditionScene extends Phaser.Scene {
  private mapper: InputMapper | null = null;
  private session: LocalSession | null = null;
  private view: WorldView | null = null;
  private fx: CombatFxView | null = null;
  private hud: Hud | null = null;
  private labPanel: LabPanel | null = null;
  private heroId: PrototypeHeroId = 'jao';
  private labLoadout: LabLoadout = loadLabLoadout();
  private detachInput: (() => void) | null = null;
  private pauseLabel: Phaser.GameObjects.Text | null = null;
  private defeatPanel: DefeatPanel | null = null;
  private defeatTestEnabled = false;
  private cleanedUp = false;

  public constructor() {
    super('expedition');
  }

  public preload(): void {
    this.load.spritesheet(
      'pixel-floor',
      'assets/pixel-crawler/Floors_Tiles.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet(
      'pixel-wall',
      'assets/pixel-crawler/Wall_Tiles.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet(
      'pixel-dungeon-props',
      'assets/pixel-crawler/Dungeon_Props.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet(
      'pixel-esoteric',
      'assets/pixel-crawler/Esoteric.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet(
      'pixel-rocks',
      'assets/pixel-crawler/Rocks.png',
      { frameWidth: 16, frameHeight: 16 }
    );

    this.load.spritesheet(
      'jao-actions-sheet',
      'assets/jao/jao_actions_atlas.webp',
      { frameWidth: 88, frameHeight: 64 }
    );
    this.load.spritesheet(
      'eco-skeleton-idle-sheet',
      'assets/pixel-crawler/enemy_skeleton_idle.png',
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      'test-rogue-idle-sheet',
      'assets/pixel-crawler/test_rogue_idle.png',
      { frameWidth: 32, frameHeight: 32 }
    );

    this.load.image('vfx-slash', 'assets/vfx/slash_02_a.png');
    this.load.image('vfx-magic', 'assets/vfx/magic_01_a.png');
    this.load.image('vfx-spark', 'assets/vfx/spark_03_a.png');
    this.load.image('vfx-circle', 'assets/vfx/circle_03_a.png');
    this.load.image('vfx-impact', 'assets/vfx/effect_02_a.png');
  }

  public create(): void {
    this.cleanedUp = false;
    this.defeatTestEnabled = technicalDefeatEnabled();
    this.heroId = loadPrototypeHeroId();
    this.labLoadout = loadLabLoadout();

    const mapper = new InputMapper();
    const world = createPrototypeWorld(
      'prototype_room',
      20260923,
      { x: 160, y: 160 },
      TEST_BLOCKERS,
      {
        radius: 12,
        speedPxPerSecond: 180,
        enemySpawns: [{
          archetype: 'eco_rasteiro',
          position: { x: 360, y: 240 }
        }]
      }
    );
    const session = new LocalSession(world, mapper, {
      initialUltimateCharge: 100,
      enemyAiEnabled: true,
      enemyAttacksEnabled: true
    });
    const initial = session.getSnapshot();
    const view = new WorldView(
      this,
      initial,
      {
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT
      },
      this.heroId
    );

    this.mapper = mapper;
    this.session = session;
    this.view = view;
    this.fx = new CombatFxView(
      this,
      initial,
      view.player,
      this.heroId,
      this.labLoadout
    );

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.startFollow(view.player, true, 0.12, 0.12);
    camera.setDeadzone(120, 80);
    camera.roundPixels = true;

    const debugHint = this.defeatTestEnabled
      ? '\nK testar derrota'
      : '';

    const controlHint = this.heroId === 'test'
      ? 'LAB TESTE • Mouse Corte • 1 Dash • 2 Nova • 3 Corte Energético • R Sobrecarga'
      : 'WASD mover • Mouse ataque básico • 1 Passo Relâmpago • 2 Dedução • 3 Corte da Aurora • R Campo Absoluto';

    this.add.text(
      16,
      16,
      `JUNQVERSE • Gate P0 T017\n${controlHint} • Espaço esquiva • Esc pausar${debugHint}`,
      {
        color: '#f9fafb',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        backgroundColor: '#111827cc',
        padding: { x: 10, y: 8 }
      }
    ).setScrollFactor(0).setDepth(1000);

    this.hud = new Hud(
      this,
      this.scale.gameSize.width,
      this.scale.gameSize.height,
      this.createHudSnapshot(initial)
    );

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
      .setDepth(1200)
      .setVisible(false);

    const app = document.getElementById('app');
    if (!app) {
      throw new Error('app root is required for defeat UI');
    }

    this.labPanel = new LabPanel(app, {
      heroId: this.heroId,
      loadout: this.labLoadout,
      onHeroChange: (heroId) => {
        savePrototypeHeroId(heroId);
        this.scene.restart();
      },
      onLoadoutChange: (loadout) => {
        this.labLoadout = loadout;
        this.fx?.setLabLoadout(loadout);
      },
      onPreview: (_slot, effectId) => {
        this.fx?.previewEffect(effectId);
      }
    });

    this.defeatPanel = new DefeatPanel(app, {
      onTryAgain: this.onTryAgain,
      onReturn: this.onReturn
    });

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

    if (this.defeatTestEnabled) {
      this.input.keyboard?.on('keydown-K', this.onDebugDefeat, this);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  public update(_time: number, delta: number): void {
    if (!this.session || !this.view) {
      return;
    }

    const snapshot = this.session.advance(delta);
    this.view.render(snapshot);
    this.view.setUltimateActive(snapshot.combat.ultimateActive);
    this.fx?.render(snapshot);
    this.hud?.render(this.createHudSnapshot(snapshot));

    if (
      !snapshot.player.alive &&
      !this.defeatPanel?.isVisible()
    ) {
      this.pauseLabel?.setVisible(false);
      this.defeatPanel?.show();
    }
  }

  private createHudSnapshot(snapshot: LocalSessionSnapshot) {
    if (!this.mapper) {
      throw new Error('input mapper is required for HUD snapshot');
    }

    const createSnapshot = this.heroId === 'test'
      ? createTestHudSnapshot
      : createJaoHudSnapshot;

    return createSnapshot({
      health: createHealthState(
        snapshot.player.maxHealth,
        0,
        snapshot.player.health
      ),
      resources: snapshot.combat.resources,
      ultimate: snapshot.combat.ultimate,
      bindings: this.mapper.getBindings()
    });
  }

  private readonly onWindowBlur = (): void => {
    this.session?.setPaused(true);
    if (!this.defeatPanel?.isVisible()) {
      this.pauseLabel?.setVisible(true);
    }
  };

  private onEscape(): void {
    if (!this.session || this.defeatPanel?.isVisible()) {
      return;
    }

    const paused = !this.session.isPaused();
    this.session.setPaused(paused);
    this.pauseLabel?.setVisible(paused);
  }

  private onDebugDefeat(): void {
    if (!this.session || !this.defeatPanel) {
      return;
    }

    this.session.setPaused(true);
    this.pauseLabel?.setVisible(false);
    this.defeatPanel.show();
  }

  private readonly onTryAgain = (): void => {
    if (!this.session || !this.view) {
      return;
    }

    const snapshot = this.session.restart();
    this.view.render(snapshot);
    this.view.setUltimateActive(snapshot.combat.ultimateActive);
    this.fx?.destroy();
    this.fx = new CombatFxView(
      this,
      snapshot,
      this.view.player,
      this.heroId,
      this.labLoadout
    );
    this.fx.render(snapshot);
    this.hud?.render(this.createHudSnapshot(snapshot));
    this.cameras.main.centerOn(
      snapshot.player.position.x,
      snapshot.player.position.y
    );
    this.pauseLabel?.setVisible(false);
    this.defeatPanel?.hide();
  };

  private readonly onReturn = (): void => {
    this.defeatPanel?.hide();
    this.scene.restart();
  };

  private cleanup(): void {
    if (this.cleanedUp) {
      return;
    }

    this.cleanedUp = true;
    window.removeEventListener('blur', this.onWindowBlur);
    this.input.keyboard?.off('keydown-ESC', this.onEscape, this);
    this.input.keyboard?.off('keydown-K', this.onDebugDefeat, this);
    this.detachInput?.();
    this.detachInput = null;
    this.session?.stop();
    this.session = null;
    this.mapper = null;
    this.view?.destroy();
    this.view = null;
    this.fx?.destroy();
    this.fx = null;
    this.hud?.destroy();
    this.hud = null;
    this.labPanel?.destroy();
    this.labPanel = null;
    this.pauseLabel = null;
    this.defeatPanel?.destroy();
    this.defeatPanel = null;
  }
}
