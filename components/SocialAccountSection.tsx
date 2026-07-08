"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import UserAvatar from "./UserAvatar";
import { useLang } from "./LangProvider";
import { cn } from "./ui";
import { useSocial } from "@/lib/hooks";
import { saveSocial } from "@/lib/db";
import { USER_AVATARS, SKIN_TONES, avatarPreset } from "@/lib/avatars";

export default function SocialAccountSection() {
  const { t, n } = useLang();
  const social = useSocial();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarId, setAvatarId] = useState(0);
  const [skin, setSkin] = useState(SKIN_TONES[1]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (social) {
      setUsername(social.username);
      setAvatarId(social.avatarId);
      setSkin(social.skin);
    }
  }, [social]);

  if (social === undefined) return null; // loading

  async function save() {
    if (!username.trim()) return;
    await saveSocial({
      username: username.trim(),
      avatarId,
      skin,
      gender: avatarPreset(avatarId).gender,
    });
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  // Compact "identity card" once set up (and not editing).
  if (social && !editing) {
    return (
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-bold text-ink">{t("soc.account")}</h2>
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-line">
          <UserAvatar avatarId={social.avatarId} skin={social.skin} size="size-14" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink">{social.username}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-brand">
              <Icon name="verified" className="size-3.5" /> {t("soc.member")}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-faint" dir="ltr">
              {t("soc.userId")}: {social.userId}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-shrink-0 rounded-full bg-card2 p-2 text-muted ring-1 ring-line"
            aria-label={t("soc.edit")}
          >
            <Icon name="edit" className="size-4" />
          </button>
        </div>
        {saved && <p className="mt-2 text-xs font-bold text-success">{t("soc.saved")}</p>}
      </div>
    );
  }

  // Setup / edit form
  return (
    <div className="mt-5">
      <h2 className="mb-2 text-sm font-bold text-ink">{social ? t("soc.edit") : t("soc.setup")}</h2>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
        {!social && <p className="mb-3 text-xs text-muted">{t("soc.setupHint")}</p>}

        {/* username */}
        <label className="text-[11px] font-bold text-faint">{t("soc.username")}</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("soc.usernamePh")}
          maxLength={30}
          className="mt-1 w-full rounded-xl bg-base2 px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-line focus:ring-brand"
        />

        {/* avatar grid */}
        <p className="mt-4 text-[11px] font-bold text-faint">{t("soc.pickAvatar")}</p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {USER_AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvatarId(a.id)}
              className={cn(
                "rounded-2xl p-1 ring-2 transition-all",
                avatarId === a.id ? "ring-brand" : "ring-transparent hover:ring-line"
              )}
            >
              <UserAvatar avatarId={a.id} skin={skin} size="size-full aspect-square" ring={false} />
            </button>
          ))}
        </div>

        {/* skin tone */}
        <p className="mt-4 text-[11px] font-bold text-faint">{t("soc.skin")}</p>
        <div className="mt-2 flex gap-2">
          {SKIN_TONES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSkin(s)}
              className={cn(
                "size-8 rounded-full ring-2 transition-transform active:scale-90",
                skin === s ? "ring-brand" : "ring-line"
              )}
              style={{ background: s }}
              aria-label={s}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!username.trim()}
          className="mt-4 w-full rounded-2xl bg-brand py-2.5 text-sm font-bold text-brandink disabled:bg-card2 disabled:text-faint"
        >
          {t("soc.save")}
        </button>
        {social && (
          <button type="button" onClick={() => setEditing(false)} className="mt-2 w-full py-1 text-xs font-semibold text-faint">
            {t("common.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
