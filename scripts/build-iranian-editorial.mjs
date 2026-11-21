import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const norm=value=>String(value||'').normalize('NFKC').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').toLowerCase();
export function buildIranianEditorial(tracks,now=new Date()){
 const usable=tracks.filter(t=>t.kind==='track'&&t.sources?.some(s=>s.available!==false&&/^https:\/\//.test(s.url))&&/فارسی|ایرانی|آهنگ|ریمیکس|قدیمی|پاپ/.test(norm(t.category)));
 const text=t=>norm([t.title,t.persianTitle,t.category,...t.moods||[],...t.album?.genres||[]].join(' '));
 const tags=t=>norm([t.category,...t.moods||[],...t.album?.genres||[]].join(' '));
 const old=t=>/قدیمی|نوستالژی/.test(tags(t));
 const regional=(name,t)=>new RegExp(`(?:^|[ (])${name}(?=$|[ )])`).test(tags(t))||new RegExp(`(?:آهنگ|ریمیکس|موسیقی) ${name}|\\(${name}\\)`).test(text(t));
 const definitions=[
  ['north-road','جاده شمال',t=>/شمال|چالوس|جاده|سفر|دریا/.test(text(t))],
  ['friendship','رفاقت و دوستی',t=>/رفیق|رفاقت|دوستی/.test(text(t))],
  ['northern','آواهای شمالی',t=>/گیلکی|مازندرانی/.test(text(t))||regional('شمالی',t)],
  ['kurdish','گلچین کردی',t=>regional('کردی',t)||regional('کوردی',t)||/کوردی/.test(tags(t))],
  ['lori','گلچین لری',t=>regional('لری',t)],
  ['sea','بریم لب دریا',t=>/دریا|ساحل|بندر/.test(text(t))],
  ['rain','هوای بارونی',t=>/باران|بارون/.test(text(t))],
  ['night-road','جاده در شب',t=>/شب|جاده|چراغ/.test(text(t))],
  ['travel','همسفر من',t=>/سفر|مسافر|جاده|همسفر/.test(text(t))],
  ['romance','کنار تو',t=>/عاشق|عشق|عاشقانه/.test(text(t))],
  ['missing-you','دلتنگی‌های آروم',t=>/دلتنگ|تنهایی|دوری/.test(text(t))],
  ['old-friends','رفیق قدیمی',t=>old(t)&&/رفیق|رفاقت|دوستی/.test(text(t))],
  ['nostalgia','خاطره‌های ما',old],
  ['remix','ریمیکس؛ ضرب بعدی',t=>/ریمیکس|remix/.test(tags(t))],
  ['dance','حال خوب دورهمی',t=>/شاد|رقص|پارتی|ریمیکس/.test(tags(t))],
  ['spring','بوی بهار',t=>/بهار|نوروز|عید/.test(text(t))],
  ['autumn','عصر پاییزی',t=>/پاییز|پائیز|برگ/.test(text(t))],
  ['winter','هوای زمستون',t=>/زمستان|زمستون|برف/.test(text(t))],
  ['city','چراغ‌های شهر',t=>/شهر|کوچه|خیابون|خیابان/.test(text(t))],
  ['heartbreak','وقتی دلت گرفته',t=>/غم|اشک|بغض|شکست/.test(text(t))],
  ['classic-love','عاشقانه‌های قدیمی',t=>old(t)&&/عشق|عاشق|دوستت/.test(text(t))],
  ['weekend','آخر هفته با هم',()=>true],
  ['home','خونه و خاطره',t=>/خونه|خانه|خاطره/.test(text(t))],
 ];
 const playlists=[],selected=new Map(),sets=new Set();
 for(const [mood,title,accept]of definitions){
  const candidates=usable.filter(accept),members=[],artists=new Map();
  for(const track of candidates){
   const artist=track.artist?.slug||track.artists?.[0]?.slug||track.id;
   if((artists.get(artist)||0)>=3)continue;
   members.push(track);artists.set(artist,(artists.get(artist)||0)+1);selected.set(track.id,{...track,description:null});
   if(members.length===24)break;
  }
  if(!members.length)continue;
  const signature=members.map(t=>t.id).sort().join(',');if(sets.has(signature))continue;sets.add(signature);
  playlists.push({id:`iranian-${mood}`,title,scope:'iranian',mood,description:['northern','kurdish','lori'].includes(mood)?'گزیدهٔ آرشیو با برچسب صریح منطقه یا زبان در اطلاعات ناشر؛ شامل اجراها و ریمیکس‌های برچسب‌خورده. تعداد قطعات فعلاً محدود است.':'گلچین تحریریه از آهنگ‌های موجود، با توجه به عنوان و برچسب‌های آرشیو؛ نام مجموعه یک حال‌وهواست، نه رتبه‌بندی رسمی یا ژانر همهٔ آهنگ‌ها. پیش از حرکت صف پخش را انتخاب کن.',trackIds:members.map(t=>t.id),covers:[...new Set(members.map(t=>t.coverUrl).filter(Boolean))].slice(0,4),artistCount:artists.size,selection:'curated-mood',updatedAt:now.toISOString()});
  if(playlists.length===20)break;
 }
 return {version:1,updatedAt:now.toISOString(),playlists,tracks:[...selected.values()].filter(t=>playlists.some(p=>p.trackIds.includes(t.id)))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const source=JSON.parse(await readFile('public/data/music-index.json','utf8'));
 const result=buildIranianEditorial(source.tracks);
 if(result.playlists.length<20)throw new Error('Not enough distinct evidenced selections; never fill with unrelated songs.');
 await writeFile('lib/data/iranian-music-selections.json',JSON.stringify(result));
 console.log(JSON.stringify({playlists:result.playlists.map(p=>({id:p.id,title:p.title,tracks:p.trackIds.length})),uniqueTracks:result.tracks.length}));
}
