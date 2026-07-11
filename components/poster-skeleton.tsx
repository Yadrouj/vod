export function PosterCardSkeleton() {
  return (
    <div className="poster poster-skeleton" aria-hidden="true">
      <div className="poster-art">
        <span className="skeleton-rating" />
        <span className="poster-copy">
          <span className="skeleton-line skeleton-title" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-short" />
        </span>
      </div>
    </div>
  );
}

export function PosterRailSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="poster-rail poster-rail-skeleton" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <PosterCardSkeleton key={index} />
      ))}
    </div>
  );
}
