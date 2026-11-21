"use client";
import {Disc3,Info,ListMusic,Play,Search,Shuffle} from 'lucide-react';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {MusicPlayer} from '@/components/music-player';
import type {MusicTrack} from '@/lib/music-types';
import {mirroredImageUrl} from '@/lib/image-url';
import styles from './album-library.module.css';
import {albumTracks} from '@/lib/album-library';
const title=(t:MusicTrack)=>(t.persianTitle||t.title).replace(/^دانلود\s+(?:آهنگ\s+)?(?:جدید\s+)?/,'').trim();
export function MusicArtistPlaylist({artistName,tracks:allTracks,showAlbumAction=true}:{artistName:string;tracks:MusicTrack[];showAlbumAction?:boolean}){
 const audioTracks=useMemo(()=>albumTracks(allTracks,'audio'),[allTracks]),videoTracks=useMemo(()=>albumTracks(allTracks,'video'),[allTracks]);
 const[mediaKind,setMediaKind]=useState(audioTracks.length?'audio':'video');
 const tracks=mediaKind==='video'?videoTracks:audioTracks;
 const[selectedId,setSelectedId]=useState(tracks[0]?.id||''),[playRequest,setPlayRequest]=useState(0),[query,setQuery]=useState(''),[order,setOrder]=useState<string[]>([]);
 const selected=tracks.find(t=>t.id===selectedId)||tracks[0];
 const ordered=useMemo(()=>{const map=new Map(tracks.map(t=>[t.id,t]));return order.length?order.flatMap(id=>map.has(id)?[map.get(id)!]:[]):tracks;},[order,tracks]);
 const queue=useMemo(()=>{const index=ordered.findIndex(t=>t.id===selected?.id);return [...ordered.slice(index+1),...ordered.slice(0,index)];},[ordered,selected?.id]);
 function select(track:MusicTrack){setSelectedId(track.id);setPlayRequest(n=>n+1);}
 function playAlbum(){setOrder([]);const first=audioTracks[0]||videoTracks[0];if(first){setMediaKind(first.kind==='video'?'video':'audio');select(first);}}
 useEffect(()=>{const play=()=>{setOrder([]);const first=audioTracks[0]||videoTracks[0];if(first){setMediaKind(first.kind==='video'?'video':'audio');setSelectedId(first.id);setPlayRequest(n=>n+1);}};window.addEventListener('sarvnema:play-album',play);return()=>window.removeEventListener('sarvnema:play-album',play);},[audioTracks,videoTracks]);
 const filtered=tracks.filter(t=>(title(t)+' '+t.artists.map(a=>a.name).join(' ')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 if(!selected)return <p className={styles.empty}>هنوز آهنگ قابل‌پخشی ثبت نشده است.</p>;
 function shuffled(){const shuffled=[...tracks];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}setOrder(shuffled.map(t=>t.id));select(shuffled[0]);}
 return <section id="artist-tracks" className={styles.workspace} aria-label={'آرشیو '+artistName}>
  <div className={styles.albumHeader}>
   {audioTracks.length>0&&videoTracks.length>0&&<div className={styles.kinds} role="group" aria-label="نوع آثار"><button type="button" aria-pressed={mediaKind==='audio'} onClick={()=>{setOrder([]);setMediaKind('audio');}}>آهنگ‌ها</button><button type="button" aria-pressed={mediaKind==='video'} onClick={()=>{setOrder([]);setMediaKind('video');}}>موزیک‌ویدیوها</button></div>}
   <div className={styles.tools}>{showAlbumAction&&<button className={styles.primary} onClick={playAlbum} type="button"><Play size={19} fill="currentColor"/>پخش آلبوم</button>}<button className={styles.secondary} onClick={shuffled} type="button"><Shuffle size={18}/>پخش درهم</button><label className={styles.search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="جستجو در قطعه‌ها" placeholder="نام آهنگ را پیدا کن…"/></label></div>
  </div>
  <section className={styles.library}><header className={styles.header}><div><h2>فهرست قطعه‌ها</h2><p>{tracks.length.toLocaleString('fa-IR')} آهنگ در این صفحه · پخش پیوسته به ترتیب انتخاب</p></div><ListMusic size={22}/></header>
   <ol className={styles.list}>{filtered.map(t=><li className={styles.row} data-active={t.id===selected.id} key={t.id}><button className={styles.track} onClick={()=>select(t)} type="button" aria-current={t.id===selected.id?'true':undefined} aria-label={'پخش '+title(t)}>
    <span className={styles.number}>{(tracks.indexOf(t)+1).toLocaleString('fa-IR')}</span>{t.coverUrl?<img className={styles.cover} src={mirroredImageUrl(t.coverUrl)} alt="" loading="lazy" decoding="async"/>:<span className={styles.cover}><Disc3 size={20}/></span>}
    <span className={styles.copy}><strong>{title(t)}</strong><small>{t.artists.map(a=>a.name).join(' · ')||artistName}</small></span><Play className={styles.play} size={17} fill={t.id===selected.id?'currentColor':'none'}/>
   </button><Link href={'/music/'+t.id} className={styles.info} aria-label={'صفحه و دانلود '+title(t)}><Info size={18}/></Link></li>)}</ol>{!filtered.length&&<p className={styles.empty} role="status">قطعه‌ای پیدا نشد؛ نام کوتاه‌تری امتحان کن.</p>}
  </section>
  <aside className={styles.now}><header><span>پلیر آلبوم</span><span>{(Math.max(0,tracks.indexOf(selected))+1).toLocaleString('fa-IR')} / {tracks.length.toLocaleString('fa-IR')}</span></header><MusicPlayer track={selected} queue={queue} playRequest={playRequest} albumMode onTrackPlay={t=>setSelectedId(t.id)}/><p>با رفتن به صفحه‌های دیگر، پخش ادامه دارد. کنترل کوچک پخش همیشه همراه تو می‌ماند.</p></aside>
 </section>;
}
