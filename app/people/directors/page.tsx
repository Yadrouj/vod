import { CreatorDirectory } from '@/components/creator-directory';
import { loadCreatorProfiles } from '@/lib/creator-profiles';
import { titleMetadata } from '@/lib/seo';

export const metadata = titleMetadata({ title:'۱۰۰ کارگردان برجستهٔ سینما؛ پروفایل و آثار', description:'انتخاب مستقل ۱۰۰ کارگردان ایرانی و جهانی با معرفی، عکس و تمام آثار مرتبطِ ثبت‌شده در سرونما؛ تفکیک آثار کارگردانی از دیگر ارتباط‌ها.',pathname:'/people/directors' });
export default async function DirectorsPage({searchParams}:{searchParams:Promise<{q?:string;available?:string}>}) {
  const [data,params]=await Promise.all([loadCreatorProfiles(),searchParams]);
  return <CreatorDirectory profiles={data.directors} kind="director" query={typeof params.q === 'string' ? params.q : ''} available={params.available==='1'} />;
}
