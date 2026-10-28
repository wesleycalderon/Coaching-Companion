'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PERSONA_COOKIE, personaById } from './persona';

/** Role switcher. STUB: BTS Studio engineering (auth). */
export async function switchPersona(formData: FormData) {
  const persona = personaById(String(formData.get('persona') ?? ''));
  cookies().set(PERSONA_COOKIE, persona.id, { path: '/', sameSite: 'lax', httpOnly: true });
  const next = String(formData.get('next') ?? '');
  redirect(next.startsWith('/') ? next : persona.home);
}
