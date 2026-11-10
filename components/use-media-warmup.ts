"use client";

import { useEffect, type RefObject } from 'react';
import { hasWarmBuffer, shouldWarmMedia, type MediaConnection } from '@/lib/media-warmup';

/** Warm only the selected media element, never the queue or alternate qualities.
 * Native buffering is reused by play(); no duplicate fetch/blob/cache download.
 * preload is advisory: the browser ultimately controls transferred bytes.
 */
export function useMediaWarmup(ref: RefObject<HTMLMediaElement | null>, source?: string) {
  useEffect(() => {
    const media = ref.current;
    if (!source || !media) return;
    const connection = (navigator as Navigator & { connection?: MediaConnection & EventTarget }).connection;
    const update = () => {
      const warm = shouldWarmMedia(connection, document.visibilityState !== 'hidden');
      media.preload = warm && (!media.paused || !hasWarmBuffer(media)) ? 'auto' : 'metadata';
    };
    media.addEventListener('progress', update);
    media.addEventListener('play', update);
    media.addEventListener('pause', update);
    document.addEventListener('visibilitychange', update);
    connection?.addEventListener?.('change', update);
    update();
    return () => {
      media.removeEventListener('progress', update);
      media.removeEventListener('play', update);
      media.removeEventListener('pause', update);
      document.removeEventListener('visibilitychange', update);
      connection?.removeEventListener?.('change', update);
    };
  }, [ref, source]);
}
