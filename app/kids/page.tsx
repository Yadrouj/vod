import type { Metadata } from "next";
import { KidsSpace } from "@/components/kids-space";
import { loadKidsCatalog } from "@/lib/kids-catalog";
export const revalidate = 300;
export const metadata: Metadata = { title: "دنیای کودک؛ بازی، قصه و یادگیری", description: "فیلم، سریال، شعر، لالایی و آموزش کودک با انتخاب والدین، گروه‌بندی سنی و زمان‌بندی پخش.", alternates: { canonical: "/kids" } };
export default async function KidsPage() { return <KidsSpace items={await loadKidsCatalog()} />; }
