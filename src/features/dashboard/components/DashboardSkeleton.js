/** First-load placeholder in the shape of the dashboard, so nothing jumps when the numbers arrive. */
function Block({ brand = false, className = "" }) {
  const surface = brand ? "bg-primary/80" : "bg-white border border-border/70";
  return <div className={`rounded-2xl shadow-soft motion-safe:animate-pulse ${surface} ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-white/80 motion-safe:animate-pulse" />
        <div className="h-8 w-72 max-w-full rounded-lg bg-white/80 motion-safe:animate-pulse" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        <Block brand className="xl:col-span-5 h-80" />
        <div className="xl:col-span-7 grid grid-cols-2 gap-4 sm:gap-5">
          <Block className="h-38" />
          <Block className="h-38" />
          <Block className="h-38" />
          <Block className="h-38" />
        </div>
      </div>
      <Block className="h-56" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <Block className="xl:col-span-2 h-96" />
        <Block className="h-96" />
      </div>
    </div>
  );
}

export default DashboardSkeleton;
