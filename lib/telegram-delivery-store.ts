import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type DeliveryTicket = { id: string; expires: number; chatId: number; title: string; quality: string; caption: string; sourceUrl: string };
export type DeliveryState = { status: "waiting" | "queued" | "sending" | "sent" | "failed"; readyAt: number; error?: string };
export const DELIVERY_WAIT_MS = 5000;
const LEASE_MS = 25 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const validId = (id: string) => /^[a-f0-9]{32}$/.test(id);
const exists = async (file: string) => stat(file).then(() => true, () => false);

/** Persistent, single-consumer claims. A timed-out upload is NEVER automatically resent. */
export class DeliveryStore {
  constructor(private root = process.env.TELEGRAM_DELIVERY_DIR || path.join(process.cwd(), "data", "telegram-deliveries")) {}
  private dir(id: string) { if (!validId(id)) throw new Error("Invalid delivery id"); return path.join(this.root, id); }
  async begin(ticket: DeliveryTicket, now = Date.now()): Promise<DeliveryState> {
    await mkdir(this.root, { recursive: true });
    // Bound disk use, and cap one recipient's outstanding tickets without trusting the browser.
    const ids = (await readdir(this.root)).filter(validId);
    if (!(await exists(this.dir(ticket.id)))) {
      if (ids.length >= 500) throw new Error("Delivery queue is busy");
      let pending = 0;
      for (const id of ids) {
        const job = await this.job(id);
        if (job?.chatId === ticket.chatId && job.expires > now && !(await exists(path.join(this.dir(id), "result.json")))) pending++;
      }
      if (pending >= 3) throw new Error("Please finish your previous deliveries first");
    }
    const dir = this.dir(ticket.id);
    await mkdir(dir, { recursive: true });
    try { await writeFile(path.join(dir, "job.json"), JSON.stringify({ ...ticket, readyAt: now + DELIVERY_WAIT_MS }), { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    return this.state(ticket.id);
  }
  private async job(id: string): Promise<(DeliveryTicket & { readyAt: number }) | null> {
    try { return JSON.parse(await readFile(path.join(this.dir(id), "job.json"), "utf8")); } catch { return null; }
  }
  async state(id: string): Promise<DeliveryState> {
    const dir = this.dir(id), job = await this.job(id);
    if (!job) throw new Error("Open the waiting page first");
    try { return { readyAt: job.readyAt, ...JSON.parse(await readFile(path.join(dir, "result.json"), "utf8")) }; } catch {}
    if (await exists(path.join(dir, "active"))) return { status: "sending", readyAt: job.readyAt };
    return { status: await exists(path.join(dir, "queued")) ? "queued" : "waiting", readyAt: job.readyAt };
  }
  async enqueue(id: string, now = Date.now()) {
    const state = await this.state(id);
    if (state.status !== "waiting") return state;
    const job = await this.job(id);
    if (!job || now < state.readyAt || now >= job.expires) throw new Error("The waiting period has not finished or the link has expired");
    try { await writeFile(path.join(this.dir(id), "queued"), "", { flag: "wx" }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    return this.state(id);
  }
  async claim(now = Date.now()) {
    await mkdir(this.root, { recursive: true });
    const ids = (await readdir(this.root)).filter(validId);
    for (const id of ids) {
      const dir = this.dir(id), job = await this.job(id);
      if (!job) continue;
      const active = await stat(path.join(dir, "active")).catch(() => null);
      if (active && now - active.mtimeMs > LEASE_MS) await this.finish(id, "delivery_unknown");
      if (now > job.expires + RETENTION_MS) { await rm(dir, { recursive: true, force: true }); continue; }
      if (now > job.expires || active || await exists(path.join(dir, "result.json"))) continue;
      // Exclusive claim file, not rename(overwrite), prevents two workers from sending twice.
      if (!(await exists(path.join(dir, "queued")))) continue;
      try { await writeFile(path.join(dir, "active"), "", { flag: "wx" }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") continue; throw error; }
      return job;
    }
    return null;
  }
  async finish(id: string, error?: string) {
    if (!(await exists(path.join(this.dir(id), "active")))) throw new Error("Delivery has not been claimed");
    const allowed = ["file_too_large", "source_unavailable", "upload_failed", "delivery_unknown"];
    const result = { status: error ? "failed" : "sent", ...(error ? { error: allowed.includes(error) ? error : "upload_failed" } : {}) };
    // Atomic publication. The worker may retry acknowledging, but never re-upload the file.
    const temporary = path.join(this.dir(id), "result.tmp");
    await writeFile(temporary, JSON.stringify(result), { mode: 0o600 });
    await rename(temporary, path.join(this.dir(id), "result.json"));
    return result;
  }
}
export const deliveryStore = new DeliveryStore();
