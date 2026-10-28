// Next.js calls register() once when the server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCompanion } = await import('./lib/companion/runtime');
    await startCompanion();
  }
}
