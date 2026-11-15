'use client';
import type { ReactNode } from 'react';
import { AppShell } from '../../../components/app/AppShell';
import { DEMO_HELPERS, DEMO_RECIPIENTS } from '../coordination/demo/people';
import { useCoverageWorkspace } from './DemoWorkspace';
export default function DemoAppFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { selected, setSelected, actor } = useCoverageWorkspace();
  const recipient = DEMO_RECIPIENTS.find(p => p.key === selected) || DEMO_RECIPIENTS[0];
  const helper = DEMO_HELPERS.find(p => p.id === actor);
  return <AppShell recipientName={recipient.name} recipientInitials={recipient.initials} userInitials={helper?.initials || 'HI'} wide={wide} homeHref="/demo" profileHref="/demo#care-home"
    onSwitchRecipient={() => setSelected(DEMO_RECIPIENTS.find(p => p.key !== selected)!.key)}
    links={[{ href: '/demo', label: 'Home', icon: '⌂' }, { href: '/calendar/demo', label: 'Calendar', icon: '□' }, { href: '/care/demo', label: 'Daily care', icon: '☼' }, { href: '/people/demo', label: 'People', icon: '◎' }]}>{children}</AppShell>;
}



