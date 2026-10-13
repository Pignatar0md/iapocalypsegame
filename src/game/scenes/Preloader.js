import { Scene } from 'phaser';
import { getSelectedHero } from '../selectedHero';
import { ASSET_INDEX_KEY, ASSET_INDEX_URL, getBackgroundLayers, getCharacter } from '../stage';
import { FOOD_CELL, FOOD_COLUMNS, FOOD_ROWS } from '../waves';

const VILLAIN_IDS = [ 'vilain', 'vilain2', 'vilain3f', 'vilain3m' ];

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        this.add.image(960, 540, 'background').setDisplaySize(1920, 1080);

        this.add.rectangle(960, 540, 468, 32).setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(960 - 230, 540, 4, 28, 0xffffff);

        this.load.on('progress', (progress) => {

            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        this.load.image('logo', 'assets/logo.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('food', 'assets/purchased_assets/sprites/Food.png');
        this.load.json(ASSET_INDEX_KEY, ASSET_INDEX_URL);

        this.load.on(`filecomplete-json-${ASSET_INDEX_KEY}`, (key, type, data) => {

            for (const layer of getBackgroundLayers(data))
            {
                this.load.image(layer.key, layer.path);
            }

            const chosen = getCharacter(data, getSelectedHero()) || getCharacter(data, 'lauti');

            this.heroId = chosen.id;
            this.load.image(chosen.id, chosen.path);

            for (const id of VILLAIN_IDS)
            {
                const vilain = getCharacter(data, id);
                this.load.image(vilain.id, vilain.path);
            }

        });
    }

    create ()
    {
        const index = this.cache.json.get(ASSET_INDEX_KEY);
        const hero = getCharacter(index, this.heroId) || getCharacter(index, 'lauti');

        this.registerCharacter(hero);

        for (const id of VILLAIN_IDS)
        {
            this.registerCharacter(getCharacter(index, id));
        }
        this.sliceFood();
        this.scene.start('Game');
    }

    sliceFood ()
    {
        const texture = this.textures.get('food');
        let index = 0;

        for (let row = 0; row < FOOD_ROWS; row++)
        {
            for (let column = 0; column < FOOD_COLUMNS; column++)
            {
                const name = `food-${index}`;

                if (!texture.has(name))
                {
                    texture.add(name, 0, column * FOOD_CELL, row * FOOD_CELL, FOOD_CELL, FOOD_CELL);
                }

                index += 1;
            }
        }
    }

    registerCharacter (character)
    {
        this.clearCheckerboard(character.id);

        const texture = this.textures.get(character.id);

        for (const frame of character.frames)
        {
            if (!texture.has(frame.name))
            {
                texture.add(frame.name, 0, frame.x, frame.y, frame.w, frame.h);
            }
        }

        for (const anim of character.animations)
        {
            if (!this.anims.exists(anim.key))
            {
                this.anims.create({
                    key: anim.key,
                    frames: anim.frames.map((name) => ({ key: character.id, frame: name })),
                    frameRate: anim.frameRate,
                    repeat: anim.repeat
                });
            }
        }
    }

    clearCheckerboard (key)
    {
        const source = this.textures.get(key).getSourceImage();
        const canvas = this.textures.createCanvas(key + '-clean', source.width, source.height);
        const ctx = canvas.getContext();

        ctx.drawImage(source, 0, 0);

        const image = ctx.getImageData(0, 0, source.width, source.height);
        const data = image.data;

        for (let i = 0; i < data.length; i += 4)
        {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            const lum = (r + g + b) / 3;

            if (chroma <= 18 && lum >= 175)
            {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(image, 0, 0);
        canvas.refresh();

        this.textures.remove(key);
        this.textures.addCanvas(key, canvas.canvas);
        this.textures.remove(key + '-clean');
    }
}
