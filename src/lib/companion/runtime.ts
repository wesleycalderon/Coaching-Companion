// Starts the background parts of the companion once per server process: the Slack app
// (Socket Mode) and the nudge scheduler. Called from src/instrumentation.ts.
import { slackEnabled } from './send';

const g = globalThis as unknown as { __companionStarted?: boolean };

export async function startCompanion() {
  if (g.__companionStarted) return;
  g.__companionStarted = true;

  if (slackEnabled()) {
    const { startSlack } = await import('./slack');
    await startSlack().catch((e) => console.error('[slack] could not connect; messages stay in the web app', e));
  } else if (process.env.SLACK_ENABLED === 'true') {
    console.warn('[slack] SLACK_ENABLED is true but SLACK_BOT_TOKEN or SLACK_APP_TOKEN is missing');
  }

  if (process.env.COMPANION_SCHEDULER === 'true') {
    const cron = (await import('node-cron')).default;
    const { draftDuePlans, runNudges } = await import('./scheduler');
    cron.schedule('*/5 * * * *', () => {
      runNudges().then((log) => log.forEach((l) => console.log(`[nudges] ${l}`))).catch((e) => console.error('[nudges] run failed', e));
    });
    cron.schedule('0 * * * *', () => {
      draftDuePlans().then((log) => log.forEach((l) => console.log(`[plans] ${l}`))).catch((e) => console.error('[plans] run failed', e));
    });
    console.log('[nudges] scheduler on: checking every five minutes for 12:00 and 17:00 slots, and hourly for plans due');
  }
}
