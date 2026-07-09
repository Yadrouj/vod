import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeLocale(body.locale);
  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR,
    path: "/",
    sameSite: "lax",
  });

  return Response.json({ locale });
}
