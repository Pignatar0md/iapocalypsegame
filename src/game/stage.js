export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;
export const GROUND_Y = 920;
export const TILE_SIZE = 64;

export const ASSET_INDEX_KEY = 'asset-index';
export const ASSET_INDEX_URL = 'assets/purchased_assets/assets.json';

// Road is painted in front of the dirt (fence). The JSON lists fence last,
// which would hide the cracked surface.
export const BACKGROUND_LAYER_KEYS = [
    'bg-postapocalypse-2-bright-sky',
    'bg-postapocalypse-2-bright-houses-trees-bg',
    'bg-postapocalypse-2-bright-houses',
    'bg-postapocalypse-2-bright-car-trees-etc',
    'bg-postapocalypse-2-bright-fence',
    'bg-postapocalypse-2-bright-road',
];

// Far layers lag behind. Fence and road stay locked so the ground does not split.
export const PARALLAX_FACTORS = [ 0.12, 0.28, 0.48, 0.68, 1, 1 ];

export function getBackgroundLayers (assetIndex)
{
    const stage = assetIndex.backgrounds.find((background) => background.id === 'postapocalypse-2');
    const byKey = new Map(stage.variants.bright.layers.map((layer) => [ layer.key, layer ]));

    return BACKGROUND_LAYER_KEYS.map((key) => byKey.get(key));
}

export function getCharacter (assetIndex, id)
{
    return assetIndex.characters.find((character) => character.id === id);
}
