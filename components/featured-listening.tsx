"use client";
import Link from 'next/link';
import {Play,Disc3} from 'lucide-react';
import type {MusicTrack} from '@/lib/music-types';
import {useMusicPlayback} from './music-playback-provider';
import {mirroredImageUrl} from '@/lib/image-url';
import styles from './featured-listening.module.css';
export function FeaturedListening({tracks}:{tracks:MusicTrack[]}){
 const {play}=useMusicPlayback();
 return <section className={styles.section} aria-label="دو اجرای خداحافظ ای جوانی من"><header><div><span>انتخاب برای امروز</span><h2>یک ترانه، دو روایت</h2><p>«خداحافظ ای جوانی من»؛ با دو صدای متفاوت. انتخاب کن و پخش کن.</p></div></header><div className={styles.grid}>{tracks.map(t=><article className={styles.card} key={t.id}>{t.coverUrl?<img src={mirroredImageUrl(t.coverUrl)} alt="" width={90} height={90} decoding="async"/>:<Disc3 size={50}/>}<div><Link href={'/music/'+t.id}><h3>{t.persianTitle||t.title}</h3></Link><p>{t.artists.map(a=>a.name).join(' · ')}</p><a href={t.sourceUrl} target="_blank" rel="noreferrer">لینک ناشر</a></div><button type="button" aria-label={'پخش اجرای '+t.artist.name} onClick={()=>play({track:t,queue:tracks.filter(x=>x.id!==t.id),albumMode:true})}><Play size={21} fill="currentColor"/>پخش</button></article>)}</div></section>;
}
