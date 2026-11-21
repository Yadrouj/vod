// Minimal S3 (MinIO) client: AWS Signature V4, path-style, no dependencies.
// Shared by the /media/tmdb route and scripts/mirror-tmdb-images.mjs.
import { createHash, createHmac } from "node:crypto";

const sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

function encodeKey(key) {
  return key.split("/").map(part => encodeURIComponent(part).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
}

/**
 * @param {{ endpoint: string, accessKey: string, secretKey: string, region?: string }} config
 * @param {{ method: string, bucket: string, key?: string, query?: string, body?: Uint8Array | string, headers?: Record<string, string>, signal?: AbortSignal }} request
 */
export async function s3Request(config, { method, bucket, key = "", query = "", body, headers = {}, signal }) {
  const endpoint = new URL(config.endpoint);
  const region = config.region || "us-east-1";
  const path = `/${bucket}${key ? `/${encodeKey(key)}` : ""}`;
  const payload = body === undefined ? "" : body;
  const payloadHash = sha256Hex(payload);
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const host = endpoint.host;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, path, query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${day}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.secretKey}`, day), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return fetch(`${endpoint.origin}${path}${query ? `?${query}` : ""}`, {
    method,
    body: body === undefined ? undefined : payload,
    signal,
    headers: {
      ...headers,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  });
}

export function s3PutObject(config, bucket, key, bytes, contentType, signal) {
  return s3Request(config, {
    method: "PUT", bucket, key, body: bytes, signal,
    headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
}

/** Creates the bucket when missing and makes its objects anonymously readable. */
export async function s3EnsurePublicBucket(config, bucket) {
  const created = await s3Request(config, { method: "PUT", bucket });
  if (!created.ok && created.status !== 409) throw new Error(`create bucket ${bucket}: HTTP ${created.status} ${await created.text()}`);
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/*`] }],
  });
  const applied = await s3Request(config, { method: "PUT", bucket, query: "policy=", body: policy, headers: { "content-type": "application/json" } });
  if (!applied.ok) throw new Error(`set public policy on ${bucket}: HTTP ${applied.status} ${await applied.text()}`);
}

/** Anonymous object URL; works because the bucket policy allows public reads. */
export function s3PublicUrl(endpoint, bucket, key) {
  return `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeKey(key)}`;
}
