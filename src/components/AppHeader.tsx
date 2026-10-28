import { RoleBadge } from '@/ds/components';
import { ROLE_LABEL } from '@/lib/domain';
import { PERSONAS, type Persona } from '@/lib/persona';
import { switchPersona } from '@/lib/actions';
import { db } from '@/lib/db';

/** App-shell header with the prototype role switcher. STUB: BTS Studio engineering (auth). */
export async function AppHeader({ persona }: { persona: Persona }) {
  const user = await db.user.findUnique({ where: { id: persona.userId }, include: { client: true } });
  const who = persona.role === 'bts_admin' ? null : persona.role === 'client_admin' ? user?.client?.name : user?.name;
  return (
    <header className="ecb-app-shell-header app-header">
      <a className="app-header__brand" href="/">bts Studio</a>
      <span className="app-header__product">Coaching companion{persona.role === 'bts_admin' ? ' · Admin' : ''}</span>
      <RoleBadge label={ROLE_LABEL[persona.role]} />
      {who ? <span className="app-header__who">{who}</span> : null}
      <form action={switchPersona} className="persona-switcher">
        <label className="visually-hidden" htmlFor="persona">View the prototype as</label>
        <select key={persona.id} id="persona" name="persona" className="ecb-form-select" defaultValue={persona.id}>
          {PERSONAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <button className="ecb-btn-secondary" type="submit">Switch view</button>
      </form>
    </header>
  );
}
