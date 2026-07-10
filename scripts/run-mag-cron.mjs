const baseUrl = process.env.RAMAGH_URL || "http://localhost:3001";
const secret = process.env.CRON_SECRET || process.env.NEXT_PUBLIC_ADMIN_CODE || "ramagh1404";
const backfillArg = process.argv.find((arg) => arg.startsWith("--backfill"));
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const url = new URL("/api/cron/mag", baseUrl);

url.searchParams.set("secret", secret);
if (backfillArg) {
  const [, value] = backfillArg.split("=");
  url.searchParams.set("backfill", value || "30");
}
if (dateArg) {
  url.searchParams.set("date", dateArg.slice("--date=".length));
}

const response = await fetch(url, { method: "POST" });
const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
