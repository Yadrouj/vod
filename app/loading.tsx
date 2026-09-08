export default function Loading() {
  return (
    <main className="route-loading-shell" aria-busy="true" aria-label="در حال بارگذاری صفحه">
      <div className="pwa-loading-brand" role="status"><svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M32 4c11.6 10.6 18 22.2 18 34.1 0 12.1-7.6 20.2-18 21.9-10.4-1.7-18-9.8-18-21.9C14 26.2 20.4 14.6 32 4Z"/><path fill="#14130f" d="m30 25 14 7-14 7Z"/></svg><span>سرونما · در حال آماده‌سازی…</span></div>
      <div className="route-loading-stage">
        <span className="route-loading-line route-loading-line-short" />
        <span className="route-loading-line route-loading-line-title" />
        <span className="route-loading-line route-loading-line-copy" />
        <span className="route-loading-button" />
      </div>
      <div className="route-loading-row">
        {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
      </div>
    </main>
  );
}
