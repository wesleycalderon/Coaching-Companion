# Connecting the Microsoft Teams app

The web app works without Teams: every companion message also appears in the simulated chat
(`/preview/teams-companion-recap`, Elena Duarte at Halden, who uses Teams first). Connect Teams
to get the same messages as cards in real Teams, with working buttons. Use a test tenant; the
prototype holds synthetic data only.

How it works: Teams posts to `/api/messages` on this server, the same port as the web app
(3000). The bot code is in `src/lib/companion/teams.ts` and renders from the same view model as
Slack. Teams-first coachees' messages go to whoever last installed or messaged the bot (you),
since the seeded coachees have no Teams accounts.

## Option A: Agents Playground (no Microsoft account needed)

Microsoft 365 Agents Playground is Microsoft's local Teams emulator. It shows the cards and the
buttons work, without a tenant, tunnel or app registration.

1. In `.env`, set `TEAMS_ENABLED="true"` and leave the credentials empty. Restart `npm run dev`.
   The log shows `[teams] listening on /api/messages (Agents Playground mode …)`.
2. In a second terminal, start the Playground:

   ```
   npx -y @microsoft/m365agentsplayground@0.2.29 -e http://localhost:3000/api/messages -c msteams
   ```

   It opens at http://localhost:56150.
3. Send the bot any message, such as "hi". It answers and remembers the chat.
4. Open http://localhost:3000/preview/teams-companion-recap. The banner says "Connected to
   Teams". Under **Prototype controls**, pick a message and press **Send now**: it appears in
   the Playground as a card.

Without credentials the bot accepts only requests made on this computer, never through a
tunnel.

## Option B: real Teams

You need a Microsoft 365 tenant where you can upload custom apps (a developer sandbox or a test
tenant where you're an admin; most company tenants block this).

1. **Install Microsoft's tools.** Dev Tunnels gives Teams a public HTTPS address for your laptop;
   the Teams CLI registers the bot.

   ```
   curl -sL https://aka.ms/DevTunnelCliInstall | bash
   npm install -g @microsoft/teams.cli
   ```

   (With Homebrew: `brew install devtunnel`.)
2. **Sign in and check custom app upload.** `teams login`, then `teams status`. It must say
   `Sideloading: enabled`; if not, the tenant admin turns on custom app upload in the Teams
   admin center (Teams apps → Setup policies → Global → Upload custom apps). It can take up to
   a day to apply.
3. **Create the tunnel** (once; it keeps the same address):

   ```
   devtunnel user login
   devtunnel create coaching-companion --allow-anonymous
   devtunnel port create coaching-companion -p 3000 --protocol http
   devtunnel host coaching-companion
   ```

   Keep it running. It prints a URL like `https://coaching-companion-3000.usw2.devtunnels.ms`.
4. **Register the bot**, from the repo folder in another terminal, with that URL:

   ```
   teams app create --name "Coaching companion" --endpoint https://<tunnel-host>/api/messages --env .env.teams
   ```

   It writes `CLIENT_ID`, `CLIENT_SECRET` and `TENANT_ID` to `.env.teams` and prints an
   **Install in Teams** link. Copy the three values into `.env` as `TEAMS_CLIENT_ID`,
   `TEAMS_CLIENT_SECRET` and `TEAMS_TENANT_ID` (never paste them into chat or git), then delete
   `.env.teams`.
5. **Restart `npm run dev`.** The log shows `[teams] listening on /api/messages` without
   "Playground mode".
6. **Install the app**: open the **Install in Teams** link, choose **Add**, and send the bot
   "hi". (Lost the link? `teams app list`, then `teams app get <id> --install-link`.)
7. Send a message from `/preview/teams-companion-recap` as in option A. It arrives in Teams.

If you'd rather register the bot in the Teams Developer Portal (dev.teams.microsoft.com → Tools
→ Bot management), put its values in `.env` and build the app package with
`node --env-file=.env teams/make-package.mjs`, then upload `teams/build/coaching-companion.zip`
in Teams (Apps → Manage your apps → Upload an app).

When you're done testing, stop `devtunnel host` (Ctrl+C), or delete the tunnel with
`devtunnel delete coaching-companion`.

## What's stubbed

- Every Teams-first coachee's messages go to one person (whoever last messaged the bot).
  Production installs the app for each coachee across the tenant and stores each person's chat.
- Answers given in the web app don't redraw cards already in Teams (answers given in Teams
  redraw the card straight away).
- Links in cards point at `APP_URL` (localhost), so they open only on this computer.
