import { mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";

export async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(value));
  await rename(temporary, file);
}
