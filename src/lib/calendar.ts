// A person's upcoming meetings, as the calendar integration would return them.
// STUB: calendar integration. Synthetic events only; everyone gets a weekly team meeting and a
// one-to-one series, and Priya (coachee) and Daniel (coach) have their own for the demo.

import { now } from './format';

export interface CalendarAttendee { name: string; internal: boolean }

export interface CalendarEvent {
  id: string;
  title: string;
  recurring: boolean;
  /** Series only, e.g. "Thursdays 14:00". */
  cadence?: string;
  /** Next start (single meetings: the only start), UTC. */
  nextAt: Date;
  minutes: number;
  attendees: CalendarAttendee[];
}

const DAY = 86_400_000;

/** Next date after the prototype's now that falls on weekday `wd` (0 = Sunday) at hh:mm UTC. */
function nextWeekday(wd: number, hh: number, mm = 0): Date {
  const d = new Date(now());
  d.setUTCHours(hh, mm, 0, 0);
  while (d.getUTCDay() !== wd || d <= now()) d.setTime(d.getTime() + DAY);
  return d;
}

const team = (names: string[]) => names.map((name) => ({ name, internal: true }));

export function calendarFor(user: { id: string; name: string }): CalendarEvent[] {
  if (user.id === 'priya') {
    return [
      { id: 'cal-priya-team', title: 'Weekly team meeting', recurring: true, cadence: 'Thursdays 14:00', nextAt: nextWeekday(4, 14), minutes: 45, attendees: team(['Ana Ruiz', 'Sam Osei', 'Leo Brandt']) },
      { id: 'cal-priya-ana', title: 'One-to-one with Ana', recurring: true, cadence: 'Mondays 15:00', nextAt: nextWeekday(1, 15), minutes: 30, attendees: team(['Ana Ruiz']) },
      { id: 'cal-priya-planning', title: 'Team planning', recurring: true, cadence: 'Tuesdays 10:00', nextAt: nextWeekday(2, 10), minutes: 60, attendees: team(['Ana Ruiz', 'Sam Osei', 'Leo Brandt', 'Mia Novak']) },
      { id: 'cal-priya-carrier', title: 'Carrier review with Bluefin Freight', recurring: false, nextAt: nextWeekday(3, 10), minutes: 60, attendees: [...team(['Sam Osei']), { name: 'Dana Whitlock (Bluefin Freight)', internal: false }] },
    ];
  }
  if (user.id === 'daniel') {
    // A coach's own meetings (coaching sessions aren't calendar events here: they're sessions).
    return [
      { id: 'cal-daniel-community', title: 'Coach community call', recurring: true, cadence: 'Wednesdays 16:00', nextAt: nextWeekday(3, 16), minutes: 45, attendees: team(['Aiko Tanaka', 'Sofia Brandt', 'Kwame Asante']) },
      { id: 'cal-daniel-supervision', title: 'Supervision with Grace', recurring: true, cadence: 'Fridays 10:00', nextAt: nextWeekday(5, 10), minutes: 30, attendees: team(['Grace Mwangi']) },
      { id: 'cal-daniel-orrin', title: 'Intro call with Orrin Health', recurring: false, nextAt: nextWeekday(2, 15), minutes: 30, attendees: [{ name: 'Morgan Lee (Orrin Health)', internal: false }] },
    ];
  }
  const first = user.name.split(' ')[0].toLowerCase();
  return [
    { id: `cal-${user.id}-team`, title: 'Weekly team meeting', recurring: true, cadence: 'Wednesdays 09:30', nextAt: nextWeekday(3, 9, 30), minutes: 45, attendees: team(['Team member one', 'Team member two']) },
    { id: `cal-${user.id}-1to1`, title: 'One-to-ones', recurring: true, cadence: 'Fridays 11:00', nextAt: nextWeekday(5, 11), minutes: 30, attendees: team([`Direct report of ${first}`]) },
  ];
}

/** Starts of a series' occurrences from `from` (inclusive) until `until`, weekly. */
export function seriesStarts(event: CalendarEvent, from: Date, until: Date): Date[] {
  if (!event.recurring) return event.nextAt >= from && event.nextAt <= until ? [event.nextAt] : [];
  const out: Date[] = [];
  let t = event.nextAt.getTime();
  while (t - 7 * DAY >= from.getTime()) t -= 7 * DAY;
  for (; t <= until.getTime(); t += 7 * DAY) if (t >= from.getTime()) out.push(new Date(t));
  return out;
}
