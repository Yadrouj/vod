"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { useDietProfile, useProgram, useSettings, gateAction } from "@/lib/hooks";
import { macroTargets } from "@/lib/nutrition";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// Staged quick replies — the user can run the whole conversation without typing.
// start: opening intents · intake: canned answers to the coach's health questions ·
// followup: deepen/extend after an answer.
const QUICK: Record<"fa" | "en", { start: string[]; intake: string[]; followup: string[] }> = {
  fa: {
    start: [
      "برنامه تمرین می‌خوام 🏋️",
      "رژیم غذایی می‌خوام 🍽️",
      "هدفم کاهش وزنه ⚖️",
      "هدفم عضله‌سازیه 💪",
      "چه مکملی بخورم؟",
      "تمرین خانگی می‌خوام 🏠",
    ],
    intake: [
      "آسیب‌دیدگی ندارم",
      "بیماری خاصی ندارم",
      "مشکل گوارشی ندارم",
      "مبتدی هستم",
      "سابقه‌ی تمرین دارم",
      "۳ روز در هفته وقت دارم",
      "۵ روز در هفته وقت دارم",
      "خواب و استرسم معمولیه",
    ],
    followup: [
      "دقیق‌تر توضیح بده",
      "برنامه‌ی هفتگی کامل بده",
      "نمونه‌ی غذای ایرانی بگو",
      "جایگزین ارزان‌تر چی؟",
      "مکمل لازم دارم؟",
      "چطور پیشرفتم رو بسنجم؟",
    ],
  },
  en: {
    start: [
      "I want a training plan 🏋️",
      "I want a diet plan 🍽️",
      "My goal is fat loss ⚖️",
      "My goal is muscle 💪",
      "Which supplements?",
      "Home workout please 🏠",
    ],
    intake: [
      "No injuries",
      "No medical conditions",
      "No digestive issues",
      "I'm a beginner",
      "I have training experience",
      "3 days a week",
      "5 days a week",
      "Sleep & stress are fine",
    ],
    followup: [
      "Explain in more detail",
      "Give a full weekly plan",
      "Iranian food examples",
      "Cheaper alternatives?",
      "Do I need supplements?",
      "How do I track progress?",
    ],
  },
};

/** Which chip set fits the moment: fresh chat → intents; coach just asked → answers; else → deepen. */
function quickStage(msgs: Msg[]): "start" | "intake" | "followup" {
  if (msgs.length === 0) return "start";
  const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return "intake";
  return lastAssistant.content.includes("؟") || lastAssistant.content.includes("?")
    ? "intake"
    : "followup";
}

export default function CoachPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const settings = useSettings();
  const program = useProgram();
  const dietProfile = useDietProfile();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  function systemPrompt(): string {
    const parts: string[] = [
      "You are «مربی رمق», an expert strength coach and sports nutritionist inside the Ramagh fitness app.",
      lang === "fa"
        ? "Always answer in Persian (Farsi), warm but professional. Use metric units and Persian food examples."
        : "Answer in English, warm but professional. Use metric units.",
      // Intake-first behavior: a real coach asks before prescribing.
      "INTAKE RULE: before giving any full program, diet plan, or major recommendation, check what you know about the user (from CONTEXT below and the conversation). The critical intake list is: age, sex, height, weight, activity level, training experience, goal, injuries or joint pain, medical conditions (heart, blood pressure, diabetes), digestive problems, food allergies/intolerances, medications, sleep quality, and stress. If any item that matters for the current question is unknown, FIRST ask for it — at most 3 short, numbered questions per turn — then answer fully once the user replies. For small factual questions, answer directly without interrogating.",
      "Personalize every answer with the user's data. When you make numeric recommendations (sets, reps, calories, protein), show the numbers explicitly. Never give medical diagnoses; for red-flag symptoms or diseases, advise seeing a physician first.",
    ];
    const known: string[] = [];
    if (settings) {
      known.push(
        `training: gender=${settings.gender}, level=${settings.level}, goal=${settings.goal}`
      );
    }
    if (dietProfile) {
      const tgt = macroTargets(dietProfile, dietProfile.bias);
      known.push(
        `body: age=${dietProfile.age}, height=${dietProfile.heightCm}cm, weight=${dietProfile.weightKg}kg, sex=${dietProfile.sex}, activity=${dietProfile.activity}`,
        `diet: style=${dietProfile.style}, goal=${dietProfile.goal}, ${dietProfile.mealsPerDay} meals/day, allergens=[${dietProfile.allergens.join(",") || "none"}], targets ${tgt.kcal} kcal / P${tgt.protein} C${tgt.carbs} F${tgt.fat} g. Prefer affordable Iranian foods.`
      );
    }
    if (program?.days?.length) {
      const split = program.days
        .map((d) => `${d.label}: ${d.focus.join("+") || "unset"} (${d.exercises.length} exercises)`)
        .join("; ");
      known.push(`weekly program: ${split}`);
    }
    parts.push(
      known.length
        ? `CONTEXT (already known — do NOT re-ask these): ${known.join(" | ")}`
        : "CONTEXT: nothing is known about this user yet — start by asking the most important intake questions for their request.",
      "Unknown unless stated above: injuries, medical conditions, digestive issues, medications, sleep, stress, training history."
    );
    return parts.join("\n");
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    setError(null);

    // AI calls count toward the free-usage quota; past the limit → login.
    if (!(await gateAction((url) => router.push(url)))) return;

    const nextMsgs: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(nextMsgs);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt() }, ...nextMsgs],
        }),
      });
      const json = await res.json();
      if (res.status === 503 && json.error === "no_key") {
        setError(t("coach.needsKey"));
      } else if (!res.ok || !json.content) {
        setError(t("coach.error"));
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: json.content }]);
      }
    } catch {
      setError(t("coach.error"));
    } finally {
      setBusy(false);
    }
  }

  if (settings === undefined) return <Spinner />;

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6">
      <PageHeader
        title={t("coach.title")}
        subtitle={t("coach.subtitle")}
        right={
          <Link
            href="/profile"
            className="flex size-10 items-center justify-center rounded-full bg-card text-muted ring-1 ring-line"
            aria-label={t("prof.title")}
          >
            <Icon name="user" className="size-5" />
          </Link>
        }
      />

      {/* Thread */}
      <div className="mt-4 flex-1 space-y-3 pb-64">
        <Bubble role="assistant">{t("coach.hello")}</Bubble>
        {msgs.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {busy && (
          <Bubble role="assistant">
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="size-4 animate-spin rounded-full border-2 border-line border-t-brand" />
              {t("coach.thinking")}
            </span>
          </Bubble>
        )}
        {error && (
          <p className="rounded-2xl bg-danger-dim p-3 text-sm font-semibold text-danger ring-1 ring-danger/25">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer — solid backdrop so the thread never shows through */}
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md border-t border-line/60 bg-base px-4 pb-2 pt-2.5 shadow-[0_-14px_30px_-6px_rgb(0_0_0/0.75)]">
        {/* quick replies — answer without typing */}
        {!busy && (
          <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
            {QUICK[lang][quickStage(msgs)].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="whitespace-nowrap rounded-full bg-card2 px-3.5 py-2 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-card3 hover:ring-brand/40 active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl bg-card2 p-2 ring-1 ring-line2 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.65)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("coach.placeholder")}
            rows={1}
            className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={busy || !input.trim()}
            aria-label={t("coach.send")}
            className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-brandink transition-transform active:scale-95 disabled:bg-card3 disabled:text-faint"
          >
            <Icon name="play" className="size-5 flip-rtl" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] font-semibold text-faint">
          {t("coach.disclaimer")}
        </p>
      </div>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-[1.65]",
          isUser
            ? "bg-brand text-brandink font-semibold"
            : "bg-card text-ink ring-1 ring-line"
        )}
        dir="auto"
      >
        {children}
      </div>
    </div>
  );
}
