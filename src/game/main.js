import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import * as Phaser from 'phaser';
import { Preloader } from './scenes/Preloader';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#1c1a17',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false
        }
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Game,
        GameOver
    ]
};

const StartGame = (parent) => {

    return new Phaser.Game({ ...config, parent });

}

export default StartGame;
