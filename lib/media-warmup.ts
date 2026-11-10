export type MediaConnection = { saveData?: boolean; effectiveType?: string };

export function shouldWarmMedia(connection?: MediaConnection, visible = true) {
  return visible && !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType || '');
}

export function hasWarmBuffer(media: Pick<HTMLMediaElement, 'buffered' | 'currentTime'>, seconds = 10) {
  for (let index = 0; index < media.buffered.length; index++) {
    if (media.buffered.start(index) <= media.currentTime && media.buffered.end(index) - media.currentTime >= seconds) return true;
  }
  return false;
}
