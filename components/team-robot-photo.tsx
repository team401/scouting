'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => setFailed(false), [source]);

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
    <img
      className={cn(
        'aspect-square rounded-lg border bg-muted object-cover',
        className,
      )}
      src={source}
      alt={`Team ${teamNumber} robot`}
      onError={() => setFailed(true)}
    />
  );
}
