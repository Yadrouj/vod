import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

export async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(value));
  try {
    await rename(temporary, file);
  } catch (error) {
    // Windows does not replace an existing destination with rename(). The
    // writers are serialized by their callers, so removing the old snapshot
    // is safe and lets the next rename complete instead of killing a scraper.
    if (process.platform !== "win32" || !["EPERM", "EEXIST", "ENOTEMPTY"].includes(error?.code)) throw error;
    await unlinkWithRetry(file);
    await rename(temporary, file);
  }
}

async function unlinkWithRetry(file) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await unlink(file);
      return;
    } catch (error) {
      if (error?.code === "ENOENT") return;
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 125));
    }
  }
  throw lastError;
}
