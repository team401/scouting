'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Copy,
  QrCode,
  RadioTower,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPendingMutations } from '@/lib/offline-db';
import {
  assembleRelayEnvelope,
  createRelayFrames,
  ensureRelayDeviceRegistered,
  parseRelayFrame,
} from '@/lib/qr-relay';

export function QrRelay({
  organizationId,
  eventKey,
  online,
}: {
  organizationId: string;
  eventKey: string;
  online: boolean;
}) {
  const [mode, setMode] = useState<'send' | 'receive'>('send');
  const [frames, setFrames] = useState<string[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [qrImage, setQrImage] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ received: 0, total: 0 });
  const [manualFrame, setManualFrame] = useState('');
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const transferRef = useRef('');
  const chunksRef = useRef(new Map<number, string>());
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (!frames.length) return;
    void QRCode.toDataURL(frames[frameIndex], {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
    }).then(setQrImage);
  }, [frameIndex, frames]);

  useEffect(() => {
    if (frames.length < 2) return;
    const timer = window.setInterval(
      () => setFrameIndex((index) => (index + 1) % frames.length),
      1100,
    );
    return () => window.clearInterval(timer);
  }, [frames]);

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function buildTransfer() {
    setBusy(true);
    setMessage('');
    try {
      const [device, pending] = await Promise.all([
        ensureRelayDeviceRegistered(online),
        getPendingMutations(),
      ]);
      const scoutEntries = pending.filter(
        (item) => item.entity === 'scoutEntry',
      );
      if (!scoutEntries.length)
        throw new Error(
          'There are no queued match submissions on this device.',
        );
      const nextFrames = await createRelayFrames(
        device,
        organizationId,
        eventKey,
        scoutEntries,
      );
      setFrames(nextFrames);
      setFrameIndex(0);
      setMessage(
        `${Math.min(24, scoutEntries.length)} submission${scoutEntries.length === 1 ? '' : 's'} ready in ${nextFrames.length} QR frame${nextFrames.length === 1 ? '' : 's'}. Keep this screen open until the other device confirms upload.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not create the QR transfer.',
      );
    } finally {
      setBusy(false);
    }
  }

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
          <QrCode /> QR data relay
        </CardTitle>
        <Badge variant="outline">Offline sender → online receiver</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === 'send' ? 'default' : 'outline'}
            onClick={() => {
              controlsRef.current?.stop();
              setMode('send');
            }}
          >
            Show my data
          </Button>
          <Button
            variant={mode === 'receive' ? 'default' : 'outline'}
            onClick={() => setMode('receive')}
          >
            Scan scout data
          </Button>
        </div>
        {mode === 'send' ? (
          <>
            {!frames.length ? (
              <Button
                className="w-full"
                onClick={() => void buildTransfer()}
                disabled={busy || !organizationId || !eventKey}
              >
                <RadioTower />
                {busy ? 'Preparing…' : 'Create transfer QR'}
              </Button>
            ) : (
              <div className="text-center">
                {qrImage && (
                  <Image
                    unoptimized
                    width={360}
                    height={360}
                    className="mx-auto w-full max-w-[360px] rounded-lg bg-white p-2"
                    src={qrImage}
                    alt={`QR transfer frame ${frameIndex + 1} of ${frames.length}`}
                  />
                )}
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Previous QR frame"
                    onClick={() =>
                      setFrameIndex(
                        (frameIndex - 1 + frames.length) % frames.length,
                      )
                    }
                  >
                    <ChevronLeft />
                  </Button>
                  <strong>
                    Frame {frameIndex + 1} of {frames.length}
                  </strong>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Next QR frame"
                    onClick={() =>
                      setFrameIndex((frameIndex + 1) % frames.length)
                    }
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <Button
                  className="mt-2"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(frames[frameIndex])
                      .then(() => setMessage('Current frame copied.'))
                  }
                >
                  <Copy /> Copy current frame
                </Button>
              </div>
            )}
          </>
        ) : (
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
                placeholder="Paste one T401QR1 frame"
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
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
