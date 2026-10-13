const HEROES = [
    {
        id: 'rafa',
        name: 'Rafa',
        image: 'images/characters/rafa.webp',
        traits: [ 'Backend dev', 'Punk', 'Skate', 'Guitarra' ]
    },
    {
        id: 'yasumi',
        name: 'Yasumi',
        image: 'images/characters/yasumi.webp',
        traits: [ 'Game tester', 'Witch-house', 'Danza', 'Cocina' ]
    },
    {
        id: 'lauti',
        name: 'Lauti',
        image: 'images/characters/lauti.webp',
        traits: [ 'Frontend dev', 'Metal', 'Parkour', 'Piano' ]
    },
    {
        id: 'abeni',
        name: 'Abeni',
        image: 'images/characters/abeni.webp',
        traits: [ 'UX/UI designer', 'Trap', 'Body builder', 'Escritora' ]
    }
];

function HeroSelect ({ onChoose })
{
    return (
        <section className="hero-screen">
            <div className="hero-panel">
                <h1>Elegí tu héroe</h1>
                <p>Uno de ellos sera capaz de cambiar el destino de la humanidad.</p>
                <div className="hero-list">
                    {HEROES.map((hero) => (
                        <button className="hero-card" type="button" key={hero.id} onClick={() => onChoose(hero.id)}>
                            <span className="hero-meta">
                                <span className="hero-name">{hero.name}</span>
                                <span>
                                {hero.traits.map((trait) => (
                                        trait + ' | '
                                    ))}
                                    </span>
                            </span>
                            <img className={hero.id === 'abeni' ? 'hero-img-abeni' : undefined} src={hero.image} alt="" />
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default HeroSelect;
