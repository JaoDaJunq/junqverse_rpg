import './ui/styles.css';
import Phaser from 'phaser';
import { ExpeditionScene } from './scenes/ExpeditionScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1200,
  height: 675,
  backgroundColor: '#111827',
  pixelArt: false,
  antialias: true,
  antialiasGL: true,
  roundPixels: true,
  scene: [ExpeditionScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
