"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { FREE_USAGE_LIMIT, VIP_PLAN_PRICE_TOMAN } from "@/lib/db";
import { useAnalysisThread, useFeedbackList, useSessions, useUsage } from "@/lib/hooks";
import { fetchCoachData, mediaUrl, type CoachApplication, type CoachProgram } from "@/lib/social";
import type { PublicUser } from "@/lib/authClient";
import type { ContactMessage } from "@/lib/messageStore.server";
import type { MagArticle } from "@/lib/mag";

type Tab = "users" | "requests" | "financial" | "vip" | "messages" | "mag";

interface CoachData {
  applications: CoachApplication[];
  programs: CoachProgram[];
}

const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "ramagh1404";

export default function AdminPage() {
  const { lang } = useLang();
  const fa = lang === "fa";
  const feedback = useFeedbackList();
  const sessions = useSessions();
  const usage = useUsage();
  const analysis = useAnalysisThread();
  const [gateChecked, setGateChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [magArticles, setMagArticles] = useState<MagArticle[] | null>(null);
  const [now] = useState(() => Date.now());

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", {
      headers: { "x-admin-code": ADMIN_CODE },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    const res = await fetch("/api/messages", {
      headers: { "x-admin-code": ADMIN_CODE },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      setMessages(json.messages);
    }
  }, []);

  const loadMag = useCallback(async () => {
    const res = await fetch("/api/mag", {
      headers: { "x-admin-code": ADMIN_CODE },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      setMagArticles(json.articles);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setUnlocked(sessionStorage.getItem("ramagh-admin-ok") === "1");
      setGateChecked(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const id = window.setTimeout(() => {
      loadUsers().catch(() => setUsers([]));
      loadMessages().catch(() => setMessages([]));
      loadMag().catch(() => setMagArticles([]));
      fetchCoachData().then(setCoachData).catch(() => setCoachData({ applications: [], programs: [] }));
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadMag, loadMessages, loadUsers, unlocked]);

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      sessionStorage.setItem("ramagh-admin-ok", "1");
      setUnlocked(true);
      setWrong(false);
    } else {
      setWrong(true);
    }
  }

  if (!gateChecked) return <Spinner />;

  if (!unlocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#090b10] px-5">
        <form onSubmit={submitCode} className="w-full max-w-sm rounded-2xl bg-[#11151f] p-5 ring-1 ring-white/10">
          <p className="text-lg font-black text-ink">{fa ? "ورود مدیر" : "Admin Access"}</p>
          <p className="mt-1 text-xs text-muted">{fa ? "کد مدیریت را وارد کن." : "Enter the admin code."}</p>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setWrong(false);
            }}
            type="password"
            dir="ltr"
            className="mt-4 h-11 w-full rounded-xl bg-[#0b0f17] px-4 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-brand"
            placeholder="Admin code"
          />
          {wrong && <p className="mt-2 text-xs font-bold text-danger">{fa ? "کد درست نیست." : "Wrong code."}</p>}
          <Button type="submit" className="mt-4 w-full">
            {fa ? "ورود" : "Enter"}
          </Button>
        </form>
      </div>
    );
  }

  if (!feedback || !sessions || analysis === undefined || !users || !coachData || !messages || !magArticles) return <Spinner />;

  const pendingReceipts = users.filter((u) => u.vipStatus === "pending").length;
  const vipUsers = users.filter((u) => u.vipStatus === "vip" && (u.vipUntil ?? 0) > now).length;
  const analysisRequests = analysis.filter((m) => m.from === "user").length;
  const newMessages = messages.filter((m) => m.status === "new").length;

  return (
    <div className="min-h-dvh bg-[#090b10] text-ink" dir={fa ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Ramagh Admin</p>
            <h1 className="mt-1 text-2xl font-black">{fa ? "پنل مدیریت" : "Management Panel"}</h1>
            <p className="mt-1 text-sm text-muted">
              {fa ? "مدیریت کاربران، درخواست‌ها، رسیدها و VIP" : "Users, requests, receipts, and VIP operations"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label={fa ? "کاربران" : "Users"} value={users.length} />
            <Kpi label="VIP" value={vipUsers} />
            <Kpi label={fa ? "رسیدها" : "Receipts"} value={pendingReceipts} tone={pendingReceipts ? "warn" : "brand"} />
            <Kpi label={fa ? "پیام‌ها" : "Messages"} value={newMessages} tone={newMessages ? "warn" : "brand"} />
          </div>
        </header>

        <nav className="mt-5 flex gap-2 overflow-x-auto rounded-2xl bg-[#11151f] p-2 ring-1 ring-white/10">
          <TabButton active={tab === "users"} onClick={() => setTab("users")} icon="users" label={fa ? "کاربران" : "Users"} />
          <TabButton active={tab === "requests"} onClick={() => setTab("requests")} icon="message" label={fa ? "درخواست‌ها" : "Requests"} />
          <TabButton active={tab === "messages"} onClick={() => setTab("messages")} icon="mail" label={fa ? "پیام‌ها" : "Messages"} />
          <TabButton active={tab === "financial"} onClick={() => setTab("financial")} icon="store" label={fa ? "مالی و رسیدها" : "Financial"} />
          <TabButton active={tab === "vip"} onClick={() => setTab("vip")} icon="star" label={fa ? "VIP" : "VIP Users"} />
          <TabButton active={tab === "mag"} onClick={() => setTab("mag")} icon="library" label={fa ? "مجله" : "Magazine"} />
        </nav>

        <main className="mt-5">
          {tab === "users" && <UsersPanel users={users} onReload={loadUsers} />}
          {tab === "requests" && (
            <RequestsPanel
              feedback={feedback}
              analysis={analysis}
              coachData={coachData}
              usageCount={usage?.count ?? 0}
              sessionCount={sessions.length}
              analysisRequests={analysisRequests}
            />
          )}
          {tab === "financial" && <FinancialPanel users={users} onReload={loadUsers} />}
          {tab === "vip" && <VipPanel users={users} onReload={loadUsers} />}
          {tab === "messages" && <MessagesPanel messages={messages} users={users} onReloadMessages={loadMessages} />}
          {tab === "mag" && <MagPanel articles={magArticles} onReload={loadMag} />}
        </main>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "brand" }: { label: string; value: number; tone?: "brand" | "warn" }) {
  const { n } = useLang();
  return (
    <div className="min-w-28 rounded-xl bg-[#11151f] px-4 py-3 ring-1 ring-white/10">
      <p className={cn("tnum text-xl font-black", tone === "warn" ? "text-warn" : "text-brand")}>{n(value)}</p>
      <p className="text-[11px] font-bold text-muted">{label}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: "users" | "message" | "store" | "star" | "mail" | "library";
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors",
        active ? "bg-brand text-brandink" : "text-muted hover:bg-white/5 hover:text-ink"
      )}
    >
      <Icon name={icon} className="size-4" />
      {label}
    </button>
  );
}

function UsersPanel({ users, onReload }: { users: PublicUser[]; onReload: () => Promise<void> }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vipStatus, setVipStatus] = useState<"none" | "vip">("none");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email} ${u.vipStatus}`.toLowerCase().includes(q));
  }, [query, users]);

  async function createUser() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setNotice(fa ? "نام، ایمیل و رمز حداقل ۶ کاراکتر لازم است." : "Name, email, and 6+ character password are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE },
        body: JSON.stringify({ name, email, password, vipStatus }),
      });
      if (!res.ok) {
        setNotice(fa ? "ساخت کاربر انجام نشد. ایمیل تکراری یا نامعتبر است." : "Could not create user. Email may already exist.");
        return;
      }
      setName("");
      setEmail("");
      setPassword("");
      setVipStatus("none");
      setNotice(fa ? "کاربر ساخته شد." : "User created.");
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Panel title={fa ? "افزودن کاربر" : "Add User"}>
        <div className="space-y-3">
          <AdminInput value={name} onChange={setName} placeholder={fa ? "نام" : "Name"} />
          <AdminInput value={email} onChange={setEmail} placeholder="email@example.com" dir="ltr" />
          <AdminInput value={password} onChange={setPassword} placeholder={fa ? "رمز عبور" : "Password"} type="password" dir="ltr" />
          <select
            value={vipStatus}
            onChange={(e) => setVipStatus(e.target.value as "none" | "vip")}
            className="h-11 w-full rounded-xl bg-[#090b10] px-3 text-sm text-ink outline-none ring-1 ring-white/10"
          >
            <option value="none">{fa ? "General" : "General"}</option>
            <option value="vip">VIP</option>
          </select>
          <Button className="w-full" onClick={createUser} disabled={busy}>
            <Icon name="plus" className="size-4" />
            {fa ? "افزودن" : "Add user"}
          </Button>
          {notice && <p className="rounded-xl bg-white/5 p-3 text-xs font-bold text-muted">{notice}</p>}
        </div>
      </Panel>

      <Panel
        title={fa ? "کاربران" : "Users"}
        right={<AdminInput value={query} onChange={setQuery} placeholder={fa ? "جستجوی کاربر" : "Search users"} />}
      >
        <div className="space-y-3">
          {filtered.map((u) => (
            <UserRow key={u.id} user={u} onReload={onReload} />
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted">{fa ? "کاربری پیدا نشد." : "No users found."}</p>}
        </div>
      </Panel>
    </div>
  );
}

function UserRow({ user, onReload }: { user: PublicUser; onReload: () => Promise<void> }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [directMessage, setDirectMessage] = useState("");
  const vipUntil = user.vipUntil ? new Date(user.vipUntil).toLocaleDateString(fa ? "fa-IR" : "en-US") : null;

  async function act(action: "restrict" | "unrestrict" | "delete" | "message" | "activateVip" | "setGeneral" | "edit" | "resetPassword") {
    setBusy(true);
    setTempPassword(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE },
        body: JSON.stringify({ userId: user.id, action, message: directMessage, name, email }),
      });
      const json = await res.json();
      if (json.tempPassword) setTempPassword(json.tempPassword);
      if (res.ok) {
        setEditing(false);
        if (action === "message") setDirectMessage("");
        await onReload();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[#0d111a] p-4 ring-1 ring-white/10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <AdminInput value={name} onChange={setName} placeholder={fa ? "نام" : "Name"} />
              <AdminInput value={email} onChange={setEmail} placeholder="email@example.com" dir="ltr" />
            </div>
          ) : (
            <>
              <p className="truncate text-base font-black text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted" dir="ltr">{user.email}</p>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={user.role === "admin" ? "brand" : "muted"}>{user.role}</Badge>
            <Badge tone={user.restricted ? "danger" : "success"}>{user.restricted ? "restricted" : "active"}</Badge>
            <Badge tone={user.vipStatus === "vip" ? "brand" : user.vipStatus === "pending" ? "warn" : "muted"}>
              {user.vipStatus === "vip" && vipUntil ? `VIP until ${vipUntil}` : user.vipStatus}
            </Badge>
            {user.receiptSentAt && <Badge tone="warn">receipt</Badge>}
          </div>
          {user.adminMessage && <p className="mt-3 rounded-xl bg-warn-dim p-2 text-xs font-bold text-warn">{user.adminMessage}</p>}
          {tempPassword && <p className="mt-3 rounded-xl bg-success-dim p-2 text-xs font-bold text-success" dir="ltr">Temp password: {tempPassword}</p>}
          <div className="mt-3 flex gap-2">
            <input
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
              placeholder={fa ? "پیام داخل اپ برای این کاربر" : "In-app message to this user"}
              className="h-10 min-w-0 flex-1 rounded-xl bg-[#090b10] px-3 text-xs text-ink outline-none ring-1 ring-white/10 placeholder:text-faint focus:ring-brand"
            />
            <MiniAction onClick={() => act("message")} disabled={busy || !directMessage.trim()}>
              {fa ? "ارسال" : "Send"}
            </MiniAction>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[420px]">
          <MiniAction onClick={() => (editing ? act("edit") : setEditing(true))} disabled={busy}>
            {editing ? (fa ? "ذخیره" : "Save") : fa ? "ویرایش" : "Edit"}
          </MiniAction>
          <MiniAction onClick={() => act(user.vipStatus === "vip" ? "setGeneral" : "activateVip")} disabled={busy}>
            {user.vipStatus === "vip" ? "General" : "VIP"}
          </MiniAction>
          <MiniAction onClick={() => act(user.restricted ? "unrestrict" : "restrict")} disabled={busy}>
            {user.restricted ? "Unrestrict" : "Restrict"}
          </MiniAction>
          <MiniAction onClick={() => act("resetPassword")} disabled={busy}>Reset</MiniAction>
          <MiniAction danger onClick={() => act("delete")} disabled={busy}>Delete</MiniAction>
        </div>
      </div>
    </div>
  );
}

function RequestsPanel({
  feedback,
  analysis,
  coachData,
  usageCount,
  sessionCount,
  analysisRequests,
}: {
  feedback: NonNullable<ReturnType<typeof useFeedbackList>>;
  analysis: NonNullable<ReturnType<typeof useAnalysisThread>>;
  coachData: CoachData;
  usageCount: number;
  sessionCount: number;
  analysisRequests: number;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const latestAnalysis = [...analysis].reverse().slice(0, 8);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title={fa ? "درخواست‌های اپ" : "App Requests"}>
        <div className="grid grid-cols-2 gap-3">
          <Kpi label={fa ? "بازخورد" : "Feedback"} value={feedback.length} />
          <Kpi label={fa ? "آنالیز بدن" : "Body analysis"} value={analysisRequests} />
          <Kpi label={fa ? "تمرین‌ها" : "Sessions"} value={sessionCount} />
          <Kpi label={fa ? "مصرف اکشن" : "Usage"} value={usageCount} tone={usageCount >= FREE_USAGE_LIMIT ? "warn" : "brand"} />
        </div>
        <div className="mt-4 space-y-2">
          {feedback.slice(0, 8).map((f) => (
            <div key={f.id} className="rounded-xl bg-[#090b10] p-3 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={f.type === "bug" ? "danger" : f.type === "idea" ? "brand" : "muted"}>{f.type}</Badge>
                <span className="text-[10px] text-faint" dir="ltr">{new Date(f.createdAt).toLocaleString(fa ? "fa-IR" : "en-US")}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{f.message}</p>
              {f.contact && <p className="mt-1 text-xs font-bold text-brand" dir="ltr">{f.contact}</p>}
            </div>
          ))}
          {feedback.length === 0 && <p className="text-sm text-muted">{fa ? "بازخوردی نیست." : "No feedback yet."}</p>}
        </div>
      </Panel>

      <Panel title={fa ? "آنالیز بدن با AI" : "AI Body Analysis"}>
        <p className="mb-3 rounded-xl bg-brand/10 p-3 text-xs font-bold text-brand ring-1 ring-brand/20">
          {fa
            ? "پاسخ آنالیز بدن توسط AI ارسال می‌شود؛ پنل مدیر فقط تاریخچه درخواست‌ها را نشان می‌دهد."
            : "Body analysis replies are sent by AI. Admin only sees request history here."}
        </p>
        <div className="space-y-2">
          {latestAnalysis.map((m) => (
            <div key={m.id} className="rounded-xl bg-[#090b10] p-3 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <Badge tone={m.from === "user" ? "warn" : "brand"}>{m.from}</Badge>
                <span className="text-[10px] text-faint" dir="ltr">{new Date(m.createdAt).toLocaleString(fa ? "fa-IR" : "en-US")}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{m.text || (fa ? "بدون متن" : "No text")}</p>
              {m.images.length > 0 && <p className="mt-1 text-xs font-bold text-brand">{m.images.length} image(s)</p>}
            </div>
          ))}
          {latestAnalysis.length === 0 && <p className="text-sm text-muted">{fa ? "درخواستی نیست." : "No body-analysis requests."}</p>}
        </div>
      </Panel>

      <Panel title={fa ? "درخواست‌های مربی" : "Coach Requests"}>
        <CoachLists data={coachData} />
      </Panel>
    </div>
  );
}

function MessagesPanel({
  messages,
  users,
  onReloadMessages,
}: {
  messages: ContactMessage[];
  users: PublicUser[];
  onReloadMessages: () => Promise<void>;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ContactMessage["status"]>("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      const statusOk = status === "all" || m.status === status;
      const text = `${m.title} ${m.description} ${m.placeName ?? ""} ${m.placeId ?? ""} ${m.contactPhone} ${m.userEmail ?? ""}`.toLowerCase();
      return statusOk && (!q || text.includes(q));
    });
  }, [messages, query, status]);

  return (
    <Panel
      title={fa ? "پیام‌ها و گزارش‌ها" : "Messages and Reports"}
      right={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <AdminInput value={query} onChange={setQuery} placeholder={fa ? "جستجوی پیام، شماره یا ID" : "Search message, phone, or ID"} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | ContactMessage["status"])}
            className="h-11 rounded-xl bg-[#090b10] px-3 text-sm text-ink outline-none ring-1 ring-white/10"
          >
            <option value="all">{fa ? "همه" : "All"}</option>
            <option value="new">{fa ? "جدید" : "New"}</option>
            <option value="read">{fa ? "خوانده‌شده" : "Read"}</option>
            <option value="replied">{fa ? "پاسخ‌داده‌شده" : "Replied"}</option>
            <option value="closed">{fa ? "بسته" : "Closed"}</option>
          </select>
        </div>
      }
    >
      <div className="space-y-3">
        {filtered.map((m) => {
          const user = m.userId ? users.find((u) => u.id === m.userId) : null;
          return <MessageRow key={m.id} message={m} user={user ?? null} onReload={onReloadMessages} />;
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            {fa ? "پیامی پیدا نشد." : "No messages found."}
          </p>
        )}
      </div>
    </Panel>
  );
}

function MessageRow({
  message,
  user,
  onReload,
}: {
  message: ContactMessage;
  user: PublicUser | null;
  onReload: () => Promise<void>;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(status: ContactMessage["status"], adminReply?: string | null) {
    setBusy(true);
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE },
        body: JSON.stringify({ id: message.id, status, adminReply }),
      });
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  async function sendInApp() {
    if (!user || !reply.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE },
        body: JSON.stringify({ userId: user.id, action: "message", message: reply.trim() }),
      });
      await update("replied", reply.trim());
      setReply("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[#0d111a] p-4 ring-1 ring-white/10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={message.status === "new" ? "warn" : message.status === "replied" ? "success" : "muted"}>{message.status}</Badge>
            <Badge tone={message.kind === "problem" ? "danger" : "brand"}>{message.kind}</Badge>
            <Badge tone="muted">{message.source}</Badge>
            <span className="text-[10px] text-faint" dir="ltr">{new Date(message.createdAt).toLocaleString(fa ? "fa-IR" : "en-US")}</span>
          </div>
          <p className="mt-3 text-base font-black text-ink">{message.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{message.description}</p>
          <div className="mt-3 grid gap-2 text-xs text-faint sm:grid-cols-2">
            <Info label={fa ? "مکان" : "Place"} value={message.placeName ?? "-"} />
            <Info label="ID" value={message.placeId ?? "-"} dir="ltr" />
            <Info label={fa ? "شماره مکان" : "Place phone"} value={message.placePhone ?? "-"} dir="ltr" />
            <Info label={fa ? "شماره تماس" : "Callback"} value={message.contactPhone} dir="ltr" />
            <Info label={fa ? "نام تماس" : "Contact name"} value={message.contactName || "-"} />
            <Info label={fa ? "کاربر" : "User"} value={message.userEmail ?? (fa ? "مهمان" : "Guest")} dir="ltr" />
          </div>
          {message.adminReply && (
            <p className="mt-3 rounded-xl bg-brand/10 p-2 text-xs font-bold text-brand ring-1 ring-brand/20">
              {message.adminReply}
            </p>
          )}
        </div>
        <div className="lg:w-80">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder={user ? (fa ? "پاسخ داخل اپ برای کاربر" : "In-app reply to user") : (fa ? "این پیام کاربر متصل ندارد" : "No linked app user")}
            disabled={!user || busy}
            className="w-full resize-none rounded-xl bg-[#090b10] px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10 placeholder:text-faint focus:ring-brand disabled:opacity-50"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniAction onClick={sendInApp} disabled={!user || !reply.trim() || busy}>
              {fa ? "ارسال داخل اپ" : "Send in app"}
            </MiniAction>
            <MiniAction onClick={() => update("read")} disabled={busy}>
              {fa ? "خوانده شد" : "Read"}
            </MiniAction>
            <MiniAction onClick={() => update("closed")} disabled={busy}>
              {fa ? "بستن" : "Close"}
            </MiniAction>
            {message.contactPhone && (
              <a
                href={`tel:${message.contactPhone}`}
                className="rounded-xl bg-emerald-500/15 px-3 py-2 text-center text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/25"
              >
                {fa ? "تماس" : "Call"}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="rounded-xl bg-[#090b10] p-2 ring-1 ring-white/10">
      <p className="text-[10px] font-bold text-faint">{label}</p>
      <p className="mt-0.5 truncate font-bold text-muted" dir={dir}>{value}</p>
    </div>
  );
}

function MagPanel({ articles, onReload }: { articles: MagArticle[]; onReload: () => Promise<void> }) {
  const { lang, n } = useLang();
  const fa = lang === "fa";
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState<MagArticle["category"]>("اخبار");
  const [image, setImage] = useState("");
  const [keywords, setKeywords] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<MagArticle["status"]>("published");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function publish() {
    if (!title.trim() || !excerpt.trim() || !body.trim()) {
      setNotice(fa ? "عنوان، خلاصه و متن مقاله لازم است." : "Title, excerpt, and body are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/mag", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE },
        body: JSON.stringify({ title, excerpt, category, image, keywords, body, status }),
      });
      if (!res.ok) {
        setNotice(fa ? "انتشار مقاله انجام نشد." : "Could not publish article.");
        return;
      }
      setTitle("");
      setExcerpt("");
      setImage("");
      setKeywords("");
      setBody("");
      setStatus("published");
      setNotice(fa ? "مقاله ذخیره شد." : "Article saved.");
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Panel title={fa ? "انتشار مقاله" : "Publish Article"}>
        <div className="space-y-3">
          <AdminInput value={title} onChange={setTitle} placeholder={fa ? "عنوان مقاله" : "Article title"} />
          <AdminInput value={excerpt} onChange={setExcerpt} placeholder={fa ? "خلاصه سئو" : "SEO excerpt"} />
          <AdminInput value={image} onChange={setImage} placeholder={fa ? "آدرس عکس بنر اختیاری" : "Optional banner image URL"} dir="ltr" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MagArticle["category"])}
            className="h-11 w-full rounded-xl bg-[#090b10] px-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-brand"
          >
            {["باشگاه", "استخر", "مکمل", "برنامه تمرین", "تغذیه", "چربی‌سوزی", "سلامت", "اخبار"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <AdminInput value={keywords} onChange={setKeywords} placeholder={fa ? "کلمات کلیدی با کاما" : "Keywords, comma separated"} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            placeholder={fa ? "متن مقاله؛ هر پاراگراف را با یک خط خالی جدا کن." : "Article body; separate paragraphs with a blank line."}
            className="w-full resize-none rounded-xl bg-[#090b10] px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10 placeholder:text-faint focus:ring-brand"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MagArticle["status"])}
            className="h-11 w-full rounded-xl bg-[#090b10] px-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-brand"
          >
            <option value="published">{fa ? "انتشار" : "Published"}</option>
            <option value="draft">{fa ? "پیش‌نویس" : "Draft"}</option>
          </select>
          {notice && <p className="text-xs font-bold text-brand">{notice}</p>}
          <Button onClick={publish} disabled={busy} className="w-full">
            {busy ? (fa ? "در حال ذخیره..." : "Saving...") : fa ? "ذخیره مقاله" : "Save Article"}
          </Button>
        </div>
      </Panel>

      <Panel title={fa ? "مقاله‌های مجله" : "Magazine Articles"} right={<Badge tone="brand">{n(articles.length)}</Badge>}>
        <div className="space-y-3">
          {articles.slice(0, 40).map((article) => (
            <div key={article.id} className="rounded-xl bg-[#090b10] p-3 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={article.status === "published" ? "success" : "muted"}>{article.status}</Badge>
                <Badge tone="brand">{article.category}</Badge>
                <span className="text-[10px] text-faint" dir="ltr">{article.publishedAt}</span>
              </div>
              <p className="mt-2 text-sm font-black text-ink">{article.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{article.excerpt}</p>
              {article.status === "published" && (
                <a href={`/mag/${article.slug}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-brand" dir="ltr">
                  /mag/{article.slug}
                </a>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function FinancialPanel({ users, onReload }: { users: PublicUser[]; onReload: () => Promise<void> }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const pending = users.filter((u) => u.vipStatus === "pending");
  const paid = users.filter((u) => u.vipStatus === "vip");
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Panel title={fa ? "رسیدهای در انتظار" : "Pending Receipts"}>
        <div className="space-y-3">
          {pending.map((u) => (
            <UserRow key={u.id} user={u} onReload={onReload} />
          ))}
          {pending.length === 0 && <p className="py-8 text-center text-sm text-muted">{fa ? "رسید جدیدی نیست." : "No pending receipts."}</p>}
        </div>
      </Panel>
      <Panel title={fa ? "خلاصه مالی" : "Financial Summary"}>
        <div className="space-y-3">
          <Kpi label={fa ? "مبلغ ماهانه" : "Monthly price"} value={VIP_PLAN_PRICE_TOMAN} />
          <Kpi label={fa ? "رسیدها" : "Pending"} value={pending.length} tone={pending.length ? "warn" : "brand"} />
          <Kpi label={fa ? "VIP فعال/ثبت‌شده" : "VIP users"} value={paid.length} />
        </div>
      </Panel>
    </div>
  );
}

function VipPanel({ users, onReload }: { users: PublicUser[]; onReload: () => Promise<void> }) {
  const active = users.filter((u) => u.vipStatus === "vip");
  return (
    <Panel title="VIP Users">
      <div className="space-y-3">
        {active.map((u) => <UserRow key={u.id} user={u} onReload={onReload} />)}
        {active.length === 0 && <p className="py-8 text-center text-sm text-muted">No VIP users yet.</p>}
      </div>
    </Panel>
  );
}

function CoachLists({ data }: { data: CoachData }) {
  const { lang, n } = useLang();
  const fa = lang === "fa";
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold text-faint">{fa ? "درخواست مربی" : "Coach applications"} · {n(data.applications.length)}</p>
        <div className="space-y-2">
          {data.applications.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl bg-[#090b10] p-3 ring-1 ring-white/10">
              {a.photoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(a.photoId)!} alt="" className="size-11 rounded-full object-cover" />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-full bg-white/5 text-faint"><Icon name="user" className="size-5" /></span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{a.name}</p>
                <p className="truncate text-xs text-muted">{a.cred}{a.city && ` · ${a.city}`}</p>
                <p className="mt-1 text-[11px] text-faint" dir="ltr">{[a.phone, a.instagram && `@${a.instagram}`, a.email].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          ))}
          {data.applications.length === 0 && <p className="text-sm text-muted">{fa ? "درخواستی نیست." : "No applications."}</p>}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-faint">{fa ? "برنامه‌های ارسالی" : "Submitted plans"} · {n(data.programs.length)}</p>
        <div className="space-y-2">
          {data.programs.map((p) => (
            <div key={p.id} className="rounded-xl bg-[#090b10] p-3 ring-1 ring-white/10">
              <p className="text-sm font-bold text-ink">{p.title}</p>
              <p className="text-xs text-muted">{p.coachName}{p.goal && ` · ${p.goal}`}</p>
            </div>
          ))}
          {data.programs.length === 0 && <p className="text-sm text-muted">{fa ? "برنامه‌ای نیست." : "No plans."}</p>}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#11151f] p-4 ring-1 ring-white/10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-black text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function AdminInput({
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      dir={dir}
      className="h-11 w-full rounded-xl bg-[#090b10] px-3 text-sm text-ink outline-none ring-1 ring-white/10 placeholder:text-faint focus:ring-brand"
    />
  );
}

function Badge({ tone, children }: { tone: "brand" | "success" | "warn" | "danger" | "muted"; children: React.ReactNode }) {
  const cls = {
    brand: "bg-brand/15 text-brand ring-brand/25",
    success: "bg-success-dim text-success ring-success/25",
    warn: "bg-warn-dim text-warn ring-warn/25",
    danger: "bg-danger-dim text-danger ring-danger/25",
    muted: "bg-white/5 text-faint ring-white/10",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${cls}`}>{children}</span>;
}

function MiniAction({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl px-3 py-2 text-[11px] font-bold ring-1 disabled:opacity-50",
        danger ? "bg-danger-dim text-danger ring-danger/25" : "bg-white/5 text-ink ring-white/10 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}
