export type ParsedSubtitleCue = {
  startTime: number;
  endTime: number;
  text: string;
};

const MAX_CUE_DURATION = 60 * 60;

export function decodeSubtitleBytes(bytes: Uint8Array) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(Math.max(0, bytes.length - 2));
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      swapped[index - 2] = bytes[index + 1];
      swapped[index - 1] = bytes[index];
    }
    return new TextDecoder("utf-16le").decode(swapped);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1256").decode(bytes);
    } catch {
      return new TextDecoder().decode(bytes);
    }
  }
}

export function normalizeSubtitleToVtt(input: string, fileName = "subtitle.srt") {
  const cues = parseSubtitleCues(input, fileName);
  if (!cues.length) throw new Error("No readable subtitle cues were found.");
  return cuesToVtt(cues);
}

export function parseSubtitleCues(input: string, fileName = "") {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const lowerName = fileName.toLowerCase();
  if (/^\s*WEBVTT/i.test(text) || lowerName.endsWith(".vtt")) return parseWebVtt(text);
  if (/^\s*\[Script Info\]/i.test(text) || /\n\s*Dialogue\s*:/i.test(text) || /\.ass$|\.ssa$/i.test(lowerName)) return parseAss(text);
  return parseSrt(text);
}

export function cuesToVtt(cues: ParsedSubtitleCue[], offsetSeconds = 0) {
  const body = cues
    .map((cue, index) => {
      const start = Math.max(0, cue.startTime + offsetSeconds);
      const end = Math.max(start + 0.05, cue.endTime + offsetSeconds);
      return `${index + 1}\n${formatVttTime(start)} --> ${formatVttTime(end)}\n${sanitizeCueText(cue.text)}`;
    })
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

function parseSrt(text: string) {
  const cues: ParsedSubtitleCue[] = [];
  const blocks = text.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const timing = parseTimingLine(lines[timingIndex]);
    if (!timing) continue;
    const cueText = lines.slice(timingIndex + 1).join("\n").trim();
    if (cueText) cues.push({ ...timing, text: cueText });
  }
  return validCues(cues);
}

function parseWebVtt(text: string) {
  const withoutHeader = text.replace(/^\s*WEBVTT[^\n]*\n/i, "");
  const cues: ParsedSubtitleCue[] = [];
  for (const block of withoutHeader.split(/\n{2,}/)) {
    if (/^\s*(NOTE|STYLE|REGION)(\s|$)/i.test(block)) continue;
    const lines = block.split("\n").map((line) => line.trimEnd());
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const timing = parseTimingLine(lines[timingIndex]);
    if (!timing) continue;
    const cueText = lines.slice(timingIndex + 1).join("\n").trim();
    if (cueText) cues.push({ ...timing, text: cueText });
  }
  return validCues(cues);
}

function parseAss(text: string) {
  const cues: ParsedSubtitleCue[] = [];
  let fields = ["layer", "start", "end", "style", "name", "marginl", "marginr", "marginv", "effect", "text"];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (/^Format\s*:/i.test(line)) {
      fields = line.slice(line.indexOf(":") + 1).split(",").map((field) => field.trim().toLowerCase());
      continue;
    }
    if (!/^Dialogue\s*:/i.test(line)) continue;
    const values = splitLimited(line.slice(line.indexOf(":") + 1), fields.length);
    const record = Object.fromEntries(fields.map((field, index) => [field, values[index] ?? ""]));
    const startTime = parseTimestamp(record.start);
    const endTime = parseTimestamp(record.end);
    const cueText = record.text.replace(/\\N/gi, "\n").replace(/\\h/gi, " ").replace(/\{[^}]*\}/g, "").trim();
    if (startTime !== null && endTime !== null && cueText) cues.push({ startTime, endTime, text: cueText });
  }
  return validCues(cues);
}

function parseTimingLine(value: string) {
  const [startRaw, endRaw = ""] = value.split("-->");
  const startTime = parseTimestamp(startRaw.trim());
  const endTime = parseTimestamp(endRaw.trim().split(/\s+/)[0]);
  return startTime === null || endTime === null ? null : { startTime, endTime };
}

function parseTimestamp(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length ? Number(parts.pop()) : 0;
  if (![seconds, minutes, hours].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatVttTime(value: number) {
  const milliseconds = Math.max(0, Math.round(value * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

function validCues(cues: ParsedSubtitleCue[]) {
  return cues
    .filter((cue) => Number.isFinite(cue.startTime) && Number.isFinite(cue.endTime) && cue.startTime >= 0 && cue.endTime > cue.startTime && cue.endTime - cue.startTime <= MAX_CUE_DURATION)
    .sort((left, right) => left.startTime - right.startTime)
    .slice(0, 20_000);
}

function sanitizeCueText(value: string) {
  return value
    .replace(/<\/?(?!b\b|i\b|u\b|c(?:\.[^ >]+)?\b|v\b|ruby\b|rt\b)[^>]*>/gi, "")
    .replace(/\{\\[^}]+\}/g, "")
    .trim();
}

function splitLimited(value: string, count: number) {
  const parts: string[] = [];
  let cursor = 0;
  for (let index = 1; index < count; index += 1) {
    const comma = value.indexOf(",", cursor);
    if (comma < 0) break;
    parts.push(value.slice(cursor, comma));
    cursor = comma + 1;
  }
  parts.push(value.slice(cursor));
  return parts;
}
