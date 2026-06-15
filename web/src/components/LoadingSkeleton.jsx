export default function LoadingSkeleton({ type = "page" }) {
  if (type === "cards") {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="h-56 animate-pulse bg-gray-100" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="mb-5 flex items-center gap-5 border-b pb-5 last:mb-0 last:border-b-0"
          >
            <div className="h-14 w-14 animate-pulse rounded-2xl bg-gray-100" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="h-10 w-64 animate-pulse rounded bg-gray-100" />
      <div className="h-6 w-96 max-w-full animate-pulse rounded bg-gray-100" />

      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-3xl bg-gray-100"
          />
        ))}
      </div>

      <div className="h-96 animate-pulse rounded-3xl bg-gray-100" />
    </div>
  );
}