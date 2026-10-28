/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // src/instrumentation.ts starts the Slack app and the nudge scheduler.
    instrumentationHook: true,
    // Transcript uploads go through a server action.
    serverActions: { bodySizeLimit: '11mb' },
    // Loaded by Node at runtime, not bundled: pdf.js loads its worker from node_modules.
    serverComponentsExternalPackages: ['pdfjs-dist', '@slack/bolt', 'node-cron'],
  },
};

export default nextConfig;
