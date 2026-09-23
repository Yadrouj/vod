"use client";
import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./title-feedback.module.css";

export function TitleFeedback({ itemId, locale }: { itemId: string; locale: Locale }) {
  const [vote, setVote] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const fa = locale === "fa";
  return <form method="post" className={styles.feedback} dir={fa ? "rtl" : "ltr"} onSubmit={async event => {
    event.preventDefault(); if (!vote || state === "saving") return;
    setState("saving");
    try { const response = await fetch("/api/discovery/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, vote, comment }) }); if (!response.ok) throw Error(); setState("saved"); }
    catch { setState("error"); }
  }}>
    <div><strong>{fa ? "این عنوان را پیشنهاد می‌کنید؟" : "Would you recommend this title?"}</strong><p>{fa ? "نظر شما به پیشنهادهای سرونما کمک می‌کند. متن نظر عمومی نمایش داده نمی‌شود." : "Help shape SarvNema recommendations. Your comment is not published."}</p></div>
    <div className={styles.votes}><button type="button" disabled={state === "saving"} aria-pressed={vote === 1} onClick={() => { setVote(1); setState("idle"); }}><ThumbsUp size={18} />{fa ? "بله" : "Yes"}</button><button type="button" disabled={state === "saving"} aria-pressed={vote === -1} onClick={() => { setVote(-1); setState("idle"); }}><ThumbsDown size={18} />{fa ? "نه چندان" : "Not really"}</button></div>
    {vote && state !== "saved" && <><label>{fa ? "نظرتان (اختیاری)" : "Your comment (optional)"}<textarea value={comment} maxLength={500} rows={2} onChange={event => setComment(event.target.value)} /></label><button disabled={state === "saving"} type="submit">{state === "saving" ? (fa ? "در حال ثبت…" : "Saving…") : (fa ? "ثبت نظر" : "Send feedback")}</button></>}
    <span role="status">{state === "saved" ? (fa ? "ممنون، نظرتان ثبت شد." : "Thanks, your feedback is saved.") : state === "error" ? (fa ? "ثبت نشد؛ کمی بعد دوباره تلاش کنید." : "Could not save. Please try again shortly.") : ""}</span>
  </form>;
}
