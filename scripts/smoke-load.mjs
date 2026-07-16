import { performance } from "node:perf_hooks";

const baseUrl = (process.argv[2] || process.env.LOAD_BASE_URL || "http://127.0.0.1:3004").replace(/\/$/, "");
const totalRequests = positiveInteger(process.argv[3] || process.env.LOAD_REQUESTS, 120);
const concurrency = Math.min(100, positiveInteger(process.argv[4] || process.env.LOAD_CONCURRENCY, 12));
const timeoutMs = positiveInteger(process.env.LOAD_TIMEOUT_MS, 15_000);

const paths = [
  "/",
  "/api/suggest?q=breaking",
  "/api/ai-search?q=dark%20crime%20series%20above%208",
  "/tt0903747",
];

const queue = Array.from({ length: totalRequests }, (_, index) => paths[index % paths.length]);
const latencies = [];
const statuses = new Map();
let failed = 0;
let cursor = 0;

console.log(`SarvNema smoke load: ${totalRequests} requests, concurrency ${concurrency}, target ${baseUrl}`);
const suiteStartedAt = performance.now();

await Promise.all(Array.from({ length: concurrency }, async () => {
  while (true) {
    const requestIndex = cursor++;
    if (requestIndex >= queue.length) return;
    const path = queue[requestIndex];
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { accept: path.startsWith("/api/") ? "application/json" : "text/html" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      // Consume the body so keep-alive behavior and response transfer are measured.
      await response.arrayBuffer();
      latencies.push(performance.now() - startedAt);
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      if (!response.ok) failed += 1;
    } catch (error) {
      failed += 1;
      statuses.set("network-error", (statuses.get("network-error") ?? 0) + 1);
      console.error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}));

latencies.sort((a, b) => a - b);
const elapsedMs = performance.now() - suiteStartedAt;
const result = {
  target: baseUrl,
  requests: totalRequests,
  concurrency,
  failed,
  statuses: Object.fromEntries(statuses),
  requestsPerSecond: round(totalRequests / (elapsedMs / 1000)),
  latencyMs: {
    min: round(latencies[0] ?? 0),
    p50: round(percentile(latencies, 0.5)),
    p95: round(percentile(latencies, 0.95)),
    p99: round(percentile(latencies, 0.99)),
    max: round(latencies.at(-1) ?? 0),
  },
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = failed ? 1 : 0;

function percentile(values, ratio) {
  if (!values.length) return 0;
  return values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1))];
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function round(value) {
  return Math.round(value * 10) / 10;
}
