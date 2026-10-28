// Builds the Teams app package (manifest.json and two icons in a .zip) to upload to Teams.
// Run from the repo folder:  node --env-file=.env teams/make-package.mjs
// Needs TEAMS_CLIENT_ID (the bot's app ID). Writes teams/build/coaching-companion.zip.

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const botId = process.env.TEAMS_CLIENT_ID || process.env.CLIENT_ID;
if (!botId) {
  console.error('TEAMS_CLIENT_ID is empty. Add the bot app ID to .env first (see teams/README.md).');
  process.exit(1);
}
const appUrl = process.env.APP_URL || 'http://localhost:3000';
const out = join('teams', 'build');

// A minimal PNG writer, so the icons need no image tools.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function png(size, pixel) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) Buffer.from(pixel(x, y, size)).copy(row, 1 + x * 4);
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}
// A ring: the companion's mark. Colour icon on the app's dark background; outline icon white on transparent.
const inRing = (x, y, size) => {
  const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / size;
  return r > 0.22 && r < 0.34;
};
const color = png(192, (x, y, s) => (inRing(x, y, s) ? [255, 255, 255, 255] : [36, 40, 43, 255]));
const outline = png(32, (x, y, s) => (inRing(x, y, s) ? [255, 255, 255, 255] : [0, 0, 0, 0]));

const manifest = {
  $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.19/MicrosoftTeams.schema.json',
  manifestVersion: '1.19',
  version: '0.1.0',
  id: botId,
  developer: {
    name: 'BTS (prototype)',
    websiteUrl: appUrl.startsWith('https://') ? appUrl : 'https://www.bts.com',
    privacyUrl: 'https://www.bts.com/privacy-policy',
    termsOfUseUrl: 'https://www.bts.com',
  },
  name: { short: 'Coaching companion', full: 'Coaching companion (prototype)' },
  description: {
    short: 'AI coaching companion prototype with synthetic data.',
    full: 'Helps you keep the actions you agree with your coach: recaps, check-ins and feedback from linked work meetings. Prototype with synthetic data only.',
  },
  icons: { color: 'color.png', outline: 'outline.png' },
  accentColor: '#24282B',
  bots: [{ botId, scopes: ['personal'], supportsFiles: false, isNotificationOnly: false }],
  permissions: ['identity'],
  validDomains: [],
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(join(out, 'color.png'), color);
writeFileSync(join(out, 'outline.png'), outline);
execFileSync('zip', ['-j', '-q', join(out, 'coaching-companion.zip'), join(out, 'manifest.json'), join(out, 'color.png'), join(out, 'outline.png')]);
console.log(`Wrote ${join(out, 'coaching-companion.zip')}. Upload it in Teams: Apps → Manage your apps → Upload an app.`);
