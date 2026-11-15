'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '../../../components/app/AppShell';
import { DEMO_HELPERS } from '../coordination/demo/people';
import { useCoverageWorkspace } from './DemoWorkspace';
export default function DemoAppFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { selected, setSelected, calendarRecipient, actor, recipients } = useCoverageWorkspace();
  const pathname = usePathname(), familyCalendar = pathname === '/calendar/demo';
  const recipient = recipients.find(p => p.key === selected) || recipients[0];
  const calendarPerson = recipients.find(p => p.id === calendarRecipient);
  const displayedRecipient = familyCalendar ? calendarPerson : recipient;
  const helper = DEMO_HELPERS.find(p => p.id === actor);
  const isSeeded = recipient.id === 'r-alex' || recipient.id === 'r-june';
  return <AppShell recipientName={displayedRecipient?.name || 'Everyone'} recipientInitials={displayedRecipient?.initials || 'FM'} recipientPhoto={displayedRecipient?.photoUrl || ''} recipientColor={displayedRecipient?.color || '#52665c'} recipientContextLabel={familyCalendar ? 'Calendar for' : 'Care plan for'} showRecipientSwitch={!familyCalendar} userInitials={helper?.initials || 'HI'} wide={wide} homeHref="/demo" profileHref="/demo#care-home"
    onSwitchRecipient={familyCalendar ? undefined : () => setSelected(recipients[(recipients.findIndex(p => p.key === selected) + 1) % recipients.length].key)}
    links={isSeeded ? [{ href: '/demo', label: 'Home', icon: '⌂' }, { href: '/calendar/demo', label: 'Calendar', icon: '□' }, { href: '/care/demo', label: 'Daily care', icon: '☼' }, { href: '/people/demo', label: 'People', icon: '◎' }] : [{ href: '/demo', label: 'Home', icon: '⌂' }, { href: '/people/demo', label: 'People', icon: '◎' }]}>{children}</AppShell>;
}
