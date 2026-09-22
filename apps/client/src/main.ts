import Phaser from 'phaser';

class BootScene extends Phaser.Scene {
  public constructor() {
    super('boot');
  }

  public create(): void {
    this.add.text(32, 32, 'JUNQVERSE: infraestrutura pronta', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px'
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#111827',
  scene: [BootScene]
};

new Phaser.Game(config);
