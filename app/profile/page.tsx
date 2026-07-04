"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, PageHeader, Segmented, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import {
  FREE_USAGE_LIMIT,
  getAccount,
  saveAccount,
  saveDietProfile,
  signOut,
} from "@/lib/db";
import { DIET_PROFILE_ID, type DietProfile } from "@/lib/nutrition";
import {
  useAccount,
  useDietProfile,
  useSessions,
  useSettings,
  useUsage,
} from "@/lib/hooks";

export default function ProfilePage() {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const account = useAccount();
  const settings = useSettings();
  const dietProfile = useDietProfile();
  const sessions = useSessions();
  const usage = useUsage();

  if (account === undefined || settings === undefined) return <Spinner />;

  const total = sessions?.length ?? 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = (sessions ?? []).filter((s) => s.startedAt >= weekAgo).length;
  const used = Math.min(usage?.count ?? 0, FREE_USAGE_LIMIT);

  async function doSignOut() {
    if (!confirm(t("prof.signOutConfirm"))) return;
    await signOut();
  }

  async function renameAccount() {
    const current = await getAccount();
    if (!current) return;
    const name = prompt(t("prof.editName"), current.name);
    if (!name || !name.trim()) return;
    await saveAccount({
      provider: current.provider,
      email: current.email,
      name: name.trim(),
      picture: current.picture,
    });
  }

  return (
    <div className="px-4 pt-6">
      <PageHeader title={t("prof.title")} />

      {/* Identity card */}
      <div className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line">
        <div className="flex items-center gap-4">
          {account?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.picture}
              alt=""
              className="size-16 rounded-full ring-2 ring-brand/50"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-brand/15 text-brand ring-2 ring-brand/30">
              <Icon name="user" className="size-8" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-lg font-extrabold text-ink">
              {account?.name ?? t("prof.guest")}
              {account && (
                <button
                  type="button"
                  onClick={renameAccount}
                  aria-label={t("prof.editName")}
                  className="text-faint hover:text-brand"
                >
                  <Icon name="edit" className="size-4" />
                </button>
              )}
            </p>
            {account ? (
              <>
                <p className="truncate text-sm text-muted" dir="ltr">
                  {account.email}
                </p>
                <span className="mt-1 inline-block rounded-full bg-success-dim px-2.5 py-0.5 text-[11px] font-bold text-success ring-1 ring-success/25">
                  {account.provider === "google"
                    ? t("prof.connected")
                    : t("prof.local")}
                </span>
              </>
            ) : (
              <Link
                href="/login"
                className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-brand"
              >
                {t("prof.signIn")}
                <Icon name="chevronRight" className="size-4 flip-rtl" />
              </Link>
            )}
          </div>
        </div>

        {/* Usage meter */}
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted">{t("prof.usage")}</span>
            <span className={account ? "text-success" : "text-ink"}>
              {account
                ? t("prof.unlimited")
                : t("prof.usageOf", { n: used, m: FREE_USAGE_LIMIT })}
            </span>
          </div>
          {!account && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base2 ring-1 ring-line">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300"
                style={{ width: `${(used / FREE_USAGE_LIMIT) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat icon="flame" value={thisWeek} label={t("home.thisWeek")} />
        <Stat icon="trophy" value={total} label={t("home.allTime")} />
      </div>

      {/* Body stats (editable) */}
      <BodyStats
        dietProfile={dietProfile ?? null}
        defaultSex={settings.gender}
      />

      {/* Training settings */}
      <Section title={t("prof.training")}>
        <div className="flex flex-wrap gap-2">
          <Tag>{settings.gender === "male" ? t("common.male") : t("common.female")}</Tag>
          <Tag>{t(`level.${settings.level}`)}</Tag>
          <Tag>{t(`goal.${settings.goal}`)}</Tag>
        </div>
      </Section>

      {/* Language */}
      <Section title={t("prof.language")}>
        <Segmented
          value={lang}
          onChange={setLang}
          options={[
            { value: "fa", label: "فارسی" },
            { value: "en", label: "English" },
          ]}
        />
      </Section>

      {/* Actions */}
      <div className="mt-5 space-y-2">
        <Link href="/onboarding" className="block">
          <Button variant="secondary" className="w-full">
            <Icon name="dumbbell" className="size-4" /> {t("prof.editTraining")}
          </Button>
        </Link>
        <Link href="/diet/setup" className="block">
          <Button variant="secondary" className="w-full">
            <Icon name="diet" className="size-4" /> {t("prof.editDiet")}
          </Button>
        </Link>
        <Link href="/support" className="block">
          <Button variant="secondary" className="w-full">
            <Icon name="edit" className="size-4" /> {t("sup.contactUs")}
          </Button>
        </Link>
        {account && (
          <Button variant="danger" className="w-full" onClick={doSignOut}>
            {t("prof.signOut")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: "flame" | "trophy";
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center gap-2 text-brand">
        <Icon name={icon} className="size-5" />
        <p className="tnum text-2xl font-extrabold text-ink">{value}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <div className="mt-2 rounded-2xl bg-card p-4 ring-1 ring-line">{children}</div>
    </div>
  );
}

function BodyStats({
  dietProfile,
  defaultSex,
}: {
  dietProfile: DietProfile | null;
  defaultSex: "male" | "female";
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [age, setAge] = useState(dietProfile?.age ?? 28);
  const [height, setHeight] = useState(dietProfile?.heightCm ?? 175);
  const [weight, setWeight] = useState(dietProfile?.weightKg ?? 75);

  async function save() {
    const profile: DietProfile = dietProfile
      ? { ...dietProfile, age, heightCm: height, weightKg: weight }
      : {
          id: DIET_PROFILE_ID,
          sex: defaultSex,
          age,
          heightCm: height,
          weightKg: weight,
          activity: "moderate",
          goal: "maintain",
          style: "omnivore",
          allergens: [],
          mealsPerDay: 4,
        };
    await saveDietProfile(profile);
    setEditing(false);
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">{t("prof.body")}</h2>
        <button
          type="button"
          onClick={() => {
            if (editing) save();
            else {
              setAge(dietProfile?.age ?? 28);
              setHeight(dietProfile?.heightCm ?? 175);
              setWeight(dietProfile?.weightKg ?? 75);
              setEditing(true);
            }
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors",
            editing
              ? "bg-brand text-brandink"
              : "bg-card2 text-muted ring-1 ring-line hover:text-ink"
          )}
        >
          <Icon name={editing ? "check" : "edit"} className="size-3.5" />
          {editing ? t("common.save") : t("common.edit")}
        </button>
      </div>
      <div className="mt-2 rounded-2xl bg-card p-4 ring-1 ring-line">
        {editing ? (
          <div className="grid grid-cols-3 gap-2">
            <EditNum label={t("prof.age")} value={age} onChange={setAge} min={12} max={100} />
            <EditNum label={t("prof.height")} value={height} onChange={setHeight} min={120} max={230} suffix="cm" />
            <EditNum label={t("prof.weight")} value={weight} onChange={setWeight} min={30} max={250} suffix="kg" />
          </div>
        ) : dietProfile ? (
          <div className="grid grid-cols-3 gap-2">
            <Mini label={t("prof.age")} value={`${dietProfile.age}`} />
            <Mini label={t("prof.height")} value={`${dietProfile.heightCm} cm`} />
            <Mini label={t("prof.weight")} value={`${dietProfile.weightKg} kg`} />
          </div>
        ) : (
          <p className="text-sm text-faint">{t("prof.notSet")}</p>
        )}
      </div>
    </div>
  );
}

function EditNum({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl bg-base2 p-2 text-center ring-1 ring-brand/40">
      <p className="text-[11px] font-bold text-faint">{label}</p>
      <div className="mt-0.5 flex items-center justify-center gap-1" dir="ltr">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tnum w-14 bg-transparent text-center text-sm font-extrabold text-ink outline-none"
        />
        {suffix && <span className="text-[10px] font-bold text-faint">{suffix}</span>}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-base2 p-3 text-center ring-1 ring-line">
      <p className="text-[11px] font-bold text-faint">{label}</p>
      <p className="tnum mt-0.5 text-sm font-extrabold text-ink" dir="ltr">
        {value}
      </p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-card2 px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
      {children}
    </span>
  );
}
