// Small server components shared by every screen. Layout comes from src/app/app.css.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { switchPersona } from '@/lib/actions';
import { ROLE_LABEL, type Role } from '@/lib/domain';
import { currentPersona, personaForRoles, type Persona } from '@/lib/persona';

export function PageHead({ title, lede, children, titleClass = 'heading-large' }: { title: ReactNode; lede?: ReactNode; children?: ReactNode; titleClass?: string }) {
  return (
    <div className="page-head">
      <div className="page-head__text">
        <h1 className={`${titleClass} page-title`}>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="back-link" href={href}>‹ {children}</Link>;
}

export interface NavItem {
  href: string;
  label: string;
}

export function SideNav({ label, items, current, className = '', children }: { label: string; items: NavItem[]; current: string; className?: string; children?: ReactNode }) {
  return (
    <nav aria-label={label} className={`side-nav ${className}`}>
      {children}
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.href === current ? 'page' : undefined}>{i.label}</Link>
      ))}
    </nav>
  );
}

export const COACH_NAV: NavItem[] = [
  { href: '/coach/sessions', label: 'Sessions' },
  { href: '/coach/coachees', label: 'Coachees' },
  { href: '/coach/plans', label: 'Next-session plans' },
  { href: '/coach/practice', label: 'My practice' },
];
export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/people', label: 'People' },
  { href: '/admin/models', label: 'Coaching models' },
  { href: '/admin/integrations', label: 'Integrations' },
  { href: '/admin/audit', label: 'Audit log' },
];
export const CLIENT_NAV: NavItem[] = [
  { href: '/client/results', label: 'Program results' },
  { href: '/client/coachees', label: 'Coachees' },
  { href: '/client/settings', label: 'Settings' },
];

/** Shell for a page with a left nav: page frame, nav and main column. */
export function NavPage({ nav, navLabel, current, children, narrow }: { nav: NavItem[]; navLabel: string; current: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`page page--with-nav${narrow ? ' page--narrow' : ''}`}>
      <SideNav label={navLabel} items={nav} current={current} />
      <main className="main">{children}</main>
    </div>
  );
}

/** Pagination footer with real links. Uses the system's .ecb-pagination classes. */
export function Pagination({ page, pageSize, total, noun, hrefFor }: { page: number; pageSize: number; total: number; noun: string; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="ecb-pagination in-card">
      <span className="ecb-pagination-info">Showing {from} to {to} of {total.toLocaleString('en-GB')} {noun}</span>
      <div className="ecb-pagination-controls">
        {page > 1
          ? <Link className="ecb-page-btn" href={hrefFor(page - 1)} aria-label="Previous page">‹</Link>
          : <button className="ecb-page-btn" disabled aria-label="Previous page">‹</button>}
        <span className="ecb-page-indicator">Page {page} of {pages}</span>
        {page < pages
          ? <Link className="ecb-page-btn" href={hrefFor(page + 1)} aria-label="Next page">›</Link>
          : <button className="ecb-page-btn" disabled aria-label="Next page">›</button>}
      </div>
    </div>
  );
}

const ROLE_PLURAL: Record<Role, string> = {
  coachee: 'coachees', coach: 'coaches', coach_manager: 'coach managers', client_admin: 'client admins', bts_admin: 'BTS admins', system: 'the companion',
};

/**
 * Returns the persona when it may see this page; otherwise null, and the page renders
 * <WrongRole>. STUB: BTS Studio engineering (authorisation).
 */
export function allow(roles: Role[]): Persona | null {
  const p = currentPersona();
  return roles.includes(p.role) ? p : null;
}

export function WrongRole({ roles, path }: { roles: Role[]; path: string }) {
  const target = personaForRoles(roles);
  const who = roles.map((r) => ROLE_PLURAL[r]).join(' and ');
  return (
    <div className="page page--narrow">
      <div className="card card--pad card--stack">
        <h1 className="heading-small heading-reset">This page is for {who}</h1>
        <p className="text-body">You're viewing the prototype as {ROLE_LABEL[currentPersona().role].toLowerCase()}. Switch view to see it.</p>
        {target ? (
          <form action={switchPersona}>
            <input type="hidden" name="persona" value={target.id} />
            <input type="hidden" name="next" value={path} />
            <button className="ecb-btn-primary" type="submit">View as {target.label}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function NotFoundCard({ what }: { what: string }) {
  return (
    <div className="page page--narrow">
      <div className="card card--pad card--stack">
        <h1 className="heading-small heading-reset">We couldn't find this {what}</h1>
        <p className="text-body">It may have been deleted, or it belongs to someone you can't see. <Link href="/">Open the screen index</Link></p>
      </div>
    </div>
  );
}

export function SampleNote() {
  return <p className="sample-note">Sample data for the prototype.</p>;
}
