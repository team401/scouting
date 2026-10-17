'use client';

import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Maximize2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const knownPhotoCounts = new Map<number, number>();

export function TeamRobotPhoto({
  teamNumber,
  hasPitPhoto = false,
  className,
}: {
  teamNumber: number | null;
  hasPitPhoto?: boolean;
  className?: string;
}) {
  // Reuse confirmed metadata during this page session. For a new team, wait
  // for metadata so the metadata and image requests do not race for the
  // server-side cache refresh lock.
  const knownPhotoCount = teamNumber
    ? knownPhotoCounts.get(teamNumber)
    : undefined;
  const [tbaPhotoCount, setTbaPhotoCount] = useState(knownPhotoCount ?? 0);
  const [photoLookupState, setPhotoLookupState] = useState<
    'loading' | 'ready' | 'error'
  >(teamNumber && knownPhotoCount === undefined ? 'loading' : 'ready');
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
    const rememberedCount = teamNumber
      ? knownPhotoCounts.get(teamNumber)
      : undefined;
    setTbaPhotoCount(rememberedCount ?? 0);
    setPhotoLookupState(
      teamNumber && rememberedCount === undefined ? 'loading' : 'ready',
    );
    if (teamNumber)
      void fetch(`/api/team-photo?team=${teamNumber}&meta=1&v=3`)
        .then(async (response) => {
          if (response.status === 404) return { count: 0 };
          if (!response.ok) throw new Error('Could not load photo metadata');
          return (await response.json()) as { count?: number };
        })
        .then((body) => {
          if (!cancelled) {
            const count = Math.max(0, body.count ?? 0);
            knownPhotoCounts.set(teamNumber, count);
            setTbaPhotoCount(count);
            setPhotoLookupState('ready');
          }
        })
        .catch(() => {
          if (!cancelled && rememberedCount === undefined)
            setPhotoLookupState('error');
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
    if (availableSources.length < 2) return;
    const timer = window.setInterval(
      () => setPhotoIndex((current) => (current + 1) % availableSources.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [availableSources.length]);

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
      <div
        className={cn(
          'group relative aspect-square overflow-hidden rounded-lg border bg-muted',
          className,
        )}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={() => setViewerOpen(true)}
          aria-label={`View Team ${teamNumber} robot photo full screen`}
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
        </button>
        {imageLoading && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading robot photo…
            </span>
          </span>
        )}
        {availableSources.length > 1 && (
          <>
            <button
              type="button"
              className="absolute top-1/2 left-1 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white/80 opacity-75 backdrop-blur-[1px] transition hover:bg-black/55 hover:text-white hover:opacity-100 focus-visible:opacity-100"
              aria-label="Previous robot photo"
              onClick={() => movePhoto(-1)}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white/80 opacity-75 backdrop-blur-[1px] transition hover:bg-black/55 hover:text-white hover:opacity-100 focus-visible:opacity-100"
              aria-label="Next robot photo"
              onClick={() => movePhoto(1)}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
        <button
          type="button"
          className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black/90"
          onClick={() => setViewerOpen(true)}
          aria-label="View robot photo full screen"
          title="View full screen"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
        </button>
      </div>
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
