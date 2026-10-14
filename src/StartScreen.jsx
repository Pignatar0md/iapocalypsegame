const STORY = 'Ciudades están completamente devastadas por una superinteligencia artificial mal gestionada y la humanidad está a punto de extinguirse. Solo un héroe puede recorrer las calles de las principales ciudades donde la IA fue desarrollada y acaba con todos los dispositivos corruptos por esta IA que quiere someter a la humanidad. Comienza antes de que sea demasiado tarde.';

function StartScreen ({ onPlay })
{
    return (
        <section className="start-screen">
            <div className="start-panel">
                <img src="/public/assets/logoIA.png" alt="IApocalipse" />
                <p>{STORY}</p>
                <button className="start-play" type="button" onClick={onPlay} autoFocus>Jugar</button>
            </div>
        </section>
    );
}

export default StartScreen;
