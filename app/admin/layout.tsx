import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, validAdminSession, adminConfigured } from '@/lib/admin-auth';
import { AdminLogin } from '@/components/admin-login';
export const metadata: Metadata = { title: 'مدیریت سرونما', robots: { index: false, follow: false } };
export const dynamic='force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if(!validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value))return <AdminLogin configured={adminConfigured()} />;
  return children;
}
