import './ui/styles.css';
import Phaser from 'phaser';
import { ExpeditionScene } from './scenes/ExpeditionScene.js';
import { prepareJaoMovementAtlas } from './assets/jaoMovementAtlas.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1200,
  height: 675,
  backgroundColor: '#111827',
  pixelArt: false,
  antialias: true,
  antialiasGL: true,
  roundPixels: false,
  scene: [ExpeditionScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

async function bootstrap(): Promise<void> {
  await prepareJaoMovementAtlas();
  new Phaser.Game(config);
}

void bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar JUNQVERSE:', error);
});
