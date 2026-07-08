// Tehran stores (pharmacies, supplement shops, sports shops, medical supply).
// The dataset + loader live in lib/gyms.ts (Store shares the gym record shape,
// so the map/list/profile components are reused as-is).

import type { StoreKind } from "@/lib/gyms";
import type { IconName } from "@/components/icons";

/** Filter order for the store kind chips. */
export const STORE_KINDS: StoreKind[] = ["pharmacy", "supplement", "sports", "medical"];

/** Icon glyph for a store kind (used by list rows). */
export function storeKindIcon(kind: StoreKind): IconName {
  return kind === "sports" ? "store" : "pill";
}
