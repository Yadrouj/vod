"use client";

import { useEffect, useState } from "react";
import { BrandLoader } from "@/components/brand-loader";

export function HomeLoadingOverlay({ label }: { label: string }) {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const closeTimer = window.setTimeout(() => setClosing(true), 900);
    const removeTimer = window.setTimeout(() => setVisible(false), 1220);
    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={["home-loading-overlay", closing ? "is-closing" : ""].filter(Boolean).join(" ")} aria-hidden={closing}>
      <BrandLoader label={label} />
      <div className="loader-preview-row" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}
