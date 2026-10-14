const SRC = encodeURI('assets/music_mp3/Assault(loop) - angry - tension - battle.mp3');

let audio = null;
let unlockBound = false;

function ensureAudio ()
{
    if (audio)
    {
        return audio;
    }

    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = 'auto';

    return audio;
}

function clearUnlock ()
{
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    unlockBound = false;
}

function play ()
{
    const pending = ensureAudio().play();

    if (pending && typeof pending.then === 'function')
    {
        pending.then(clearUnlock).catch(() => {});
    }
}

function unlock ()
{
    play();
}

export function startMenuMusic ()
{
    ensureAudio();
    play();

    if (!unlockBound)
    {
        unlockBound = true;
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }
}

export function stopMenuMusic ()
{
    clearUnlock();

    if (!audio)
    {
        return;
    }

    audio.pause();
    audio.currentTime = 0;
}
