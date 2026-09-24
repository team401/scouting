'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  assembleRelayEnvelope,
  parseRelayFrame,
} from '@/lib/qr-relay';

export function QrRelay({ online }: { online: boolean }) {
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ received: 0, total: 0 });
  const [manualFrame, setManualFrame] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const transferRef = useRef('');
  const chunksRef = useRef(new Map<number, string>());
  const uploadingRef = useRef(false);

  useEffect(() => () => controlsRef.current?.stop(), []);

  const acceptFrame = useCallback(
    async (text: string) => {
      if (uploadingRef.current) return;
      try {
        const frame = parseRelayFrame(text.trim());
        if (transferRef.current && transferRef.current !== frame.transferId) {
          chunksRef.current.clear();
        }
        transferRef.current = frame.transferId;
        chunksRef.current.set(frame.part, frame.chunk);
        setProgress({ received: chunksRef.current.size, total: frame.total });
        setMessage(`Scanned frame ${frame.part} of ${frame.total}.`);
        if (chunksRef.current.size !== frame.total) return;
        if (!online)
          throw new Error(
            'This receiving device must be online to upload relayed data.',
          );
        uploadingRef.current = true;
        controlsRef.current?.stop();
        const envelope = await assembleRelayEnvelope(
          chunksRef.current,
          frame.total,
        );
        const response = await fetch('/api/relay-sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(envelope),
        });
        const result = (await response.json()) as {
          accepted?: string[];
          rejected?: Array<{ error: string }>;
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Relay upload failed.');
        const rejected = result.rejected ?? [];
        setMessage(
          `Upload complete: ${result.accepted?.length ?? 0} accepted${rejected.length ? `, ${rejected.length} rejected: ${rejected[0].error}` : ''}. The sending device should keep its copy until it can synchronize normally.`,
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not read this QR frame.',
        );
        uploadingRef.current = false;
      }
    },
    [online],
  );

  async function startCamera() {
    setMessage('Starting camera…');
    try {
      controlsRef.current?.stop();
      uploadingRef.current = false;
      transferRef.current = '';
      chunksRef.current.clear();
      setProgress({ received: 0, total: 0 });
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result) void acceptFrame(result.getText());
        },
      );
      setMessage(
        'Point the camera at the sending device. Frames are collected automatically.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Camera scanning is unavailable. Use the manual fallback below.',
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <QrCode /> Scan a scout match
        </CardTitle>
        <Badge variant="outline">Online receiving device</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <>
            <video
              ref={videoRef}
              className="aspect-video w-full rounded-lg bg-black object-cover"
              muted
              playsInline
            />
            <Button
              className="w-full"
              onClick={() => void startCamera()}
              disabled={!online}
            >
              <Camera />
              Start or reset scanner
            </Button>
            {progress.total > 0 && (
              <p className="text-center font-semibold">
                Collected {progress.received} of {progress.total} frames
              </p>
            )}
            <details>
              <summary className="cursor-pointer text-sm font-semibold">
                Manual frame fallback
              </summary>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border bg-transparent p-2 text-xs"
                value={manualFrame}
                onChange={(event) => setManualFrame(event.target.value)}
                placeholder="Paste a Team 401 match QR value"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void acceptFrame(manualFrame);
                  setManualFrame('');
                }}
              >
                Add frame
              </Button>
            </details>
        </>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
