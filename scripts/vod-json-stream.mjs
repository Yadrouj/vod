import { createReadStream } from "node:fs";

function archiveMetaFromPrefix(prefix) {
  const normalized = `${prefix.replace(/,\s*$/, "")}}`;
  return JSON.parse(normalized);
}

/**
 * Iterates a VOD archive's `items` array without ever materialising the whole
 * catalog as a JavaScript string. A full provider archive can be >512 MB,
 * which is beyond Node's maximum string length on some platforms.
 */
export async function streamVodArchiveItems(file, onItem, options = {}) {
  const stream = createReadStream(file, { encoding: "utf8" });
  let header = "";
  let metadata = null;
  let itemText = "";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for await (const chunk of stream) {
    for (let index = 0; index < chunk.length; index += 1) {
      const character = chunk[index];

      if (!metadata) {
        header += character;
        const itemsMatch = header.match(/"items"\s*:\s*\[$/);
        if (!itemsMatch) continue;
        metadata = archiveMetaFromPrefix(header.slice(0, itemsMatch.index));
        await options.onMetadata?.(metadata);
        header = "";
        continue;
      }

      if (!itemText) {
        if (character !== "{") continue;
        itemText = character;
        depth = 1;
        inString = false;
        escaped = false;
        continue;
      }

      itemText += character;
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }

      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") depth -= 1;

      if (depth === 0) {
        const item = JSON.parse(itemText);
        itemText = "";
        await onItem(item);
      }
    }
  }

  if (!metadata) throw new Error(`Could not find an items array in ${file}.`);
  if (itemText) throw new Error(`The items array in ${file} ended before a title was complete.`);
  return metadata;
}
