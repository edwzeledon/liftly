import React from 'react';

// Loading mirror of the twin-heroes grid: identical wrappers, col-spans, and
// card chrome so real content lands with zero reflow. Blocks follow the
// HistorySkeleton idiom — animate-pulse bg-muted shapes inside real chrome.
export default function DashboardSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading today</span>
      <div aria-hidden="true" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fuel ring hero */}
        <div className="order-1 lg:order-none lg:col-span-6">
          <div className="px-6 pt-2 pb-6 md:px-0">
            <div className="animate-pulse motion-reduce:animate-none">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-muted rounded-full" />
                <div className="h-8 w-16 bg-muted rounded-full" />
              </div>
              <div className="w-64 h-64 md:w-72 md:h-72 mx-auto bg-muted rounded-full" />
              <div className="flex gap-6 mt-6">
                <div className="flex-1 h-2 bg-muted rounded-full" />
                <div className="flex-1 h-2 bg-muted rounded-full" />
              </div>
              <div className="mt-3 h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>

        {/* Training hero */}
        <div className="order-2 lg:order-none lg:col-span-6 px-6 md:px-0">
          <div className="bg-card rounded-2xl p-6 border border-border h-full">
            <div className="animate-pulse motion-reduce:animate-none">
              <div className="flex items-center justify-between mb-4">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="w-4 h-4 bg-muted rounded" />
              </div>
              <div className="h-5 w-40 bg-muted rounded mb-3" />
              <div className="flex gap-6 mb-4">
                <div className="space-y-1.5">
                  <div className="h-8 w-20 bg-muted rounded" />
                  <div className="h-3 w-12 bg-muted rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-8 w-12 bg-muted rounded" />
                  <div className="h-3 w-14 bg-muted rounded" />
                </div>
              </div>
              <div className="h-11 w-full bg-muted rounded-xl" />
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-2 h-2 bg-muted rounded-full" />
                    <div className="w-2 h-2.5 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick-protein chip strip */}
        <div className="order-3 lg:order-none lg:col-span-12 px-6 md:px-0">
          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="animate-pulse motion-reduce:animate-none">
              <div className="h-4 w-28 bg-muted rounded mb-3" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-11 w-28 bg-muted rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Meal feed */}
        <div className="order-5 lg:order-none lg:col-span-8 px-6 md:px-0">
          <div className="bg-card rounded-2xl p-6 border border-border h-full">
            <div className="animate-pulse motion-reduce:animate-none">
              <div className="h-5 w-32 bg-muted rounded mb-6" />
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-1/3 bg-muted rounded" />
                      <div className="h-3 w-1/4 bg-muted rounded" />
                    </div>
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly review */}
        <div className="order-4 lg:order-none lg:col-span-4 px-6 md:px-0">
          <div className="bg-card rounded-2xl p-6 border border-border h-full">
            <div className="animate-pulse motion-reduce:animate-none">
              <div className="h-4 w-24 bg-muted rounded mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-5/6 bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
