const areas = [
  { number: "01", title: "A little less guessing.", text: "Keep medications and daily care in one shared place, with the whole family in the loop.", label: "Medications" },
  { number: "02", title: "Someone’s got Thursday.", text: "Coordinate appointments and make it clear who’s taking your loved one.", label: "Appointments" },
  { number: "03", title: "Go in feeling prepared.", text: "Bring care notes, lab questions, and the family’s observations to the next doctor visit.", label: "Doctor prep" },
];

export default function Home() {
  return <main>
    <header className="nav"><a className="wordmark" href="/" aria-label="HandsIn home">Hands<span>In</span><i aria-hidden="true">✳</i></a><a className="nav-link" href="#the-plan">The plan <span aria-hidden="true">↗</span></a></header>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow"><span className="dot" /> A little help. A lot of heart.</p><h1>Care is a<br />team effort<span className="period">.</span></h1><p className="intro">One shared place for families caring for someone they love. So nothing gets missed, and no one carries it alone.</p><a className="button" href="#the-plan">Meet HandsIn <span aria-hidden="true">↓</span></a><p className="build-note">Hackathon build in progress · This is our starting point.</p></div>
      <div className="art" role="img" aria-label="Four colorful hands coming together around a heart, representing a family sharing care"><div className="art-orbit"/><span className="spark spark-one">✳</span><span className="spark spark-two">✦</span><div className="hand hand-red"/><div className="hand hand-blue"/><div className="hand hand-orange"/><div className="hand hand-yellow"/><div className="heart">♥</div><span className="art-caption">WE’RE IN THIS TOGETHER.</span></div>
    </section>
    <section id="the-plan" className="plan"><div className="section-heading"><p className="eyebrow">One circle. Everyone connected.</p><h2>Less back-and-forth.<br />More being there.</h2><p>We’re building a shared care hub for the everyday things that matter.</p></div><div className="cards">{areas.map(area => <article key={area.number}><div className="card-top"><span>{area.number}</span><span>{area.label}</span></div><h3>{area.title}</h3><p>{area.text}</p></article>)}</div></section>
    <footer><a className="wordmark" href="/">Hands<span>In</span></a><p>When Dad needs care, everyone puts their hands in.</p><span>Built with care.</span></footer>
  </main>;
}
