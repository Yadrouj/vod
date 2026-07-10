"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import UserAvatar from "./UserAvatar";
import { useLang } from "./LangProvider";
import { BODYBUILDING_CELEBRITIES } from "@/lib/bodybuildingCelebrities";
import { fetchFeed, timeAgo, type Post } from "@/lib/social";

export default function MarketSocialBox({ onOpenSocial }: { onOpenSocial: () => void }) {
  const { lang } = useLang();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchFeed()
      .then((items) => setPosts(items.slice(0, 4)))
      .catch(() => setPosts([]));
  }, []);

  return (
    <section className="mt-4 overflow-hidden rounded-3xl bg-card ring-1 ring-brand/25">
      <div className="bg-gradient-to-br from-brand/24 via-card to-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-black text-brandink">
              <Icon name="users" className="size-3.5" />
              شبکه اجتماعی رمق
            </div>
            <h2 className="mt-3 text-xl font-black leading-snug text-ink">
              تمرین‌ها، برنامه‌ها و حال‌وهوای بدنسازها همین‌جاست
            </h2>
            <p className="mt-2 text-xs leading-6 text-muted">
              پروفایل بساز، تمرین امروزت را بفرست، برنامه مربی‌ها را ببین و پیج بدنسازهای مطرح ایرانی را سریع پیدا کن.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSocial}
            className="flex-shrink-0 rounded-2xl bg-brand px-4 py-3 text-xs font-black text-brandink shadow-[0_10px_30px_-12px_rgb(184_242_74/0.9)]"
          >
            ورود
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat value={`${BODYBUILDING_CELEBRITIES.length}+`} label="پروفایل عمومی" />
          <Stat value="۱-۳۰ د" label="آپدیت رندوم" />
          <Stat value="۱۱ تا ۲۳:۳۰" label="فعال تهران" />
        </div>
      </div>

      <div className="border-t border-line/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-black text-ink">بدنسازهای معروف در اینستاگرام</h3>
          <span className="text-[10px] font-bold text-faint">پروفایل‌های عمومی</span>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {BODYBUILDING_CELEBRITIES.map((person) => (
            <a
              key={person.instagram}
              href={person.url}
              target="_blank"
              rel="noreferrer"
              className="w-48 flex-shrink-0 rounded-2xl bg-card2 p-3 ring-1 ring-line transition-colors hover:bg-base"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/25 to-brand/20 text-pink-300 ring-1 ring-white/10">
                  <Icon name="instagram" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink">{person.name}</p>
                  <p className="truncate text-[11px] font-bold text-brand" dir="ltr">@{person.instagram}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted">{person.note}</p>
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-line/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-black text-ink">الان در رمق چه خبره؟</h3>
          <button type="button" onClick={onOpenSocial} className="text-xs font-black text-brand">
            دیدن همه
          </button>
        </div>
        <div className="space-y-2">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
                <div className="flex items-start gap-2">
                  <UserAvatar avatarId={post.avatarId} skin={post.skin} size="size-9" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-ink">{post.name}</p>
                      <span className="text-[10px] font-bold text-faint">{timeAgo(post.createdAt, lang)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{post.text}</p>
                    {post.gymName && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-brand">
                        <Icon name="pin" className="size-3" />
                        {post.gymName}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-card px-2 py-1 text-[10px] font-bold text-faint ring-1 ring-line">
                    {post.type === "program" ? "برنامه" : post.type === "activity" ? "تمرین" : post.type === "photo" ? "عکس" : "حال"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-card2 p-4 text-center text-xs leading-6 text-muted ring-1 ring-line">
              هنوز پستی نیامده؛ اولین نفر باش و حال تمرین امروزت را بفرست.
            </p>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/profile" className="rounded-xl bg-brand px-4 py-3 text-center text-xs font-black text-brandink">
            ساخت پروفایل
          </Link>
          <Link href="/club" className="rounded-xl bg-card2 px-4 py-3 text-center text-xs font-black text-ink ring-1 ring-line">
            جدول امتیازها
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3 text-center ring-1 ring-white/10">
      <p className="text-sm font-black text-ink">{value}</p>
      <p className="mt-1 text-[10px] font-bold text-muted">{label}</p>
    </div>
  );
}
