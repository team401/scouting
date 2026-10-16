'use client';

import { useEffect, useState } from 'react';
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
  const source = teamNumber
    ? hasPitPhoto
      ? `/api/pit-photo?team=${teamNumber}`
      : `/api/team-photo?team=${teamNumber}&v=2`
    : null;
  const [failed, setFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    setFailed(false);
    setViewerOpen(false);
  }, [source]);

  if (!source || failed)
    return (
      <div
        className={cn(
          'grid aspect-square place-items-center rounded-lg border bg-muted text-center text-sm text-muted-foreground',
          className,
        )}
      >
        No robot photo
      </div>
    );

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
          onError={() => setFailed(true)}
        />
        <span className="sr-only">View robot photo full screen</span>
      </button>
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="h-dvh w-screen max-w-none rounded-none bg-black p-4 text-white ring-0 sm:max-w-none [&_[data-slot=dialog-close]]:bg-black/70 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-black">
          <DialogTitle className="sr-only">
            Team {teamNumber} robot photo
          </DialogTitle>
          <img
            className="h-full w-full object-contain"
            src={source}
            alt={`Team ${teamNumber} robot, full screen`}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
