import Link from 'next/link';
export default function Page() {
  return <main style={{ maxWidth: 700, margin: '80px auto', padding: 24 }}><h1>Meals & daily care</h1><p>Production access requires the host app’s verified session, recipient permissions and database adapters. They are not connected on this branch.</p><p><Link href="/care/demo">Explore the fictional demo →</Link></p><Link href="/calendar">Calendar setup</Link></main>;
}
