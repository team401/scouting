'use client';

import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function TeamRobotPhoto({
  teamNumber,
  hasPitPhoto = false,
  className,
}: {
  teamNumber: number | null;
  hasPitPhoto?: boolean;
  className?: string;
}) {
  // Wait for metadata before rendering a TBA URL. Starting metadata and image
  // requests together makes both race for the server-side cache refresh lock.
  const [tbaPhotoCount, setTbaPhotoCount] = useState(0);
  const [photoLookupState, setPhotoLookupState] = useState<
    'loading' | 'ready' | 'error'
  >(teamNumber ? 'loading' : 'ready');
  const sources = useMemo(() => {
    if (!teamNumber) return [];
    return [
      ...(hasPitPhoto ? [`/api/pit-photo?team=${teamNumber}`] : []),
      ...Array.from(
        { length: tbaPhotoCount },
        (_, index) => `/api/team-photo?team=${teamNumber}&index=${index}&v=3`,
      ),
    ];
  }, [hasPitPhoto, tbaPhotoCount, teamNumber]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const availableSources = sources.filter(
    (candidate) => !failedSources.has(candidate),
  );

  useEffect(() => {
    let cancelled = false;
    setTbaPhotoCount(0);
    setPhotoLookupState(teamNumber ? 'loading' : 'ready');
    if (teamNumber)
      void fetch(`/api/team-photo?team=${teamNumber}&meta=1&v=3`)
        .then(async (response) => {
          if (response.status === 404) return { count: 0 };
          if (!response.ok) throw new Error('Could not load photo metadata');
          return (await response.json()) as { count?: number };
        })
        .then((body) => {
          if (!cancelled) {
            setTbaPhotoCount(Math.max(0, body.count ?? 0));
            setPhotoLookupState('ready');
          }
        })
        .catch(() => {
          if (!cancelled) setPhotoLookupState('error');
        });
    return () => {
      cancelled = true;
    };
  }, [teamNumber]);

  useEffect(() => {
    setFailedSources(new Set());
    setPhotoIndex(0);
    setViewerOpen(false);
  }, [hasPitPhoto, teamNumber]);

  useEffect(() => {
    if (!viewerOpen || availableSources.length < 2) return;
    const timer = window.setInterval(
      () => setPhotoIndex((current) => (current + 1) % availableSources.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [availableSources.length, viewerOpen]);

  const source = availableSources[photoIndex % availableSources.length];

  useEffect(() => {
    setImageLoading(Boolean(source));
  }, [source]);

  function movePhoto(direction: number) {
    setPhotoIndex(
      (current) =>
        (current + direction + availableSources.length) %
        availableSources.length,
    );
  }

  if (!source) {
    const isLoading = photoLookupState === 'loading';
    const isUnavailable =
      photoLookupState === 'error' || failedSources.size > 0;
    return (
      <div
        className={cn(
          'grid aspect-square place-items-center rounded-lg border bg-muted text-center text-sm text-muted-foreground',
          className,
        )}
      >
        <span className="flex items-center justify-center gap-2 px-3">
          {isLoading && (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          )}
          {isLoading
            ? 'Loading robot photo…'
            : isUnavailable
              ? 'Robot photo unavailable'
              : 'No robot photo'}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          'group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        onClick={() => setViewerOpen(true)}
        title={`View Team ${teamNumber} robot photo full screen`}
      >
        <img
          className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          src={source}
          alt={`Team ${teamNumber} robot`}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setFailedSources((current) => new Set(current).add(source));
            setPhotoIndex(0);
          }}
        />
        {imageLoading && (
          <span className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading robot photo…
            </span>
          </span>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white"
        >
          View full screen
        </span>
        <span className="sr-only">View robot photo full screen</span>
      </button>
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="flex h-dvh w-screen max-w-none rounded-none bg-black p-0 text-white ring-0 sm:max-w-none [&_[data-slot=dialog-close]]:bg-black/70 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-black">
          <DialogTitle className="sr-only">
            Team {teamNumber} robot photo
          </DialogTitle>
          {/* Full-viewport layer: any click on its empty area closes the viewer. */}
          <div
            role="presentation"
            className="relative flex h-full w-full items-center justify-center p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setViewerOpen(false);
            }}
          >
            <img
              className="h-full w-full object-contain pointer-events-none"
              src={source}
              alt={`Team ${teamNumber} robot, full screen`}
            />
            {availableSources.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute top-1/2 left-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white hover:bg-black/85"
                  aria-label="Previous robot photo"
                  onClick={() => movePhoto(-1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="absolute top-1/2 right-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white hover:bg-black/85"
                  aria-label="Next robot photo"
                  onClick={() => movePhoto(1)}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
                <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
                  {availableSources.map((_, index) => (
                    <span
                      className={`size-2 rounded-full ${index === photoIndex ? 'bg-white' : 'bg-white/40'}`}
                      key={index}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
