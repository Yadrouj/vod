"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import AppConfirmDialog from "@/components/AppConfirmDialog";
import ContactMessageModal from "@/components/ContactMessageModal";
import { showInAppMessage } from "@/components/InAppMessages";
import { useLang } from "@/components/LangProvider";
import SocialAccountSection from "@/components/SocialAccountSection";
import { setAppTheme } from "@/components/ThemeProvider";
import TrainerAvatar from "@/components/TrainerAvatar";
import { Icon, type IconName } from "@/components/icons";
import { Button, PageHeader, Segmented, Spinner, cn } from "@/components/ui";
import {
  DEFAULT_SETTINGS,
  FREE_USAGE_LIMIT,
  getAccount,
  saveAccount,
  saveDietProfile,
  saveSettings,
  signOut,
} from "@/lib/db";
import {
  useAccount,
  useDietProfile,
  useSessions,
  useSettings,
  useSocial,
  useSubscription,
  useUsage,
} from "@/lib/hooks";
import { getTrainer } from "@/lib/marketplace";
import { DIET_PROFILE_ID, type DietProfile } from "@/lib/nutrition";
import { fetchCoachFollowing, type CoachFollowRow } from "@/lib/social";
import type { AppTheme, Subscription } from "@/lib/types";

type ProfileTab = "account" | "profile" | "following" | "ads" | "payments" | "contact" | "preferences";

export default function ProfilePage() {
  const { t, lang, setLang } = useLang();
  const account = useAccount();
  const savedSettings = useSettings();
  const dietProfile = useDietProfile();
  const sessions = useSessions();
  const usage = useUsage();
  const subscription = useSubscription();
  const social = useSocial();
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const [now] = useState(() => Date.now());
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  if (account === undefined || subscription === undefined) return <Spinner />;

  const settings = savedSettings ?? DEFAULT_SETTINGS;
  const total = sessions?.length ?? 0;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = (sessions ?? []).filter((s) => s.startedAt >= weekAgo).length;
  const used = Math.min(usage?.count ?? 0, FREE_USAGE_LIMIT);
  const tabs = profileTabs(lang);

  async function doSignOut() {
    await signOut();
    setConfirmSignOut(false);
  }

  function openRenameAccount() {
    if (!account) return;
    setRenameValue(account.name);
    setRenaming(true);
  }

  async function saveRenameAccount() {
    const name = renameValue.trim();
    if (!name) return;
    setSavingName(true);
    const current = await getAccount();
    if (!current) {
      setSavingName(false);
      return;
    }
    await saveAccount({
      provider: current.provider,
      email: current.email,
      name,
      picture: current.picture,
    });
    setSavingName(false);
    setRenaming(false);
    showInAppMessage({
      tone: "success",
      body: lang === "fa" ? "دینگ! پروفایل یک تکرار تمیزتر شد." : "Ding. Profile rep cleaned up.",
      durationMs: 2600,
    });
  }

  return (
    <div className="px-4 pb-28 pt-6">
      <AppConfirmDialog
        open={confirmSignOut}
        tone="danger"
        icon="x"
        title={lang === "fa" ? "از حساب خارج شوی؟" : "Sign out?"}
        body={t("prof.signOutConfirm")}
        confirmLabel={t("prof.signOut")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={doSignOut}
      />
      <AppConfirmDialog
        open={renaming}
        tone="info"
        icon="edit"
        title={t("prof.editName")}
        body={lang === "fa" ? "نام جدید را وارد کن." : "Enter your new name."}
        confirmLabel={lang === "fa" ? "ذخیره نام" : "Save name"}
        cancelLabel={t("common.cancel")}
        busy={savingName}
        onCancel={() => setRenaming(false)}
        onConfirm={saveRenameAccount}
      >
        <input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void saveRenameAccount();
          }}
          className="w-full rounded-xl bg-card2 px-4 py-3 text-sm font-bold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
          autoFocus
        />
      </AppConfirmDialog>

      <PageHeader title={t("prof.title")} />

      <ProfileHero
        account={account}
        isVip={isVipActive(subscription, now)}
        onRename={openRenameAccount}
        onSignIn={() => setActiveTab("account")}
      />

      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-[10px] font-extrabold ring-1 transition-colors",
              activeTab === tab.key
                ? "bg-brand text-brandink ring-brand"
                : "bg-card text-muted ring-line hover:bg-card2 hover:text-ink"
            )}
          >
            <Icon name={tab.icon} className="size-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "account" && (
          <AccountPanel
            account={account}
            used={used}
            onRename={openRenameAccount}
            onSignOut={() => setConfirmSignOut(true)}
          />
        )}
        {activeTab === "profile" && (
          <ProfilePanel
            dietProfile={dietProfile ?? null}
            defaultSex={settings.gender}
            settings={settings}
            total={total}
            thisWeek={thisWeek}
          />
        )}
        {activeTab === "following" && <FollowingPanel social={social} />}
        {activeTab === "ads" && <AdsPanel />}
        {activeTab === "payments" && <PaymentsPanel subscription={subscription} />}
        {activeTab === "contact" && <ContactPanel account={account} />}
        {activeTab === "preferences" && (
          <PreferencesPanel
            lang={lang}
            setLang={setLang}
            theme={settings.theme ?? "classic"}
          />
        )}
      </div>
    </div>
  );
}

function profileTabs(lang: "fa" | "en"): { key: ProfileTab; label: string; icon: IconName }[] {
  return [
    { key: "account", label: lang === "fa" ? "حساب" : "Account", icon: "user" },
    { key: "profile", label: lang === "fa" ? "پروفایل" : "Profile", icon: "dumbbell" },
    { key: "following", label: lang === "fa" ? "فالوینگ" : "Following", icon: "users" },
    { key: "ads", label: lang === "fa" ? "تبلیغات" : "Ads", icon: "sparkles" },
    { key: "payments", label: lang === "fa" ? "پرداخت" : "Payments", icon: "lock" },
    { key: "contact", label: lang === "fa" ? "ارتباط" : "Contact", icon: "message" },
    { key: "preferences", label: lang === "fa" ? "تنظیمات" : "Settings", icon: "settings" },
  ];
}

function isVipActive(subscription: Subscription | null, now: number) {
  return (
    subscription?.status === "vip" &&
    typeof subscription.vipUntil === "number" &&
    subscription.vipUntil > now
  );
}

function ProfileHero({
  account,
  isVip,
  onRename,
  onSignIn,
}: {
  account: ReturnType<typeof useAccount> extends infer T ? Exclude<T, undefined> : never;
  isVip: boolean;
  onRename: () => void;
  onSignIn: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center gap-3">
        {account?.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.picture} alt="" className="size-14 rounded-xl object-cover ring-2 ring-brand/40" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-xl bg-brand/15 text-brand ring-1 ring-brand/25">
            <Icon name="user" className="size-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-extrabold text-ink">{account?.name ?? t("prof.guest")}</p>
            {account && (
              <button type="button" onClick={onRename} className="flex-shrink-0 text-faint hover:text-brand" aria-label={t("prof.editName")}>
                <Icon name="edit" className="size-4" />
              </button>
            )}
          </div>
          {account ? (
            <p className="truncate text-xs text-muted" dir="ltr">{account.email}</p>
          ) : (
            <Link href="/login" onClick={onSignIn} className="text-xs font-extrabold text-brand">
              {t("prof.signIn")}
            </Link>
          )}
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1", isVip ? "bg-success-dim text-success ring-success/25" : "bg-card2 text-muted ring-line")}>
          {isVip ? "VIP" : "Free"}
        </span>
      </div>
    </div>
  );
}

function AccountPanel({
  account,
  used,
  onRename,
  onSignOut,
}: {
  account: ReturnType<typeof useAccount> extends infer T ? Exclude<T, undefined> : never;
  used: number;
  onRename: () => void;
  onSignOut: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      <Panel title={t("prof.title")} icon="user">
        {account ? (
          <div className="space-y-3">
            <InfoRow label={t("prof.editName")} value={account.name} actionLabel={t("common.edit")} onAction={onRename} />
            <InfoRow label="Email" value={account.email} dir="ltr" />
            <InfoRow label="Status" value={account.provider === "google" ? t("prof.connected") : t("prof.local")} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">{t("prof.guest")}</p>
            <Link href="/login">
              <Button className="min-h-9">{t("prof.signIn")}</Button>
            </Link>
          </div>
        )}
      </Panel>

      <Panel title={t("prof.usage")} icon="timer">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-muted">{account ? t("prof.unlimited") : t("prof.usageOf", { n: used, m: FREE_USAGE_LIMIT })}</span>
          <span className={account ? "text-success" : "text-brand"}>{account ? "∞" : `${used}/${FREE_USAGE_LIMIT}`}</span>
        </div>
        {!account && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base2 ring-1 ring-line">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${(used / FREE_USAGE_LIMIT) * 100}%` }} />
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-2">
        <Link href="/coach-apply">
          <Button variant="secondary" className="w-full justify-start">
            <Icon name="medal" className="size-4" /> {t("coachreg.menu")}
          </Button>
        </Link>
        {account && (
          <Button variant="danger" className="w-full justify-start" onClick={onSignOut}>
            <Icon name="x" className="size-4" /> {t("prof.signOut")}
          </Button>
        )}
      </div>
    </div>
  );
}

function ProfilePanel({
  dietProfile,
  defaultSex,
  settings,
  total,
  thisWeek,
}: {
  dietProfile: DietProfile | null;
  defaultSex: "male" | "female";
  settings: NonNullable<ReturnType<typeof useSettings>>;
  total: number;
  thisWeek: number;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon="flame" value={thisWeek} label={t("home.thisWeek")} />
        <Stat icon="trophy" value={total} label={t("home.allTime")} />
      </div>

      <Panel title={t("prof.training")} icon="target">
        <div className="flex flex-wrap gap-2">
          <Tag>{settings.gender === "male" ? t("common.male") : t("common.female")}</Tag>
          <Tag>{t(`level.${settings.level}`)}</Tag>
          <Tag>{t(`goal.${settings.goal}`)}</Tag>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/onboarding">
            <Button variant="secondary" className="w-full">
              <Icon name="dumbbell" className="size-4" /> {t("prof.editTraining")}
            </Button>
          </Link>
          <Link href="/diet/setup">
            <Button variant="secondary" className="w-full">
              <Icon name="diet" className="size-4" /> {t("prof.editDiet")}
            </Button>
          </Link>
        </div>
      </Panel>

      <BodyStats dietProfile={dietProfile} defaultSex={defaultSex} />
      <SocialAccountSection />
    </div>
  );
}

function FollowingPanel({ social }: { social: ReturnType<typeof useSocial> }) {
  const { lang, n } = useLang();
  const [rows, setRows] = useState<CoachFollowRow[] | null>(null);
  const socialUserId = social?.userId;

  useEffect(() => {
    if (!socialUserId) return;
    let cancelled = false;
    void fetchCoachFollowing(socialUserId).then((next) => {
      if (!cancelled) setRows(next);
    });
    return () => {
      cancelled = true;
    };
  }, [socialUserId]);

  if (social === undefined) {
    return (
      <Panel title={lang === "fa" ? "فالوینگ" : "Following"} icon="users">
        <Spinner />
      </Panel>
    );
  }

  if (social === null) {
    return (
      <div className="space-y-3">
        <Panel title={lang === "fa" ? "فالوینگ" : "Following"} icon="users">
          <p className="text-sm leading-6 text-muted">
            {lang === "fa"
              ? "برای دیدن مربی‌هایی که دنبال می‌کنی، اول پروفایل اجتماعی‌ات را بساز."
              : "Create your social profile first to keep a following list."}
          </p>
        </Panel>
        <SocialAccountSection />
      </div>
    );
  }

  const items = (rows ?? [])
    .map((row) => ({ row, trainer: getTrainer(row.trainerId) }))
    .filter((item): item is { row: CoachFollowRow; trainer: NonNullable<ReturnType<typeof getTrainer>> } => Boolean(item.trainer));

  return (
    <Panel title={lang === "fa" ? "فالوینگ" : "Following"} icon="users">
      {rows === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
          <p className="text-sm font-bold text-ink">
            {lang === "fa" ? "هنوز مربی‌ای را فالو نکردی." : "You are not following any coaches yet."}
          </p>
          <p className="mt-1 text-xs leading-6 text-muted">
            {lang === "fa"
              ? "از پروفایل مربی‌ها دکمه فالو را بزن تا اینجا سریع پیدایشان کنی."
              : "Tap Follow on coach profiles so they show up here."}
          </p>
          <Link href="/market" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-4 text-xs font-black text-brandink">
            {lang === "fa" ? "دیدن مربی‌ها" : "Browse coaches"}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(({ row, trainer }) => {
            const name = lang === "fa" ? trainer.nameFa : trainer.name;
            const cred = lang === "fa" ? trainer.credFa : trainer.cred;
            const followedAt = new Date(row.createdAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
              month: "short",
              day: "numeric",
            });
            return (
              <Link
                key={row.trainerId}
                href={`/market/trainer/${trainer.id}`}
                className="flex items-center gap-3 rounded-2xl bg-card2 p-3 ring-1 ring-line transition-colors hover:bg-card3"
              >
                <TrainerAvatar trainer={trainer} size="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-ink">{name}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted">{cred}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-faint">
                    <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 ring-1 ring-line">
                      <Icon name="users" className="size-3 text-brand" />
                      {n(row.followers.toLocaleString(lang === "fa" ? "fa-IR" : "en-US"))}
                    </span>
                    <span className="rounded-full bg-card px-2 py-0.5 ring-1 ring-line">
                      {lang === "fa" ? `از ${followedAt}` : `Since ${followedAt}`}
                    </span>
                  </div>
                </div>
                <Icon name="chevronRight" className="size-4 flex-shrink-0 text-faint flip-rtl" />
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function AdsPanel() {
  const { lang } = useLang();
  const plans = [
    {
      id: "gym",
      titleFa: "بالاآوردن باشگاه در لیست",
      titleEn: "Boost a gym listing",
      pricePerThousand: 500_000,
      descFa: "نمایش تصادفی در بالای بخش باشگاه‌ها با بج «تبلیغات» و کادر متفاوت.",
      descEn: "Random sponsored placement at the top of gyms with an Ads badge and highlighted border.",
    },
    {
      id: "coach",
      titleFa: "بالاآوردن مربی در بازار برنامه‌ها",
      titleEn: "Boost a coach profile",
      pricePerThousand: 700_000,
      descFa: "نمایش مربی در ریل مربیان با بج تبلیغات برای جذب درخواست برنامه خصوصی.",
      descEn: "Sponsored coach placement in the coaches rail to attract private-plan requests.",
    },
    {
      id: "plan",
      titleFa: "تبلیغ برنامه تمرینی یا تغذیه",
      titleEn: "Promote a training or diet plan",
      pricePerThousand: 600_000,
      descFa: "قرار گرفتن برنامه در بالای لیست مارکت با توضیح اسپانسر شده.",
      descEn: "Sponsored plan placement at the top of the market list.",
    },
    {
      id: "store",
      titleFa: "بالاآوردن فروشگاه یا داروخانه ورزشی",
      titleEn: "Boost a store or sport pharmacy",
      pricePerThousand: 450_000,
      descFa: "مناسب فروش مکمل، تجهیزات ورزشی، داروخانه و فروشگاه محلی.",
      descEn: "For supplement shops, sport stores, pharmacies, and local retailers.",
    },
    {
      id: "mag",
      titleFa: "مقاله رپورتاژ در مجله",
      titleEn: "Sponsored magazine article",
      pricePerThousand: 350_000,
      basePrice: 2_000_000,
      priceEn: "SEO article: from 2,000,000 toman",
      descFa: "مقاله با لینک داخلی به صفحه باشگاه، مربی یا فروشگاه و ساختار مناسب جستجو.",
      descEn: "SEO article with internal links to a gym, coach, or store profile.",
    },
  ];
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0].id);
  const [views, setViews] = useState(2000);
  const [targetName, setTargetName] = useState("");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const viewPackages = Math.max(1, Math.ceil(views / 1000));
  const total = viewPackages * selectedPlan.pricePerThousand + (selectedPlan.basePrice ?? 0);
  const nf = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US");

  function handleAdRequest() {
    showInAppMessage({
      tone: "success",
      body:
        lang === "fa"
          ? `درخواست تبلیغات آماده شد: ${selectedPlan.titleFa}، ${nf.format(viewPackages * 1000)} بازدید، مبلغ ${nf.format(total)} تومان. فیش را به تلگرام Yadrouj بفرست.`
          : `Ad request ready: ${selectedPlan.titleEn}, ${nf.format(viewPackages * 1000)} views, ${nf.format(total)} toman. Send the receipt to Telegram Yadrouj.`,
      durationMs: 5200,
    });
  }

  return (
    <div className="space-y-3">
      <Panel title={lang === "fa" ? "تبلیغات و بیشتر دیده‌شدن" : "Ads and visibility"} icon="sparkles">
        <div className="rounded-2xl bg-brand/12 p-3 ring-1 ring-brand/30">
          <p className="text-sm font-black text-ink">
            {lang === "fa" ? "جایگاه‌های تبلیغاتی با برچسب شفاف نمایش داده می‌شوند." : "Sponsored placements are clearly labeled."}
          </p>
          <p className="mt-1 text-xs leading-6 text-muted">
            {lang === "fa"
              ? "کاربر می‌فهمد این آیتم با تبلیغات بالا آمده، اما طراحی آن همچنان حرفه‌ای و قابل اعتماد می‌ماند."
              : "Users can tell the item is promoted while the design stays professional and trustworthy."}
          </p>
        </div>
      </Panel>

      <Panel title={lang === "fa" ? "محاسبه کمپین تبلیغاتی" : "Campaign calculator"} icon="target">
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-extrabold text-muted">{lang === "fa" ? "سرویس تبلیغاتی" : "Ad service"}</span>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-card2 px-3 py-3 text-sm font-black text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {lang === "fa" ? plan.titleFa : plan.titleEn}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-extrabold text-muted">{lang === "fa" ? "نام/آیدی صفحه‌ای که باید تبلیغ شود" : "Target page name or ID"}</span>
            <input
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder={lang === "fa" ? "مثلا باشگاه، مربی، فروشگاه یا لینک صفحه" : "Gym, coach, store, or page link"}
              className="mt-2 w-full rounded-2xl bg-card2 px-3 py-3 text-sm font-bold text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold text-muted">{lang === "fa" ? "تعداد بازدید مورد نیاز" : "Needed views"}</span>
              <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-black text-brand">
                {nf.format(viewPackages * 1000)} {lang === "fa" ? "بازدید" : "views"}
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={50000}
              step={1000}
              value={views}
              onChange={(e) => setViews(Number(e.target.value))}
              className="mt-3 w-full accent-brand"
            />
            <input
              type="number"
              min={1000}
              step={1000}
              value={views}
              onChange={(e) => setViews(Math.max(1000, Number(e.target.value) || 1000))}
              className="mt-2 w-full rounded-2xl bg-card2 px-3 py-3 text-center text-sm font-black text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </label>

          <div className="rounded-2xl bg-card2 p-4 ring-1 ring-brand/25">
            <p className="text-xs font-bold leading-6 text-muted">{lang === "fa" ? selectedPlan.descFa : selectedPlan.descEn}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-base p-3 ring-1 ring-line">
                <p className="text-[10px] font-bold text-faint">{lang === "fa" ? "قیمت هر ۱۰۰۰ بازدید" : "Per 1,000 views"}</p>
                <p className="mt-1 text-sm font-black text-ink">{nf.format(selectedPlan.pricePerThousand)} {lang === "fa" ? "تومان" : "toman"}</p>
              </div>
              <div className="rounded-xl bg-base p-3 ring-1 ring-line">
                <p className="text-[10px] font-bold text-faint">{lang === "fa" ? "مبلغ نهایی" : "Total"}</p>
                <p className="mt-1 text-sm font-black text-brand">{nf.format(total)} {lang === "fa" ? "تومان" : "toman"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-success-dim p-4 text-success ring-1 ring-success/30">
            <p className="text-sm font-black">{lang === "fa" ? "روش پرداخت تبلیغات" : "Ad payment"}</p>
            <p className="mt-2 text-xs font-bold leading-6">
              {lang === "fa"
                ? "مبلغ نهایی را به کارت زیر واریز کن و تصویر فیش را برای تلگرام Yadrouj بفرست تا کمپین فعال شود."
                : "Pay the final amount to the card below and send the receipt to Telegram Yadrouj."}
            </p>
            <div className="mt-3 rounded-xl bg-base px-3 py-3 text-center ring-1 ring-success/20">
              <p className="font-mono text-base font-black tracking-wider" dir="ltr">6219861970108964</p>
              <p className="mt-1 text-xs font-bold">Blu - Vahid Yadrouj</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleAdRequest} className="w-full">
              <Icon name="scale" className="size-4" />
              {lang === "fa" ? "محاسبه و ثبت" : "Calculate"}
            </Button>
            <a
              href="https://t.me/Yadrouj"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-card2 px-3 text-sm font-black text-ink ring-1 ring-line"
            >
              <Icon name="telegram" className="size-4 text-brand" />
              Telegram
            </a>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function PaymentsPanel({ subscription }: { subscription: Subscription | null }) {
  return (
    <div className="space-y-3">
      <VipAccountCard subscription={subscription} />
    </div>
  );
}

function ContactPanel({
  account,
}: {
  account: ReturnType<typeof useAccount> extends infer T ? Exclude<T, undefined> : never;
}) {
  const { t, lang } = useLang();
  return (
    <div className="space-y-3">
      <Panel title={lang === "fa" ? "پیام به مدیریت" : "Contact admin"} icon="message">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-muted">
            {lang === "fa"
              ? "مشکل پروفایل، باشگاه، فروشگاه یا درخواستت را ثبت کن."
              : "Send profile issues, place corrections, or any request."}
          </p>
          <ContactMessageModal
            place={{ source: "profile", id: account?.userId ?? null, name: account?.name ?? null, phone: null }}
            size="md"
            triggerLabel={lang === "fa" ? "ارسال" : "Send"}
          />
        </div>
      </Panel>

      <Link href="/support" className="block">
        <Button variant="secondary" className="w-full justify-start">
          <Icon name="message" className="size-4" /> {t("sup.contactUs")}
        </Button>
      </Link>
    </div>
  );
}

function PreferencesPanel({
  lang,
  setLang,
  theme,
}: {
  lang: "fa" | "en";
  setLang: (lang: "fa" | "en") => void;
  theme: AppTheme;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      <Panel title={t("prof.language")} icon="message">
        <Segmented
          value={lang}
          onChange={setLang}
          options={[
            { value: "fa", label: "فارسی" },
            { value: "en", label: "English" },
          ]}
        />
      </Panel>
      <ThemeSection value={theme} />
    </div>
  );
}

function VipAccountCard({ subscription }: { subscription: Subscription | null }) {
  const { lang } = useLang();
  const [now] = useState(() => Date.now());
  const active = isVipActive(subscription, now);
  const date = subscription?.vipUntil
    ? new Date(subscription.vipUntil).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US")
    : null;

  return (
    <Panel title={lang === "fa" ? "حساب VIP" : "VIP Account"} icon="lock">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-ink">
            {active ? (lang === "fa" ? "فعال" : "Active") : subscription?.status === "pending" ? (lang === "fa" ? "در انتظار تایید" : "Pending") : "Free"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {active
              ? lang === "fa"
                ? `فعال تا ${date}`
                : `Active until ${date}`
              : subscription?.status === "pending"
              ? lang === "fa"
                ? "رسید ارسال شده و منتظر تایید ادمین است."
                : "Receipt sent and waiting for admin confirmation."
              : lang === "fa"
              ? "برای آنالیز بدن و قابلیت‌های AI بیشتر، VIP را فعال کن."
              : "Activate VIP for body analysis and more AI features."}
          </p>
        </div>
        <Link
          href="/upgrade"
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-extrabold",
            active ? "bg-success-dim text-success ring-1 ring-success/25" : "bg-brand text-brandink"
          )}
        >
          {active ? "VIP" : lang === "fa" ? "ارتقا" : "Upgrade"}
        </Link>
      </div>
    </Panel>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Icon name={icon} className="size-4" />
        </span>
        <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
  dir,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl" | "auto";
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card2 px-3 py-2 ring-1 ring-line">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-faint">{label}</p>
        <p className="truncate text-sm font-bold text-ink" dir={dir ?? "auto"}>{value}</p>
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="flex-shrink-0 text-xs font-extrabold text-brand">
          {actionLabel}
        </button>
      )}
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
  const { n } = useLang();
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center gap-2 text-brand">
        <Icon name={icon} className="size-5" />
        <p className="tnum text-2xl font-extrabold text-ink">{n(value)}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function ThemeSection({ value }: { value: AppTheme }) {
  const { lang } = useLang();

  async function setTheme(theme: AppTheme) {
    setAppTheme(theme);
    await saveSettings({ theme });
  }

  return (
    <Panel title={lang === "fa" ? "تم" : "Theme"} icon="settings">
      <Segmented<AppTheme>
        value={value}
        onChange={setTheme}
        options={[
          { value: "classic", label: lang === "fa" ? "کلاسیک" : "Classic" },
          { value: "minimal", label: lang === "fa" ? "مونو اکسنت" : "Mono accent" },
        ]}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ThemePreview active={value === "classic"} tone="classic" label={lang === "fa" ? "رمق" : "Ramagh"} />
        <ThemePreview active={value === "minimal"} tone="minimal" label={lang === "fa" ? "اکسنت" : "Accent"} />
      </div>
    </Panel>
  );
}

function ThemePreview({
  active,
  tone,
  label,
}: {
  active: boolean;
  tone: AppTheme;
  label: string;
}) {
  return (
    <div
      className={cn(
        "h-16 rounded-xl p-2 ring-1 transition-colors",
        active ? "ring-brand" : "ring-line",
        tone === "classic" ? "bg-[#101827]" : "bg-[#151515]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="h-5 w-12 rounded-full bg-[#b8f24a]" />
        <span className="text-[10px] font-bold text-ink">{label}</span>
      </div>
      <div className="mt-3 flex gap-1">
        <span className={cn("h-2 flex-1 rounded-full", tone === "classic" ? "bg-[#2b3854]" : "bg-[#3a3a3a]")} />
        <span className={cn("h-2 flex-1 rounded-full", tone === "classic" ? "bg-[#1a2136]" : "bg-[#292929]")} />
        <span className={cn("h-2 flex-1 rounded-full", tone === "classic" ? "bg-[#7bd93a]" : "bg-[#b8f24a]")} />
      </div>
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
    showInAppMessage({
      tone: "success",
      body: "Ding. Body stats updated.",
      durationMs: 2400,
    });
  }

  return (
    <Panel title={t("prof.body")} icon="scale">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (editing) void save();
            else {
              setAge(dietProfile?.age ?? 28);
              setHeight(dietProfile?.heightCm ?? 175);
              setWeight(dietProfile?.weightKg ?? 75);
              setEditing(true);
            }
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors",
            editing ? "bg-brand text-brandink" : "bg-card2 text-muted ring-1 ring-line hover:text-ink"
          )}
        >
          <Icon name={editing ? "check" : "edit"} className="size-3.5" />
          {editing ? t("common.save") : t("common.edit")}
        </button>
      </div>
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
    </Panel>
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
  const { n } = useLang();
  return (
    <div className="rounded-xl bg-base2 p-3 text-center ring-1 ring-line">
      <p className="text-[11px] font-bold text-faint">{label}</p>
      <p className="tnum mt-0.5 text-sm font-extrabold text-ink" dir="ltr">
        {n(value)}
      </p>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-card2 px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
      {children}
    </span>
  );
}
