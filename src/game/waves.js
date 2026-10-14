// Camera scrollX that starts each fight. Enemies walk in from off-screen.
export const SPAWN_INTERVAL_MIN = 1500;
export const SPAWN_INTERVAL_MAX = 2500;
export const SPAWN_MARGIN = 140;
export const VILLAIN_POOL_SIZE = 8;

export const FOOD_CELL = 16;
export const FOOD_COLUMNS = 8;
export const FOOD_ROWS = 8;
export const FOOD_HEAL = 0.15;

// One pickup on the first wave, the next after two waves, then on the
// following wave. That 2-then-1 gap repeats: waves 1, 3, 4, 6, 7, ...
export function waveHasFood (index)
{
    let cursor = 0;
    let gap = 2;

    while (cursor < index)
    {
        cursor += gap;
        gap = gap === 2 ? 1 : 2;
    }

    return cursor === index;
}

// The tango dancer only shows up against a woman.
const FEMALE_PLAYER_IDS = [ 'yasumi', 'abeni' ];

export function enemiesForPlayer (enemies, playerId)
{
    if (FEMALE_PLAYER_IDS.includes(playerId))
    {
        return enemies;
    }

    return enemies.filter((enemy) => enemy.texture !== 'vilain3f');
}

export const WAVES = [
    {
        id: 'wave-1',
        triggerX: 1600,
        enemies: [
            { texture: 'vilain', side: 'right' },
            { texture: 'vilain2', side: 'left' }
        ]
    },
    {
        id: 'wave-2',
        triggerX: 4200,
        enemies: [
            { texture: 'vilain', side: 'right' },
            { texture: 'vilain2', side: 'left' },
            { texture: 'vilain2', side: 'right' }
        ]
    },
    {
        id: 'wave-3',
        triggerX: 7200,
        enemies: [
            { texture: 'vilain', side: 'left' },
            { texture: 'vilain', side: 'right' },
            { texture: 'vilain2', side: 'right' }
        ]
    },
    {
        id: 'wave-4',
        triggerX: 10200,
        enemies: [
            { texture: 'vilain3m', side: 'right' }
        ]
    },
    {
        id: 'wave-5',
        triggerX: 13200,
        enemies: [
            { texture: 'vilain3m', side: 'right' },
            { texture: 'vilain', side: 'left' }
        ]
    },
    {
        id: 'wave-6',
        triggerX: 16200,
        enemies: [
            { texture: 'vilain3m', side: 'right' },
            { texture: 'vilain', side: 'left' },
            { texture: 'vilain2', side: 'right' }
        ]
    }
];
