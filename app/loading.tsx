import { BrandLoader } from "@/components/brand-loader";
import { PosterRailSkeleton } from "@/components/poster-skeleton";

export default function Loading() {
  return (
    <main className="shell route-loading">
      <section className="route-loading-hero">
        <BrandLoader label="Loading cinema" />
      </section>
      <section className="home-stack wrap route-loading-stack">
        {Array.from({ length: 3 }, (_, index) => (
          <section className="section rail-section skeleton-section" key={index}>
            <div className="section-head">
              <div>
                <span className="skeleton-line skeleton-heading" />
                <span className="skeleton-line skeleton-subheading" />
              </div>
              <span className="skeleton-pill" />
            </div>
            <PosterRailSkeleton count={8} />
          </section>
        ))}
      </section>
    </main>
  );
}
