"use client";
import {Play} from 'lucide-react';
import styles from './album-library.module.css';
export function AlbumPlayButton(){
 return <button className={styles.primary} type="button" onClick={()=>window.dispatchEvent(new Event('sarvnema:play-album'))}><Play size={20} fill="currentColor"/>پخش آلبوم</button>;
}
