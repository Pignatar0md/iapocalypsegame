import { useEffect, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import StartScreen from './StartScreen';
import HeroSelect from './HeroSelect';
import { setSelectedHero } from './game/selectedHero';
import { startMenuMusic } from './game/menuMusic';

function App ()
{
    const [screen, setScreen] = useState('start');

    useEffect(() => {

        startMenuMusic();

    }, []);

    const chooseHero = (id) => {

        setSelectedHero(id);
        setScreen('game');

    };

    return (
        <div id="app">
            {screen === 'game' && <PhaserGame />}
            {screen === 'heroes' && <HeroSelect onChoose={chooseHero} />}
            {screen === 'start' && <StartScreen onPlay={() => setScreen('heroes')} />}
        </div>
    );
}

export default App;
