export default function Loading() {
  return (
    <main className="route-loading-shell" aria-busy="true" aria-label="Loading page">
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
