import { CreatorDirectory } from '@/components/creator-directory';
import { loadCreatorProfiles } from '@/lib/creator-profiles';
import { titleMetadata } from '@/lib/seo';

export const metadata = titleMetadata({ title:'۱۰۰ خوانندهٔ برجسته؛ معرفی و آهنگ‌ها', description:'۱۰۰ انتخاب مستقل از خوانندگان ایرانی و جهانی، پروفایل اختصاصی، آثار موجود در سرونما و معرفیِ نام و کاور آثار غایب؛ بدون لینک پخش ساختگی.',pathname:'/music/artists/top-100' });
export default async function TopSingersPage({searchParams}:{searchParams:Promise<{q?:string;available?:string}>}) {
  const [data,params]=await Promise.all([loadCreatorProfiles(),searchParams]);
  return <CreatorDirectory profiles={data.singers} kind="singer" query={typeof params.q === 'string' ? params.q : ''} available={params.available==='1'} />;
}
