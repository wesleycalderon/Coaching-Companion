# Live test: your calendar, a real Zoom meeting, feedback and an AI coach in Slack

You test the companion as yourself:
- Sign in with Google.
- Choose which of your real meetings the companion joins.
- Hold a Zoom meeting with its transcript on. No recording is needed.

A few minutes after Zoom finishes the transcript, feedback on your own words arrives in Slack. Press **Talk it through with an AI coach**, then reply in the thread to keep talking to a BiTSy AI coach.

Use a personal Google account and test meetings only. Never use client data.

## What you need

- A **personal Gmail** account.
- A **paid Zoom plan** with AI Companion, so Zoom can keep a meeting transcript without recording.
- The **Slack test app**, already set up (see `slack/README.md`).
- **ngrok** (free) or Cloudflare Tunnel. Zoom only needs this to send you back to the app after you link it.

## 1. Google (about 10 minutes)

1. In [Google Cloud console](https://console.cloud.google.com/), create a project, for example "Coaching companion test".
2. Under **APIs & Services → Library**, turn on the **Google Calendar API**.
3. Set up the **OAuth consent screen**:
   - User type **External**, publishing status **Testing**.
   - Add your Gmail address under **Test users**.
   - Scopes: `openid`, `email`, `profile` and `.../auth/calendar.readonly`.
4. Under **Credentials → Create credentials → OAuth client ID**:
   - Type **Web application**.
   - Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`.
5. In `.env`:
   ```
   LIVE_TEST="true"
   GOOGLE_CLIENT_ID="…"
   GOOGLE_CLIENT_SECRET="…"
   ```

## 2. Zoom (about 15 minutes)

1. **Zoom web settings** (zoom.us → Settings). Setting names move around between Zoom releases, so use the settings search if one isn't where it's listed here:
   - **AI Companion:** turn on **Meeting summary** (or the meeting transcript), and optionally have it start automatically, so you can't forget.
   - Turn on **Allow meeting hosts to retain and access meeting transcripts**. Without it, Zoom deletes the transcript soon after the meeting and the app can't fetch it.
   - Zoom shows everyone in the meeting that it's being transcribed. That notice stands in for everyone's agreement to the companion, so there's nothing to confirm afterwards.
   - **Fallback:** if a meeting is recorded to the cloud with **Create audio transcript** on, the app uses that recording's transcript instead.
2. **Start a tunnel** to the app, and keep it running while you test:
   ```bash
   ngrok http 3000
   ```
   ngrok's free plan gives you one fixed domain, so the address doesn't change between runs.
3. **Create the Zoom app** in the [Zoom App Marketplace](https://marketplace.zoom.us/): **Develop → Build App → General App**, user-managed.
   - **OAuth redirect URL**, and also the OAuth allow list: `https://<your-tunnel>/api/auth/zoom/callback`.
   - **Scopes:** pick the read scopes for your own account, not the admin ones. Search for:
     - "user", to read your own profile;
     - "past meeting" or "past_instances", to list the times a meeting was held;
     - "transcript", to read meeting transcripts;
     - "cloud_recording", to list and read your recordings (only needed for the fallback).
   - Leave the app unpublished. Only your own Zoom account can use it, which is all the test needs.
4. In `.env`:
   ```
   ZOOM_CLIENT_ID="…"
   ZOOM_CLIENT_SECRET="…"
   ZOOM_REDIRECT_URL="https://<your-tunnel>/api/auth/zoom/callback"
   ```

You keep using the app at `http://localhost:3000`. Only Zoom's redirect goes through the tunnel.

## 3. Slack (about 2 minutes)

The companion now reads your replies in its direct messages, so the Slack app needs one more scope and one event.

1. Open [api.slack.com/apps](https://api.slack.com/apps) and pick the companion app.
2. Under **OAuth & Permissions → Bot token scopes**, add `im:history`.
3. Under **Event Subscriptions**, turn it on and add the bot event `message.im`.
4. Under **App Home**, make sure "Allow users to send messages from the messages tab" is ticked.
5. **Reinstall the app** to the workspace. The bot token stays the same.

`slack/manifest.yml` has all of this, if you'd rather paste the manifest.

## 4. Run it

1. Restart the app. The server log should show `[live] live test on`.
2. Open `http://localhost:3000/live`. The setup checklist should say **Ready** everywhere.
3. Press **Sign in with Google** and allow calendar access. You land on **Set up your live test**:
   1. Write one or two actions you want to practice.
   2. Agree to use the companion.
   3. Link Zoom.
4. In **Companion settings**, choose which meetings it joins. Everything is on by default, and only events with a Zoom link can be captured.
5. Put a short Zoom meeting on your Google Calendar. Use a meeting created in Zoom with its link in the event, starting in 15 minutes or more. Include a guest only if they're in your email domain. A Gmail guest counts as internal when you use Gmail; anyone else's meeting is skipped.
6. About 10 minutes before the meeting, Slack sends a heads-up, with a button to turn the companion off for that meeting. If others are invited, it includes an optional line to paste into the Zoom chat saying what the recording is for.
7. Hold the meeting with AI Companion or the transcript on. You don't need to record. Speak for a minute or two, ideally trying your action.
8. After it ends, the app checks Zoom every 2 minutes, first for the meeting transcript, then for a cloud recording's transcript. It uses the first one it finds straight away.
9. Feedback arrives in Slack. Press **Talk it through with an AI coach**, then reply in the thread.
10. Send the companion a new direct message, not in a thread, to start a general conversation with an AI coach.

`/live` shows where each meeting stands. **Check calendar and Zoom now** skips the one-minute wait.

## If something doesn't arrive

- **"No meeting transcript yet"** means Zoom hasn't made one, or isn't keeping it. Check that AI Companion or the transcript was on during the meeting, and that **Allow meeting hosts to retain and access meeting transcripts** is on. It can take a few minutes after the meeting ends.
- **"The Zoom app can't read …"** means a scope is missing. Add it in the Zoom App Marketplace, then link Zoom again from the setup page.
- **"Zoom is still making its transcript"** is normal for the cloud-recording fallback. Recording transcripts often take as long as the meeting itself.
- **"We didn't find … speaking"** means your name in the Zoom meeting matched neither your Google name nor your Zoom profile name.
- **No Slack reply in a thread:** the `im:history` scope or the `message.im` event is missing, or the app wasn't reinstalled after adding them.

## Testing without accounts (developers)

A fake Google Calendar and a fake Zoom run inside the app in development. Start the dev server with:

```bash
LIVE_TEST=true LIVE_FAKE=true ZOOM_API_BASE=http://localhost:3000/api/dev/fake-zoom GOOGLE_CALENDAR_BASE=http://localhost:3000/api/dev/fake-google/calendar/v3 npm run dev
```

Then use these URLs:

| URL | What it does |
| --- | --- |
| `/api/dev/live-fake?do=setup` | Creates a signed-in test person ("You · Test Person" in the view switcher) |
| `/api/dev/live-fake?do=meeting&in=20&mins=1` | Adds a meeting starting in 20 seconds, with a meeting transcript and no recording. Add `&guest` to invite a colleague, `&recording_only` to have only a cloud recording, or `&nothing` for neither. |
| `/api/dev/live-fake?do=run` | Runs the live job now |
| `/api/dev/live-fake?do=answer&kind=live_notice&choice=off` | Presses a button on the latest message of that kind |
| `/api/dev/live-fake?do=coach&reply=…` | Presses "Talk it through", then replies in the thread |

Messages go to your real Slack test workspace when Slack is connected.

## Prototype shortcuts (STUB: BTS Studio engineering)

- **Tokens:** Google and Zoom tokens are stored unencrypted in the local SQLite database.
- **Attendee agreement:** Zoom's notice that the meeting is being transcribed stands in for each person agreeing to the companion itself.
- **Fetching transcripts:** the app polls Zoom every 2 minutes instead of using Zoom's webhooks.
- **Meeting transcript endpoint:** `GET /meetings/{uuid}/transcript` is newer and documented mostly in Zoom's developer forum. It needs the past meeting's instance UUID, encoded twice when it contains a slash. If Zoom changes it, the cloud-recording fallback still works.
- **Actions:** the actions you write are recorded as approved by Daniel. Normally they come from a coaching session.
- **Other providers:** there's no Teams or Outlook. Zoom Marketplace review and Google app verification would be needed before anyone outside your own accounts could use it.
