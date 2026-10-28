// Prototype personas behind the role switcher. There is no real sign-in.
// STUB: BTS Studio engineering. Replace with production auth (SSO) and real sessions.

import { cookies } from 'next/headers';
import type { Role } from './domain';

export interface Persona {
  id: string;
  role: Role;
  userId: string;
  label: string;
  /** Where switching to this persona lands. */
  home: string;
}

export const PERSONAS: Persona[] = [
  { id: 'coachee', role: 'coachee', userId: 'priya', label: 'Coachee · Priya Raman', home: '/me' },
  { id: 'coachee-demo', role: 'coachee', userId: 'amara', label: 'Coachee · Amara Okoro (upload demo)', home: '/me' },
  { id: 'coachee-companion', role: 'coachee', userId: 'elena', label: 'Coachee · Elena Duarte (companion mode)', home: '/me' },
  { id: 'coach', role: 'coach', userId: 'daniel', label: 'Coach · Daniel Okafor', home: '/coach/sessions' },
  { id: 'coach-new', role: 'coach', userId: 'luis', label: 'Coach · Luis Ortega (first sign-in)', home: '/coach/welcome' },
  { id: 'coach-manager', role: 'coach_manager', userId: 'grace', label: 'Coach manager · Grace Mwangi', home: '/manager/coaches' },
  { id: 'client-admin', role: 'client_admin', userId: 'owen', label: 'Client admin · Northwind Logistics', home: '/client/results' },
  { id: 'bts-admin', role: 'bts_admin', userId: 'noor', label: 'BTS admin', home: '/admin/clients' },
];

export const PERSONA_COOKIE = 'cc_persona';
const DEFAULT_PERSONA = 'coach';

export function personaById(id: string | undefined): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS.find((p) => p.id === DEFAULT_PERSONA)!;
}

/** The persona for this request. STUB: BTS Studio engineering (auth). */
export function currentPersona(): Persona {
  return personaById(cookies().get(PERSONA_COOKIE)?.value);
}

/** First persona with one of these roles, for "switch to view this page" links. */
export function personaForRoles(roles: Role[]): Persona | undefined {
  return PERSONAS.find((p) => roles.includes(p.role));
}
