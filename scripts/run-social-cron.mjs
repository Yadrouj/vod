const baseUrl = process.env.RAMAGH_URL || "http://localhost:3001";
const secret = process.env.CRON_SECRET || process.env.NEXT_PUBLIC_ADMIN_CODE || "ramagh1404";
const url = new URL("/api/cron/social", baseUrl);

url.searchParams.set("secret", secret);
if (process.argv.includes("--force")) url.searchParams.set("force", "1");
if (process.argv.includes("--seed")) url.searchParams.set("seed", "1");

const response = await fetch(url, { method: "POST" });
const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
