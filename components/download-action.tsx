export function DownloadAction({ label = "Download" }: { label?: string }) {
  return (
    <span className="download-action">
      <span className="download-icon" aria-hidden="true">
        <span className="download-arrow" />
        <span className="download-tray" />
      </span>
      <span>{label}</span>
    </span>
  );
}
