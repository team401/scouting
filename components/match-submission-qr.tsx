'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PendingMutation } from '@/lib/offline-db';
import {
  createRelayFrames,
  ensureRelayDeviceRegistered,
} from '@/lib/qr-relay';

export function MatchSubmissionQr({
  mutation,
  organizationId,
  eventKey,
  online,
}: {
  mutation: PendingMutation;
  organizationId: string;
  eventKey: string;
  online: boolean;
}) {
  const [image, setImage] = useState('');
  const [message, setMessage] = useState('Preparing match handoff code…');

  useEffect(() => {
    let cancelled = false;
    setImage('');
    setMessage('Preparing match handoff code…');
    void ensureRelayDeviceRegistered(online)
      .then((device) =>
        createRelayFrames(device, organizationId, eventKey, [mutation]),
      )
      .then((frames) => {
        if (frames.length !== 1)
          throw new Error(
            'This match contains too much data for one QR code. Shorten the notes and save again.',
          );
        return QRCode.toDataURL(frames[0], {
          width: 420,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
      })
      .then((dataUrl) => {
        if (cancelled) return;
        setImage(dataUrl);
        setMessage(
          'Have a signed-in device with data service scan this code. You can also sync normally when service returns.',
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not create the match handoff code.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [eventKey, mutation, online, organizationId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <QrCode /> Match handoff
        </CardTitle>
        <Badge variant="outline">One match</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-center">
        {image && (
          <Image
            unoptimized
            width={420}
            height={420}
            className="mx-auto w-full max-w-[420px] rounded-lg bg-white p-2"
            src={image}
            alt="QR code containing this match scouting submission"
          />
        )}
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
