import { loadReleaseUpdates } from "@/lib/release-updates";
import { landingPulse } from "@/lib/landing-pulse";

export async function GET() {
  return Response.json(landingPulse(await loadReleaseUpdates()), {
    headers: { "Cache-Control": "public, max-age=20, s-maxage=30" },
  });
}
