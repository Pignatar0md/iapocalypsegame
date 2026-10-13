import { EventBus } from '../EventBus';
import { Input, Math as PhaserMath, Scene } from 'phaser';
import { BACKGROUND_LAYER_KEYS, GROUND_Y, PARALLAX_FACTORS, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH, ASSET_INDEX_KEY } from '../stage';
import { getSelectedHero } from '../selectedHero';
import { stopMenuMusic } from '../menuMusic';
import { FOOD_CELL, FOOD_COLUMNS, FOOD_HEAL, FOOD_ROWS, SPAWN_INTERVAL_MAX, SPAWN_INTERVAL_MIN, SPAWN_MARGIN, VILLAIN_POOL_SIZE, WAVES, enemiesForPlayer, waveHasFood } from '../waves';

const MOVE_SPEED = 280;
// Ride in from off the left edge, then dismount at the middle of the screen.
const RIDE_SPEED = 400;
const ARRIVE_FROM_X = -140;
// Apex is about 270px. That clears food and the short villains (about 220px)
// and still meets the tango dancer, who stands about 320px.
const JUMP_VELOCITY = -805;
const VILAIN_SPEED = 200;
// Close the gap in short bursts, then hold still before the next step.
const VILAIN_STRIDE_MIN = 420;
const VILAIN_STRIDE_MAX = 780;
const VILAIN_PAUSE_MIN = 450;
const VILAIN_PAUSE_MAX = 900;
const BODY_WIDTH = 70;
const BODY_HEIGHT = 230;
const VILAIN_BODY_WIDTH = 56;
const VILAIN_BODY_HEIGHT = 180;
const CAMERA_LIMIT = 10000000;
const PLAYER_REACH = 180;
const VILAIN_REACH = 150;
const VILAIN_HITS_TO_FALL = 3;
const HEALTH_MAX = 100;
const VILAIN_DAMAGE = 10;
const FOOD_SCALE = 4;
const FOOD_REACH = 70;
const FOOD_HEIGHT = FOOD_CELL * FOOD_SCALE;

// Standing height. Feet have to rise past this to pass over the actor.
const ACTOR_HEIGHT = {
    vilain: 220,
    vilain2: 220,
    vilain3f: 220,
    vilain3m: 320
};

// The street starts scrolling once the player reaches 80% of the screen.
// A fight keeps the camera still, but the body can still travel to the 95% edge.
const SCREEN_LEFT = WORLD_WIDTH * 0.05;
const SCREEN_SCROLL = WORLD_WIDTH * 0.80;
const SCREEN_RIGHT = WORLD_WIDTH * 0.95;

// Horizontal foot position inside each frame, so the stride does not lurch.
const FOOT_X = {
    'walk-0': 52,
    'walk-1': 51,
    'walk-2': 48,
    'walk-3': 51,
    'walk-4': 50,
    'walk-5': 50,
    'walk-6': 53,
    'walk-7': 52,
    'walk-8': 52,
    'hurt-0': 51,
    'hurt-1': 61,
    'hurt-2': 67,
    'hurt-3': 57,
    'hurt-4': 70,
    'hurt-5': 75,
    'hurt-6': 91,
    'hurt-7': 93,
    'attack-0': 55,
    'attack-1': 58,
    'attack-2': 73,
    'attack-3': 53,
    'attack-4': 64,
    'attack-5': 79,
    'block-0': 81,
    'jump-0': 50,
    'jump-1': 41,
    'jump-2': 19,
    'jump-3': 30,
    'jump-4': 63,
    'jump-5': 44,
    'ride-0': 116,
    'ride-1': 110,
    'ride-2': 110,
    'ride-3': 109,
    'ride-4': 110
};

const VILAIN_FOOT_X = {
    'walk-0': 56,
    'walk-1': 55,
    'walk-2': 55,
    'walk-3': 69,
    'walk-4': 53,
    'walk-5': 54,
    'walk-6': 58,
    'walk-7': 56,
    'attack-0': 74,
    'attack-1': 69,
    'attack-2': 99,
    'attack-3': 80,
    'attack-4': 102,
    'attack-5': 98,
    'death-0': 105,
    'death-1': 78,
    'death-2': 88,
    'death-3': 82,
    'death-4': 87,
    'death-5': 91
};

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, WORLD_HEIGHT, false, false, false, false);

        this.layers = BACKGROUND_LAYER_KEYS.map((key, depth) => {

            return this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, key)
                .setOrigin(0, 0)
                .setScrollFactor(0)
                .setDepth(depth);

        });

        const ground = this.createGround();

        this.villainFeet = this.buildVillainFeet();
        this.playerId = this.textures.exists(getSelectedHero()) ? getSelectedHero() : 'lauti';
        this.entrance = this.anims.exists(this.playerKey('ride'))
            ? 'ride'
            : (this.anims.exists(this.playerKey('drive')) ? 'drive' : null);
        this.arriving = true;
        this.player = this.physics.add.sprite(ARRIVE_FROM_X, GROUND_Y, this.playerId, this.entrance ? `${this.entrance}-0` : 'walk-0');
        this.player.setOrigin(0.5, 1);
        this.player.setDepth(BACKGROUND_LAYER_KEYS.length + 1);
        this.player.setFlipX(false);
        this.player.play(this.playerKey(this.entrance || 'idle'));
        this.alignActor(this.player, this.playerFeet(), BODY_WIDTH, BODY_HEIGHT);
        stopMenuMusic();

        this.health = HEALTH_MAX;
        this.playerDown = false;
        this.playerSwingHit = false;
        this.playerAttackAt = 0;

        this.villains = this.physics.add.group({
            defaultKey: 'vilain',
            defaultFrame: 'walk-0',
            maxSize: VILLAIN_POOL_SIZE,
            runChildUpdate: false
        });
        this.physics.add.collider(this.villains, ground);

        this.screenLocked = false;
        this.waveIndex = 0;
        this.queue = [];
        this.spawnEvent = null;
        this.foods = [];

        this.cameras.main.setBounds(0, 0, CAMERA_LIMIT, WORLD_HEIGHT);
        this.cameras.main.setRoundPixels(true);
        this.events.on('postupdate', this.alignCameraToPlayer, this);
        this.scrollCamera();

        this.physics.add.collider(this.player, ground);
        this.createHealthBar();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('A,D,S');
        this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');

        EventBus.emit('current-scene-ready', this);
    }

    createHealthBar ()
    {
        this.healthGraphics = this.add.graphics().setScrollFactor(0).setDepth(100);
        this.healthLabel = this.add.text(36, 22, '', {
            fontFamily: 'Arial',
            fontSize: 22,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(101);
        this.drawHealth();
    }

    drawHealth ()
    {
        const x = 36;
        const y = 52;
        const width = 320;
        const height = 22;
        const graphics = this.healthGraphics;

        graphics.clear();
        graphics.fillStyle(0x1a120c, 1);
        graphics.fillRect(x, y, width, height);
        graphics.fillStyle(0xb42318, 1);
        graphics.fillRect(x + 3, y + 3, (width - 6) * (this.health / HEALTH_MAX), height - 6);
        this.healthLabel.setText(`Vida ${this.health}%`);
    }

    spawnVillain (x, texture)
    {
        const sprite = this.villains.get(x, GROUND_Y, texture, 'walk-0');

        if (!sprite)
        {
            return null;
        }

        sprite.setActive(true);
        sprite.setVisible(true);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(BACKGROUND_LAYER_KEYS.length + 1);
        sprite.body.enable = true;
        sprite.body.setAllowGravity(true);
        sprite.body.reset(x, GROUND_Y);
        sprite.hits = 0;
        sprite.down = false;
        sprite.swingHit = false;
        sprite.attackAt = 0;
        sprite.nextAttack = 0;
        sprite.striding = true;
        sprite.strideUntil = this.time.now + PhaserMath.Between(VILAIN_STRIDE_MIN, VILAIN_STRIDE_MAX);
        sprite.alignedFrame = null;
        sprite.clearTint();
        sprite.off(`animationcomplete-${texture}-death`);
        sprite.play(`${texture}-walk`);
        this.alignActor(sprite, this.feetFor(sprite), VILAIN_BODY_WIDTH, VILAIN_BODY_HEIGHT);
        this.faceToward(sprite, this.player.x, this.nativeFacesRight(sprite));

        return sprite;
    }

    releaseVillain (sprite)
    {
        if (!sprite.active)
        {
            return;
        }

        sprite.setVelocity(0, 0);
        sprite.body.setAllowGravity(false);
        sprite.body.enable = false;
        sprite.clearTint();
        this.villains.killAndHide(sprite);
    }

    spawnFromQueue ()
    {
        if (this.queue.length === 0)
        {
            return;
        }

        const next = this.queue[0];
        const camera = this.cameras.main;
        const x = next.side === 'left'
            ? camera.scrollX - SPAWN_MARGIN
            : camera.scrollX + WORLD_WIDTH + SPAWN_MARGIN;
        const sprite = this.spawnVillain(x, next.texture);

        if (!sprite)
        {
            return;
        }

        this.queue.shift();
    }

    scheduleNext ()
    {
        const delay = PhaserMath.Between(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);

        this.spawnEvent = this.time.delayedCall(delay, () =>
        {
            this.spawnEvent = null;
            this.spawnFromQueue();

            if (this.queue.length > 0)
            {
                this.scheduleNext();
            }
        });
    }

    startWave (wave)
    {
        this.queue = enemiesForPlayer(wave.enemies, this.playerId).slice();
        this.spawnFromQueue();

        if (waveHasFood(this.waveIndex))
        {
            this.spawnFood();
        }

        if (this.queue.length > 0)
        {
            this.scheduleNext();
        }
    }

    spawnFood ()
    {
        const camera = this.cameras.main;
        const minX = Math.round(camera.scrollX + SCREEN_LEFT + 140);
        const maxX = Math.round(camera.scrollX + SCREEN_RIGHT - 140);
        let x = PhaserMath.Between(minX, maxX);

        if (Math.abs(x - this.player.x) < 200)
        {
            x += x >= this.player.x ? 240 : -240;
            x = PhaserMath.Clamp(x, minX, maxX);
        }

        const frame = `food-${PhaserMath.Between(0, (FOOD_COLUMNS * FOOD_ROWS) - 1)}`;
        const sprite = this.add.sprite(x, GROUND_Y, 'food', frame);

        sprite.setOrigin(0.5, 1);
        sprite.setScale(FOOD_SCALE);
        sprite.setDepth(BACKGROUND_LAYER_KEYS.length + 1);
        this.foods.push(sprite);
    }

    collectFood (sprite)
    {
        const index = this.foods.indexOf(sprite);

        if (index >= 0)
        {
            this.foods.splice(index, 1);
        }

        sprite.destroy();
        this.health = Math.min(HEALTH_MAX, this.health + Math.round(HEALTH_MAX * FOOD_HEAL));
        this.drawHealth();
        this.player.setTint(0x88ff88);
        this.time.delayedCall(120, () =>
        {
            if (!this.playerDown)
            {
                this.player.clearTint();
            }
        });
    }

    updateFood ()
    {
        if (this.playerDown)
        {
            return;
        }

        for (let i = this.foods.length - 1; i >= 0; i--)
        {
            const sprite = this.foods[i];

            const overFood = this.clearsHeight(FOOD_HEIGHT);

            if (!overFood && Math.abs(this.player.x - sprite.x) <= FOOD_REACH)
            {
                this.collectFood(sprite);
            }
        }
    }

    hasLivingVillains ()
    {
        const children = this.villains.getChildren();

        for (let i = 0; i < children.length; i++)
        {
            const sprite = children[i];

            if (sprite.active && !sprite.down)
            {
                return true;
            }
        }

        return false;
    }

    checkWaveClear ()
    {
        if (this.queue.length > 0 || this.spawnEvent || this.hasLivingVillains())
        {
            return;
        }

        this.screenLocked = false;
        this.waveIndex += 1;
    }

    updateWaves ()
    {
        if (this.screenLocked)
        {
            this.checkWaveClear();
            return;
        }

        const wave = WAVES[this.waveIndex];

        if (!wave)
        {
            return;
        }

        const camera = this.cameras.main;
        const nextScroll = Math.max(camera.scrollX, this.player.x - SCREEN_SCROLL);

        if (nextScroll >= wave.triggerX)
        {
            camera.setScroll(wave.triggerX, 0);
            this.screenLocked = true;
            this.startWave(wave);
        }
    }

    createGround ()
    {
        const graphics = this.make.graphics({ add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        graphics.generateTexture('ground-tile', TILE_SIZE, TILE_SIZE);
        graphics.destroy();

        const columns = (WORLD_WIDTH / TILE_SIZE) * 3;
        this.groundWidth = columns * TILE_SIZE;
        const map = this.make.tilemap({
            tileWidth: TILE_SIZE,
            tileHeight: TILE_SIZE,
            width: columns,
            height: 1
        });
        const tileset = map.addTilesetImage('ground', 'ground-tile', TILE_SIZE, TILE_SIZE, 0, 0, 1);
        const layer = map.createBlankLayer('ground', tileset, 0, GROUND_Y, columns, 1, TILE_SIZE, TILE_SIZE);

        layer.fill(1);
        layer.setCollision(1);
        layer.setAlpha(0);
        layer.setDepth(BACKGROUND_LAYER_KEYS.length);
        this.groundLayer = layer;

        return layer;
    }

    scrollCamera ()
    {
        const camera = this.cameras.main;

        if (!this.screenLocked)
        {
            const lead = this.player.x - SCREEN_SCROLL;

            if (lead > camera.scrollX)
            {
                camera.setScroll(lead, 0);
            }
        }

        const minX = camera.scrollX + SCREEN_LEFT;
        const maxX = camera.scrollX + SCREEN_RIGHT;

        if (!this.arriving && this.player.x < minX)
        {
            this.player.x = minX;
            this.player.setVelocityX(0);
        }

        if (this.screenLocked && this.player.x > maxX)
        {
            this.player.x = maxX;
            this.player.setVelocityX(0);
        }

        const scrollX = camera.scrollX;

        this.layers.forEach((layer, index) => {

            layer.tilePositionX = Math.round(scrollX * PARALLAX_FACTORS[index]);

        });

        this.groundLayer.x = this.player.x - (this.groundWidth / 2);
    }

    // WebGL does not snap ordinary sprites to pixels. A fractional camera
    // against a moving sprite shimmers. Match the scroll fraction to the
    // player after physics, so his on-screen position stays a whole pixel.
    alignCameraToPlayer ()
    {
        this.keepOutOfActors();

        const camera = this.cameras.main;
        let scrollX = camera.scrollX;

        if (!this.screenLocked)
        {
            const lead = this.player.x - SCREEN_SCROLL;

            if (lead > scrollX)
            {
                scrollX = lead;
            }
        }

        const screenX = Math.round(this.player.x - scrollX);

        scrollX = this.player.x - screenX;
        camera.setScroll(scrollX, 0);

        this.layers.forEach((layer, index) => {

            layer.tilePositionX = Math.round(scrollX * PARALLAX_FACTORS[index]);

        });
    }

    actorHeight (sprite)
    {
        return ACTOR_HEIGHT[sprite.texture.key] ?? VILAIN_BODY_HEIGHT;
    }

    clearsHeight (height)
    {
        return this.player.y <= GROUND_Y - height;
    }

    shiftPlayer (deltaX)
    {
        const body = this.player.body;

        this.player.x += deltaX;
        body.position.x += deltaX;
        body.prev.x += deltaX;

        if (body.prevFrame)
        {
            body.prevFrame.x += deltaX;
        }

        if (body.autoFrame)
        {
            body.autoFrame.x += deltaX;
        }
    }

    keepOutOfActors ()
    {
        if (this.playerDown)
        {
            return;
        }

        const half = (BODY_WIDTH + VILAIN_BODY_WIDTH) / 2;
        const children = this.villains.getChildren();

        for (let i = 0; i < children.length; i++)
        {
            const sprite = children[i];

            if (!sprite.active || sprite.down || this.clearsHeight(this.actorHeight(sprite)))
            {
                continue;
            }

            const dx = this.player.x - sprite.x;
            const distance = Math.abs(dx);

            if (distance >= half)
            {
                continue;
            }

            const push = dx >= 0 ? half - dx : -(half + dx);

            this.shiftPlayer(push);
            this.player.setVelocityX(0);
        }
    }

    nativeFacesRight (sprite)
    {
        const key = sprite.texture.key;

        return key === 'vilain3f' || key === 'vilain3m';
    }

    buildVillainFeet ()
    {
        const index = this.cache.json.get(ASSET_INDEX_KEY);
        const feet = {};

        for (const character of index.characters)
        {
            const frames = {};

            for (const frame of character.frames)
            {
                if (frame.foot != null)
                {
                    frames[frame.name] = frame.foot;
                }
            }

            if (Object.keys(frames).length > 0)
            {
                feet[character.id] = frames;
            }
        }

        return feet;
    }

    feetFor (sprite)
    {
        return this.villainFeet[sprite.texture.key] || VILAIN_FOOT_X;
    }

    playerFeet ()
    {
        return this.villainFeet[this.playerId] || FOOT_X;
    }

    alignActor (sprite, feet, bodyWidth, bodyHeight)
    {
        const frame = sprite.frame;

        if (sprite.alignedFrame === frame.name)
        {
            return;
        }

        const foot = feet[frame.name] ?? Math.round(frame.width / 2);
        const height = Math.min(bodyHeight, frame.height);

        sprite.setOrigin(foot / frame.width, 1);
        sprite.body.setSize(bodyWidth, height, false);
        sprite.body.setOffset(foot - (bodyWidth / 2), frame.height - height);
        sprite.alignedFrame = frame.name;
    }

    faceToward (sprite, targetX, defaultFacesRight)
    {
        const towardLeft = targetX < sprite.x;

        sprite.setFlipX(defaultFacesRight ? towardLeft : !towardLeft);
    }

    isPlaying (sprite, key)
    {
        const anim = sprite.anims;

        return anim.currentAnim !== null && anim.currentAnim.key === key && anim.isPlaying;
    }

    playerKey (action)
    {
        return `${this.playerId}-${action}`;
    }

    isPlayerSwinging ()
    {
        return this.isPlaying(this.player, this.playerKey('attack')) || this.isPlaying(this.player, this.playerKey('jump-attack'));
    }

    isVillainSwinging (sprite)
    {
        return this.isPlaying(sprite, `${sprite.texture.key}-attack`);
    }

    villainSwingBlocksPlayer ()
    {
        const reach = Math.max(PLAYER_REACH, VILAIN_REACH);
        const children = this.villains.getChildren();

        for (let i = 0; i < children.length; i++)
        {
            const sprite = children[i];

            if (!sprite.active || sprite.down || !this.isVillainSwinging(sprite))
            {
                continue;
            }

            if (Math.abs(sprite.x - this.player.x) <= reach)
            {
                return true;
            }
        }

        return false;
    }

    beginPlayerAttack (action)
    {
        const key = this.playerKey(action);

        if (!this.anims.exists(key))
        {
            return;
        }

        this.playerAttackAt = this.time.now;
        this.player.setVelocityX(0);
        this.player.play(key);
    }

    isInFront (attacker, target, reach, defaultFacesRight)
    {
        const dx = target.x - attacker.x;
        const facingLeft = defaultFacesRight ? attacker.flipX : !attacker.flipX;

        if (facingLeft)
        {
            return dx < 0 && -dx <= reach;
        }

        return dx > 0 && dx <= reach;
    }

    isGuarding ()
    {
        return this.keys.S.isDown && !this.playerDown && !this.isPlayerSwinging();
    }

    damagePlayer ()
    {
        if (this.playerDown || this.isGuarding())
        {
            return;
        }

        this.health = Math.max(0, this.health - VILAIN_DAMAGE);
        this.drawHealth();
        this.player.setTint(0xff8888);
        this.time.delayedCall(120, () => this.player.clearTint());

        if (this.health === 0)
        {
            this.playerDown = true;
            this.player.setVelocityX(0);
            this.player.play(this.playerKey('death'));
            return;
        }

        if (!this.isPlaying(this.player, this.playerKey('attack')) && !this.isPlaying(this.player, this.playerKey('jump-attack')))
        {
            this.player.setVelocityX(0);
            this.player.play(this.playerKey('hurt'));
        }
    }

    hitVillain ()
    {
        let target = null;
        let closest = PLAYER_REACH;
        const children = this.villains.getChildren();

        for (let i = 0; i < children.length; i++)
        {
            const sprite = children[i];

            if (!sprite.active || sprite.down || this.clearsHeight(this.actorHeight(sprite)) || !this.isInFront(this.player, sprite, PLAYER_REACH, true))
            {
                continue;
            }

            const distance = Math.abs(sprite.x - this.player.x);

            if (distance <= closest)
            {
                target = sprite;
                closest = distance;
            }
        }

        if (!target || (this.isVillainSwinging(target) && target.attackAt < this.playerAttackAt))
        {
            return;
        }

        target.hits += 1;
        target.setTint(0xff6666);
        this.time.delayedCall(120, () => target.clearTint());

        if (target.hits >= VILAIN_HITS_TO_FALL)
        {
            const texture = target.texture.key;

            target.down = true;
            target.setVelocity(0, 0);
            target.body.setAllowGravity(false);
            target.play(`${texture}-death`);
            target.once(`animationcomplete-${texture}-death`, () =>
            {
                this.releaseVillain(target);
            });
        }
    }

    updateArrival ()
    {
        const center = WORLD_WIDTH / 2;

        this.player.setFlipX(false);

        if (this.player.x >= center)
        {
            this.shiftPlayer(center - this.player.x);
            this.player.setVelocityX(0);
            this.player.play(this.playerKey('idle'));
            this.arriving = false;
            return;
        }

        this.player.setVelocityX(RIDE_SPEED);

        if (this.entrance)
        {
            this.player.play(this.playerKey(this.entrance), true);
        }
    }

    updatePlayer ()
    {
        if (this.arriving)
        {
            this.updateArrival();
            return;
        }

        const left = this.cursors.left.isDown || this.keys.A.isDown;
        const right = this.cursors.right.isDown || this.keys.D.isDown;
        const atLeftEdge = this.player.x <= this.cameras.main.scrollX + SCREEN_LEFT;
        const atRightEdge = this.screenLocked && this.player.x >= this.cameras.main.scrollX + SCREEN_RIGHT;
        const onGround = this.player.body.blocked.down;
        const attacking = this.isPlaying(this.player, this.playerKey('attack'));
        const jumpAttacking = this.isPlaying(this.player, this.playerKey('jump-attack'));
        const hurting = this.isPlaying(this.player, this.playerKey('hurt'));
        const up = this.cursors.up;
        const space = this.cursors.space;
        const upJust = Input.Keyboard.JustDown(up);
        const spaceJust = Input.Keyboard.JustDown(space);
        const jumpAttackPressed = (spaceJust && up.isDown) || (upJust && space.isDown);
        const jumpPressed = upJust && !space.isDown && !spaceJust;
        const attackPressed = spaceJust && !up.isDown && !upJust;
        const swingBlocked = this.villainSwingBlocksPlayer();

        if (this.playerDown)
        {
            this.player.setVelocityX(0);
            return;
        }

        if (attacking || jumpAttacking)
        {
            this.player.setVelocityX(0);

            const hitFrame = jumpAttacking ? 'jump-3' : 'attack-3';

            if (this.player.frame.name === hitFrame && !this.playerSwingHit)
            {
                this.playerSwingHit = true;
                this.hitVillain();
            }

            return;
        }

        this.playerSwingHit = false;
        this.playerAttackAt = 0;

        if (this.keys.S.isDown && onGround && this.anims.exists(this.playerKey('block')))
        {
            this.player.setVelocityX(0);
            this.player.play(this.playerKey('block'), true);
            return;
        }

        if (hurting)
        {
            this.player.setVelocityX(0);
            return;
        }

        if (jumpAttackPressed && !swingBlocked)
        {
            if (onGround)
            {
                this.player.setVelocityY(JUMP_VELOCITY);
            }

            this.beginPlayerAttack('jump-attack');
            return;
        }

        if (attackPressed && onGround && !swingBlocked)
        {
            this.beginPlayerAttack('attack');
            return;
        }

        if (attackPressed && !swingBlocked)
        {
            this.beginPlayerAttack('jump-attack');
            return;
        }

        const canJump = this.anims.exists(this.playerKey('jump'));

        if (jumpPressed && onGround && canJump)
        {
            this.player.setVelocityY(JUMP_VELOCITY);
            this.player.play(this.playerKey('jump'));
        }

        const airborne = !onGround || this.player.body.velocity.y < 0;

        if (canJump && (airborne || jumpPressed))
        {
            if (left && !right && !atLeftEdge)
            {
                this.player.setVelocityX(-MOVE_SPEED);
                this.player.setFlipX(true);
            }
            else if (right && !atRightEdge)
            {
                this.player.setVelocityX(MOVE_SPEED);
                this.player.setFlipX(false);
            }
            else
            {
                this.player.setVelocityX(0);
            }

            const jumpKey = this.playerKey('jump');
            const current = this.player.anims.currentAnim;
            const jumpHolding = current !== null && current.key === jumpKey;

            if (!jumpHolding)
            {
                this.player.play(jumpKey);
            }

            return;
        }

        if (left && !right && !atLeftEdge)
        {
            this.player.setVelocityX(-MOVE_SPEED);
            this.player.setFlipX(true);
            this.player.play(this.playerKey('walk'), true);
        }
        else if (right && !atRightEdge)
        {
            this.player.setVelocityX(MOVE_SPEED);
            this.player.setFlipX(false);
            this.player.play(this.playerKey('walk'), true);
        }
        else
        {
            this.player.setVelocityX(0);
            this.player.play(this.playerKey('idle'), true);
        }
    }

    updateVillain (sprite)
    {
        if (sprite.down)
        {
            sprite.setVelocityX(0);
            return;
        }

        const texture = sprite.texture.key;
        const attacking = this.isPlaying(sprite, `${texture}-attack`);

        if (attacking)
        {
            sprite.setVelocityX(0);

            if (sprite.frame.name === 'attack-4' && !sprite.swingHit)
            {
                sprite.swingHit = true;

                const playerStruckFirst = this.isPlayerSwinging() && this.playerAttackAt <= sprite.attackAt;

                if (!playerStruckFirst && !this.clearsHeight(this.actorHeight(sprite)) && this.isInFront(sprite, this.player, VILAIN_REACH, this.nativeFacesRight(sprite)))
                {
                    this.damagePlayer();
                }
            }

            return;
        }

        if (sprite.swingHit)
        {
            sprite.swingHit = false;
            sprite.attackAt = 0;
            sprite.nextAttack = this.time.now + 700;
        }

        if (this.playerDown)
        {
            sprite.setVelocityX(0);
            sprite.play(`${texture}-idle`, true);
            return;
        }

        const dx = this.player.x - sprite.x;
        const distance = Math.abs(dx);

        this.faceToward(sprite, this.player.x, this.nativeFacesRight(sprite));

        if (distance <= VILAIN_REACH)
        {
            sprite.setVelocityX(0);

            if (!this.isPlayerSwinging() && this.time.now >= sprite.nextAttack)
            {
                sprite.attackAt = this.time.now;
                sprite.play(`${texture}-attack`);
            }
            else
            {
                sprite.play(`${texture}-idle`, true);
            }

            return;
        }

        this.stepVillainStride(sprite);

        if (sprite.striding)
        {
            sprite.setVelocityX(dx > 0 ? VILAIN_SPEED : -VILAIN_SPEED);
            sprite.play(`${texture}-walk`, true);
        }
        else
        {
            sprite.setVelocityX(0);
            sprite.play(`${texture}-idle`, true);
        }
    }

    stepVillainStride (sprite)
    {
        if (this.time.now < sprite.strideUntil)
        {
            return;
        }

        sprite.striding = !sprite.striding;
        const span = sprite.striding
            ? PhaserMath.Between(VILAIN_STRIDE_MIN, VILAIN_STRIDE_MAX)
            : PhaserMath.Between(VILAIN_PAUSE_MIN, VILAIN_PAUSE_MAX);

        sprite.strideUntil = this.time.now + span;
    }

    update ()
    {
        this.updatePlayer();

        const children = this.villains.getChildren();

        for (let i = 0; i < children.length; i++)
        {
            const sprite = children[i];

            if (!sprite.active)
            {
                continue;
            }

            this.updateVillain(sprite);
            this.alignActor(sprite, this.feetFor(sprite), VILAIN_BODY_WIDTH, VILAIN_BODY_HEIGHT);
        }

        this.updateFood();
        this.updateWaves();
        this.scrollCamera();
        this.alignActor(this.player, this.playerFeet(), BODY_WIDTH, BODY_HEIGHT);
    }
}
