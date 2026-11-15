import Link from 'next/link';

export default function CoveragePage() {
  return <main style={{ padding: '64px 24px', maxWidth: 720 }}>
    <p>HandsIn · Temporary coverage</p><h1 style={{ fontSize: 48, letterSpacing: '-1px' }}>A little help, with a clear handoff.</h1>
    <p>Connected coverage is not available yet. Identity, temporary permissions and shared care records still need to be integrated.</p>
    <p>The interactive demo uses fictional people and resets when you reload. No invitations are sent.</p>
    <Link className="button" href="/coverage/demo">Explore the coverage demo →</Link>
  </main>;
}
