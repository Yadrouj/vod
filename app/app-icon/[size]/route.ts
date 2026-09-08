import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";
const images = new Map<number, Promise<Buffer>>();

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (size !== 192 && size !== 512) return new Response(null, { status: 404 });
  let image = images.get(size);
  if (!image) {
    // Existing vector brand, padded to remain inside the maskable safe area.
    image = readFile(path.join(process.cwd(), "public/brand/sarvnema-mark.svg")).then(svg =>
      sharp(svg).resize(Math.round(size * .65)).extend({ top: Math.floor(size * .175), bottom: size - Math.round(size * .65) - Math.floor(size * .175), left: Math.floor(size * .175), right: size - Math.round(size * .65) - Math.floor(size * .175), background: "#14130f" }).flatten({ background: "#14130f" }).png().toBuffer());
    images.set(size, image);
    image.catch(() => images.delete(size));
  }
  return new Response(new Uint8Array(await image), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
