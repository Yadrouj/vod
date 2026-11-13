import { titleMetadata } from '@/lib/seo';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { ...titleMetadata({ title: 'پلی‌لیست اشتراکی موسیقی', description: 'صفحهٔ یک پلی‌لیست کاربری در سرونما؛ آهنگ‌ها و دسترسی مطابق تنظیمات سازنده نمایش داده می‌شوند.', pathname: `/music/playlists/${encodeURIComponent(id)}` }), robots: { index: false, follow: true } };
}
export default function SharedPlaylistLayout({ children }: { children: React.ReactNode }) { return children; }
