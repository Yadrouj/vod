import type { Metadata } from "next";
import { KidsSpace } from "@/components/kids-space";
import { loadKidsCatalog } from "@/lib/kids-catalog";
export const revalidate = 300;
export const metadata: Metadata = { title: "آموزش کودک؛ زبان، عدد، رنگ و قصه", alternates: { canonical: "/kids/learn" } };
export default async function KidsLearnPage() { return <KidsSpace items={await loadKidsCatalog()} learning />; }
