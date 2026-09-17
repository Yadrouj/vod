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
    await unlink(file).catch((unlinkError) => {
      if (unlinkError?.code !== "ENOENT") throw unlinkError;
    });
    await rename(temporary, file);
  }
}
