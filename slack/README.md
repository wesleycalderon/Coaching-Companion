# Connecting the Slack app

The web app works without Slack: every companion message also appears in the simulated chat
(`/preview/slack-dm`), where the buttons work. Connect Slack to get the same messages in real
Slack. Use a test workspace you own; the prototype holds synthetic data only.

1. Go to https://api.slack.com/apps → **Create New App** → **From an app manifest**. Pick your
   test workspace and paste `slack/manifest.yml`.
2. **Install to Workspace** and allow the permissions. Copy the **Bot User OAuth Token**
   (`xoxb-…`).
3. **Basic Information → App-Level Tokens → Generate Token and Scopes**. Add the
   `connections:write` scope and copy the token (`xapp-…`). Socket Mode uses it, so no public
   URL or tunnel is needed.
4. Find your own Slack member ID (your profile → ⋯ → **Copy member ID**, starts with `U`).
5. Put these in `.env` (never in chat or git), then restart `npm run dev`:

   ```
   SLACK_ENABLED="true"
   SLACK_BOT_TOKEN="xoxb-…"
   SLACK_APP_TOKEN="xapp-…"
   SLACK_TEST_USER_ID="U…"
   ```

   `SLACK_TEST_USER_ID` sends every Slack-first coachee's messages to you, since the seeded
   coachees are synthetic people without Slack accounts.
6. The server log shows `[slack] connected in Socket Mode`. Open `/preview/slack-dm`, pick a
   message under **Prototype controls** and press **Send now**: it arrives in your Slack DMs
   from "Coaching companion". Buttons in Slack and in the web app update the same records.

## Scheduler

Set `COMPANION_SCHEDULER="true"` to send midday nudges and end-of-day check-ins at 12:00 and
17:00 in each coachee's time zone (checked every five minutes, within each client's quiet hours
and daily limit). With `SLACK_TEST_USER_ID` set, that's one message per coachee with an open
action, all to you, so leave it off unless you want that. The **Run the 12:00/17:00 scheduler
slot** controls send a slot on demand instead.

## What's stubbed

- Consent requests and "what do you want to bring" prompts are sent from the prototype
  controls; production sends them the evening before each session.
- Email delivery is a later milestone. Teams delivery is set up separately (`teams/README.md`);
  without it, Teams-first coachees (Halden) use the simulated chat.
- AI task 5 writes nudges when `ANTHROPIC_API_KEY` is set; otherwise a plain template is used.
