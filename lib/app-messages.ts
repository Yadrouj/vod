"use client";

export type AppMessageTone = "info" | "success" | "warning" | "error";

export type AppToastMessage = {
  title: string;
  message?: string;
  tone?: AppMessageTone;
  duration?: number;
};

export type AppConfirmation = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AppMessageTone;
};

export const APP_TOAST_EVENT = "sarvnema:toast";
export const APP_CONFIRM_EVENT = "sarvnema:confirm";

export function showAppMessage(message: AppToastMessage) {
  window.dispatchEvent(new CustomEvent(APP_TOAST_EVENT, { detail: message }));
}

export function askAppConfirmation(confirmation: AppConfirmation) {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent(APP_CONFIRM_EVENT, {
      detail: { ...confirmation, resolve },
    }));
  });
}
