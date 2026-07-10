"use client";

import { Icon } from "./icons";
import { useLang } from "./LangProvider";
import { googleUrl, neshanUrl, type LatLng } from "@/lib/gyms";
import ContactMessageModal from "./ContactMessageModal";

/** Neshan brand mark — teal rounded tile with a white compass pin (approx). */
export function NeshanLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#00C2A8" />
      <path d="M12 5.5 15 12l-3 1.6L9 12z" fill="#ffffff" />
      <path d="M12 18.5 9 12l3 1.6 3-1.6z" fill="#ffffff" opacity="0.65" />
    </svg>
  );
}

/**
 * Directions + contact actions for a place (gym or store). The Neshan button opens
 * the Neshan app (or web) with a driving route; Call dials directly.
 */
export default function PlaceActions({
  place,
  userPos,
  size = "sm",
  source,
}: {
  place: {
    id?: string;
    name?: string;
    kind?: string;
    lat: number;
    lng: number;
    phone?: string | null;
    website?: string | null;
  };
  userPos?: LatLng | null;
  size?: "sm" | "md";
  source?: "gym" | "store" | "pharmacy" | "drugstore";
}) {
  const { t } = useLang();
  const pad = size === "md" ? "px-3 py-2 text-sm" : "px-2.5 py-1 text-[11px]";

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Neshan — branded, opens the app */}
      <a
        href={neshanUrl(place, userPos)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#00C2A8]/15 font-bold text-[#0fd7bb] ring-1 ring-[#00C2A8]/30 ${pad}`}
      >
        <NeshanLogo className={size === "md" ? "size-5" : "size-4"} /> {t("gym.route")}
      </a>

      {/* Direct call */}
      {place.phone && (
        <a
          href={`tel:${place.phone}`}
          dir="ltr"
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/15 font-bold text-emerald-300 ring-1 ring-emerald-500/25 ${pad}`}
        >
          <Icon name="phone" className="size-3.5" /> {t("gym.call")}
        </a>
      )}

      {/* Google Maps fallback */}
      <a
        href={googleUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 rounded-full bg-card2 font-bold text-muted ring-1 ring-line ${pad}`}
      >
        <Icon name="globe" className="size-3.5" /> {t("gym.gmaps")}
      </a>

      {place.website && (
        <a
          href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 rounded-full bg-card2 font-bold text-sky-300 ring-1 ring-line ${pad}`}
        >
          <Icon name="globe" className="size-3.5" /> {t("gym.site")}
        </a>
      )}

      <ContactMessageModal
        place={{
          source: source ?? (place.kind === "pharmacy" ? "pharmacy" : "gym"),
          id: place.id ?? null,
          name: place.name ?? null,
          phone: place.phone ?? null,
        }}
        size={size}
      />
    </div>
  );
}
