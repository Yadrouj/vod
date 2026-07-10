"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, PageHeader, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import {
  markVipReceiptSent,
  VIP_CARD_NAME,
  VIP_CARD_NUMBER,
  VIP_PLAN_PRICE_TOMAN,
  VIP_TELEGRAM_USERNAME,
} from "@/lib/db";
import { authHeaders, syncCurrentUser } from "@/lib/authClient";
import { useAccount, useSubscription } from "@/lib/hooks";

export default function UpgradePage() {
  const { lang, n } = useLang();
  const router = useRouter();
  const account = useAccount();
  const subscription = useSubscription();
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [now] = useState(() => Date.now());

  if (subscription === undefined || account === undefined) return <Spinner />;

  const fa = lang === "fa";
  const telegramUrl = `https://t.me/${VIP_TELEGRAM_USERNAME}`;
  const active =
    subscription?.status === "vip" &&
    typeof subscription.vipUntil === "number" &&
    subscription.vipUntil > now;

  async function copy(label: string, value: string) {
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function sentReceipt() {
    if (!account?.token) {
      router.push("/login?next=/upgrade");
      return;
    }
    const res = await fetch("/api/vip/receipt", {
      method: "POST",
      headers: await authHeaders(),
    });
    if (res.ok) {
      await syncCurrentUser();
    } else {
      await markVipReceiptSent();
    }
    setSaved(true);
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <PageHeader
        title={fa ? "ارتقای VIP" : "Upgrade to VIP"}
        subtitle={
          fa
            ? "برای قابلیت‌های هوشمند پیشرفته مثل آنالیز بدن با AI."
            : "For advanced AI features like body analysis."
        }
      />

      <div className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-line">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold text-ink">
              {fa ? "پلن VIP ماهانه" : "Monthly VIP plan"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {fa
                ? "دسترسی به آنالیز بدن با هوش مصنوعی و ظرفیت بیشتر برای مربی هوشمند."
                : "AI body analysis and more AI coach capacity."}
            </p>
          </div>
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-extrabold text-brandink">
            VIP
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-base2 p-4 ring-1 ring-line">
          <p className="text-xs font-bold text-faint">{fa ? "مبلغ ماهانه" : "Monthly price"}</p>
          <p className="tnum mt-1 text-2xl font-black text-brand" dir="ltr">
            {n(VIP_PLAN_PRICE_TOMAN.toLocaleString("en-US"))} {fa ? "تومان" : "Toman"}
          </p>
        </div>

        <div className="mt-3 space-y-2">
          <PayRow
            label={fa ? "شماره کارت بلو" : "Blu card number"}
            value={VIP_CARD_NUMBER}
            onCopy={() => copy("card", VIP_CARD_NUMBER)}
            copied={copied === "card"}
          />
          <PayRow
            label={fa ? "نام صاحب کارت" : "Card holder"}
            value={VIP_CARD_NAME}
            onCopy={() => copy("name", VIP_CARD_NAME)}
            copied={copied === "name"}
          />
          <PayRow
            label={fa ? "ارسال رسید در تلگرام" : "Send receipt on Telegram"}
            value={`@${VIP_TELEGRAM_USERNAME}`}
            href={telegramUrl}
            onCopy={() => copy("telegram", VIP_TELEGRAM_USERNAME)}
            copied={copied === "telegram"}
          />
        </div>

        <div className="mt-4 rounded-2xl bg-brand/10 p-4 text-sm leading-relaxed text-ink ring-1 ring-brand/25">
          {fa
            ? `بعد از واریز، تصویر رسید را در تلگرام برای @${VIP_TELEGRAM_USERNAME} بفرست. بعد از تأیید، VIP ماهانه فعال می‌شود.`
            : `After payment, send the receipt image to @${VIP_TELEGRAM_USERNAME} on Telegram. VIP is activated after confirmation.`}
        </div>

        {active ? (
          <p className="mt-4 rounded-2xl bg-success-dim p-3 text-center text-sm font-bold text-success ring-1 ring-success/25">
            {fa ? "VIP فعال است." : "VIP is active."}
          </p>
        ) : (
          <Button className="mt-4 w-full" onClick={sentReceipt}>
            <Icon name="telegram" className="size-4" />
            {saved || subscription?.status === "pending"
              ? fa
                ? "رسید ثبت شد؛ منتظر تأیید"
                : "Receipt noted; waiting for confirmation"
              : fa
              ? "رسید را ارسال کردم"
              : "I sent the receipt"}
          </Button>
        )}
      </div>

      <Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand">
        <Icon name="chevronLeft" className="size-4 flip-rtl" />
        {fa ? "بازگشت به پروفایل" : "Back to profile"}
      </Link>
    </div>
  );
}

function PayRow({
  label,
  value,
  href,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  href?: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const content = (
    <span className="tnum min-w-0 flex-1 truncate text-sm font-extrabold text-ink" dir="ltr">
      {value}
    </span>
  );

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card2 p-3 ring-1 ring-line">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-faint">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex">
            {content}
          </a>
        ) : (
          <div className="mt-0.5 flex">{content}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-9 items-center gap-1 rounded-xl bg-base2 px-3 text-xs font-bold text-brand ring-1 ring-line"
      >
        <Icon name={copied ? "check" : "library"} className="size-3.5" />
        {copied ? "OK" : "Copy"}
      </button>
    </div>
  );
}
