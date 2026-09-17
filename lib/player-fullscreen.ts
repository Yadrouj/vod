/** Keep native fullscreen even when a browser (notably iOS) refuses rotation. */
export async function enterPlayerFullscreen(element: HTMLElement) {
  await element.requestFullscreen();
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (value: "landscape") => Promise<void> };
  if (!orientation?.lock) return;
  const release = () => {
    if (document.fullscreenElement === element) return;
    try { orientation.unlock(); } catch {}
    document.removeEventListener("fullscreenchange", release);
  };
  document.addEventListener("fullscreenchange", release);
  try {
    await orientation.lock("landscape");
    // The user may exit before the asynchronous orientation request completes.
    release();
  } catch {
    document.removeEventListener("fullscreenchange", release);
  }
}
