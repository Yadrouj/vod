import Link from 'next/link';
import { DeveloperConsole } from '@/components/developer-console';
import { cryptoReady } from '@/lib/mcp/payments';
import { titleMetadata } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export const metadata = titleMetadata({ title: 'MCP و API سرونما برای توسعه‌دهندگان', description: 'اتصال دستیارها و برنامه‌ها به موتور جستجوی فیلم، سریال و موسیقی سرونما؛ کلید رایگان، مصرف شفاف و پلن‌های USDT روی شبکه BEP-20.', pathname: '/developers' });
export default function DevelopersPage() { return <main className="wrap" dir="rtl" style={{ paddingTop: 40 }}><Link href="/">← سرونما</Link><h1>موتور جستجوی سرونما برای برنامهٔ تو</h1><p>فیلم، سریال و موسیقی را با نام فارسی یا اصلی پیدا کن؛ اصلاح املایی، اطلاعات اثر و لینک صفحه‌های خود سرونما را در محصولت داشته باش.</p><DeveloperConsole paymentsEnabled={cryptoReady()} /><p><a href="https://github.com/Yadrouj/vod/tree/main/integrations/mcp">کد و راهنمای اتصال در گیت‌هاب</a></p></main>; }
