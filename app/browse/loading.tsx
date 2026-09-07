import styles from "./archive.module.css";

export default function Loading() {
  return <main className={styles.page} data-media-theme="cinema" dir="rtl" aria-busy="true">
    <div className="wrap"><h1 role="status">در حال بارگذاری آرشیو…</h1>
      <div className={styles.grid} aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <div className={styles.skeleton} key={index} />)}</div>
    </div>
  </main>;
}
