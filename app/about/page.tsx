import { BrandLogo, BrandEmblem } from "@/components/brand/BrandLogo";
const areas = [
  { number: "01", title: "A little less guessing.", text: "Keep medications and daily care in one shared place, with the whole family in the loop.", label: "Medications" },
  { number: "02", title: "Someone’s got Thursday.", text: "Coordinate appointments and make it clear who’s taking your loved one.", label: "Appointments" },
  { number: "03", title: "Go in feeling prepared.", text: "Bring care notes, lab questions, and the family’s observations to the next doctor visit.", label: "Doctor prep" },
];

export default function Home() {
  return <main>
    <header className="nav"><a className="wordmark" href="/" aria-label="HandsIn home"><BrandLogo /></a><a className="nav-link" href="#the-plan">The plan <span aria-hidden="true">↗</span></a></header>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow"><span className="dot" /> A little help. A lot of heart.</p><h1>Care is a<br />team effort<span className="period">.</span></h1><p className="intro">One shared place for families caring for someone they love. So nothing gets missed, and no one carries it alone.</p><a className="button" href="#the-plan">Meet HandsIn <span aria-hidden="true">↓</span></a><p className="build-note">Hackathon build in progress · This is our starting point.</p></div>
      <div><BrandEmblem /><p className="eyebrow" style={{textAlign:"center",display:"block"}}>Everyone connected.</p></div>
    </section>
    <section id="the-plan" className="plan"><div className="section-heading"><p className="eyebrow">One circle. Everyone connected.</p><h2>Less back-and-forth.<br />More being there.</h2><p>We’re building a shared care hub for the everyday things that matter.</p></div><div className="cards">{areas.map(area => <article key={area.number}><div className="card-top"><span>{area.number}</span><span>{area.label}</span></div><h3>{area.title}</h3><p>{area.text}</p></article>)}</div></section>
    <footer><a className="wordmark" href="/"><BrandLogo /></a><p>When Dad needs care, everyone puts their hands in.</p><span>Built with care.</span></footer>
  </main>;
}
