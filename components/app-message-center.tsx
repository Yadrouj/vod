"use client";

import { Check, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  APP_CONFIRM_EVENT,
  APP_TOAST_EVENT,
  type AppConfirmation,
  type AppMessageTone,
  type AppToastMessage,
} from "@/lib/app-messages";

type Toast = AppToastMessage & { id: string };
type Confirmation = AppConfirmation & { resolve: (value: boolean) => void };

export function AppMessageCenter() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<AppToastMessage>).detail;
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-2), { ...detail, id }]);
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), detail.duration ?? 4_200);
    };
    const onConfirm = (event: Event) => {
      setConfirmation((event as CustomEvent<Confirmation>).detail);
    };
    window.addEventListener(APP_TOAST_EVENT, onToast);
    window.addEventListener(APP_CONFIRM_EVENT, onConfirm);
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, onToast);
      window.removeEventListener(APP_CONFIRM_EVENT, onConfirm);
    };
  }, []);

  function answer(value: boolean) {
    confirmation?.resolve(value);
    setConfirmation(null);
  }

  return (
    <>
      <div className="app-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <article className={`app-toast app-toast-${toast.tone ?? "info"}`} key={toast.id}>
            <span className="app-toast-icon">{toneIcon(toast.tone)}</span>
            <div><strong>{toast.title}</strong>{toast.message && <p>{toast.message}</p>}</div>
            <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Close message"><X size={16} /></button>
          </article>
        ))}
      </div>

      {confirmation && (
        <div className="app-confirm-backdrop" role="presentation" onClick={() => answer(false)}>
          <section className={`app-confirm app-confirm-${confirmation.tone ?? "warning"}`} role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-title" onClick={(event) => event.stopPropagation()}>
            <span className="app-confirm-icon">{toneIcon(confirmation.tone)}</span>
            <div>
              <h2 id="app-confirm-title">{confirmation.title}</h2>
              <p>{confirmation.message}</p>
            </div>
            <div className="app-confirm-actions">
              <button type="button" className="play-glow" onClick={() => answer(true)}>{confirmation.confirmLabel ?? "Continue"}</button>
              <button type="button" className="hover-button" onClick={() => answer(false)}>{confirmation.cancelLabel ?? "Cancel"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function toneIcon(tone: AppMessageTone = "info") {
  if (tone === "success") return <Check size={19} />;
  if (tone === "warning") return <TriangleAlert size={19} />;
  if (tone === "error") return <OctagonAlert size={19} />;
  return <Info size={19} />;
}
