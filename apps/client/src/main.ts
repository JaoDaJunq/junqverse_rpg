import './ui/styles.css';
import Phaser from 'phaser';
import { ExpeditionScene } from './scenes/ExpeditionScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#111827',
  canvasStyle: 'image-rendering: pixelated;',
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  scene: [ExpeditionScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
