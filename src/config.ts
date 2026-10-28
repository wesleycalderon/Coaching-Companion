// One place for prototype configuration.

/** Claude model for every AI task (milestone 2 onward). Override with ANTHROPIC_MODEL. */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

/**
 * The prototype runs at a fixed "now" so seeded data reads the same on any day. The canvas
 * dates (Tue 21 Oct, Thu 23 Oct…) follow the 2025 calendar, so the seed does too:
 * the day after the latest event on the design canvas. Relative copy such as
 * "Transcript deletes in 3 days" is computed from this.
 */
export const PROTOTYPE_NOW = new Date('2025-10-25T17:00:00Z');

/** Rows per page in admin tables, matching the canvas. */
export const PAGE_SIZE = { people: 5, audit: 6, clients: 10 } as const;
