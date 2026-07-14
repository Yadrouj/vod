export async function GET() {
  return Response.json({ botUsername: (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "") || null });
}
