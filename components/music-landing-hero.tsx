"use client";
import Link from 'next/link';
import { Play, Headphones, Disc3 } from 'lucide-react';
import { useState } from 'react';
import { SearchSuggest } from '@/components/search-suggest';
import { WatchTogetherLauncher } from './watch-together-launcher';
import { mirroredImageUrl } from '@/lib/image-url';
import styles from './iranian-music-hero.module.css';
export type MusicHeroTrack={id:string;title:string;persianTitle:string;coverUrl:string|null;kind:'track'|'video'|'album';artists:Array<{name:string}>};
export type MusicArchiveStats={tracks:number;artists:number;videos:number};
type Props={tracks:MusicHeroTrack[];archiveStats?:MusicArchiveStats;initialQuery?:string;initialKind?:string;iranian?:boolean};
const moods=[['north-road','جاده شمال'],['friendship','رفاقت و دوستی'],['northern','شمالی'],['kurdish','کردی'],['lori','لری'],['rain','بارونی']];
export function MusicLandingHero({tracks,archiveStats,initialQuery='',initialKind='all',iranian=true}:Props){
 const [index,setIndex]=useState(0),track=tracks[index%Math.max(1,tracks.length)];
 const title=track?.persianTitle||track?.title||'موسیقی سرونما',artist=track?.artists.map(a=>a.name).join(' · ')||'';
 return <section className={styles.hero} aria-label="کشف موسیقی" dir="rtl">
  <div className={styles.copy}><span className={styles.kicker}><Headphones size={17}/> سرونما موزیک · انتخابِ حال خوب</span>
   <h1>{initialQuery?'آهنگت همین نزدیکی‌ست.':iranian?<>از جاده شمال،<br/><em>تا حالِ خوبِ رفاقت.</em></>:'هر روز، یک کشف تازه.'}</h1>
   <p>یه آهنگ برای خودت؛ یه پلی‌لیست برای با هم بودن.<br/>ایرانی، محلی، خاطره‌انگیز یا تازه—از همین‌جا شروع کن.</p>
   <form className={styles.search} action="/music" role="search">
    <SearchSuggest defaultValue={initialQuery} placeholder="آهنگ، خواننده یا حال‌وهوا…" locale="fa" endpoint="/api/music/search" hrefForItem={item=>'/music/'+item.imdbCode} viewAllHref={q=>'/music?q='+encodeURIComponent(q)} portal maxItems={10}/>
    <select name="kind" defaultValue={initialKind} aria-label="نوع محتوا"><option value="all">همه</option><option value="track">آهنگ</option><option value="video">موزیک‌ویدیو</option></select><button type="submit">جست‌وجو</button>
   </form>
   <nav className={styles.moods} aria-label="حال‌وهوای موسیقی ایرانی">{moods.map(([id,label])=><Link key={id} href={'/music/collections/iranian-'+id} prefetch={false}>{label}</Link>)}</nav>
   <div className={styles.footer}><Link href="/music/collections">کشف ۲۰ پلی‌لیست ایرانی</Link><span>انتخاب کن، پخش کن، هم‌صدا شو.</span></div>
  </div>
  {track&&<div className={styles.feature}>
   <div className={styles.stack} aria-hidden="true">{tracks.slice(1,3).map((t,i)=><div className={i?styles.backTwo:styles.backOne} key={t.id}>{t.coverUrl&&<img src={mirroredImageUrl(t.coverUrl)} alt="" loading="lazy"/>}</div>)}</div>
   <Link className={styles.art} href={'/music/'+track.id} aria-label={'پخش '+title}>{track.coverUrl?<img src={mirroredImageUrl(track.coverUrl)} alt={title} fetchPriority="high" decoding="async"/>:<Disc3 size={90}/>}<span className={styles.play}><Play fill="currentColor" size={28}/></span><span className={styles.artLabel}>انتخاب برای شنیدن</span></Link>
   <div className={styles.caption}><div><Link href={'/music/'+track.id}><strong>{title}</strong></Link><span>{artist}</span></div>{tracks.length>1&&<button onClick={()=>setIndex(i=>(i+1)%tracks.length)} type="button" aria-label="انتخاب قطعه بعدی">بعدی</button>}</div>
   <WatchTogetherLauncher locale="fa" placement="inline" experience="listen" preset={{itemId:track.id,title,posterUrl:track.coverUrl}}/>
  </div>}
  {archiveStats&&<p className={styles.archive}>{archiveStats.tracks.toLocaleString('fa-IR')} آهنگ در آرشیو · {archiveStats.artists.toLocaleString('fa-IR')} هنرمند</p>}
 </section>;
}
