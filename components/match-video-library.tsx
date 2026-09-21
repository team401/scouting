'use client';

import { useCallback, useEffect, useState } from 'react';
import { Film, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type MatchVideo = {
  id: string;
  contentType: string;
  bytes: number;
  createdAt: number;
  uploaderUserId: string;
  uploaderName: string;
};

type VideoResponse = {
  videos: MatchVideo[];
  canUpload: boolean;
  canDeleteAny: boolean;
  userId: string;
  error?: string;
};

const chunkBytes = 8 * 1024 * 1024;

export function MatchVideoLibrary({
  matchId,
  matchLabel,
}: {
  matchId: string | null;
  matchLabel: string;
}) {
  const [data, setData] = useState<VideoResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadVideos = useCallback(
    async (signal?: AbortSignal) => {
      if (!matchId) return;
      const response = await fetch(
        `/api/match-videos?matchId=${encodeURIComponent(matchId)}`,
        {
          signal,
        },
      );
      const result = (await response.json()) as VideoResponse;
      if (!response.ok)
        throw new Error(result.error ?? 'Could not load match videos.');
      setData(result);
    },
    [matchId],
  );

  useEffect(() => {
    const controller = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- synchronize the selected match with its server-side video list
    void loadVideos(controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not load match videos.',
        );
    });
    return () => controller.abort();
  }, [loadVideos, matchId]);

  async function uploadVideo() {
    if (!matchId || !file) return;
    setUploading(true);
    setProgress(0);
    setMessage('Starting upload…');
    let activeUpload: { mediaId: string; uploadId: string } | null = null;
    try {
      const start = await fetch('/api/match-videos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          matchId,
          fileName: file.name,
          contentType: file.type,
          bytes: file.size,
        }),
      });
      const upload = (await start.json()) as {
        mediaId?: string;
        uploadId?: string;
        error?: string;
      };
      if (!start.ok || !upload.mediaId || !upload.uploadId)
        throw new Error(upload.error ?? 'Could not start the upload.');
      activeUpload = { mediaId: upload.mediaId, uploadId: upload.uploadId };
      const parts: { partNumber: number; etag: string }[] = [];
      const partCount = Math.ceil(file.size / chunkBytes);
      for (let index = 0; index < partCount; index += 1) {
        const partNumber = index + 1;
        const response = await fetch(
          `/api/match-videos?action=part&mediaId=${encodeURIComponent(upload.mediaId)}&uploadId=${encodeURIComponent(upload.uploadId)}&partNumber=${partNumber}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/octet-stream' },
            body: file.slice(
              index * chunkBytes,
              Math.min(file.size, (index + 1) * chunkBytes),
            ),
          },
        );
        const part = (await response.json()) as {
          partNumber?: number;
          etag?: string;
          error?: string;
        };
        if (!response.ok || !part.etag)
          throw new Error(part.error ?? `Part ${partNumber} failed to upload.`);
        parts.push({ partNumber, etag: part.etag });
        const percent = Math.round((partNumber / partCount) * 100);
        setProgress(percent);
        setMessage(`Uploading ${percent}%…`);
      }
      const complete = await fetch('/api/match-videos?action=complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          mediaId: upload.mediaId,
          uploadId: upload.uploadId,
          parts,
        }),
      });
      const result = (await complete.json()) as { error?: string };
      if (!complete.ok)
        throw new Error(result.error ?? 'Could not finish the upload.');
      setFile(null);
      setMessage('Video uploaded and ready to watch.');
      activeUpload = null;
      await loadVideos();
    } catch (error) {
      if (activeUpload) {
        await fetch(
          `/api/match-videos?mediaId=${encodeURIComponent(activeUpload.mediaId)}&uploadId=${encodeURIComponent(activeUpload.uploadId)}`,
          { method: 'DELETE' },
        ).catch(() => undefined);
      }
      setMessage(
        error instanceof Error ? error.message : 'Video upload failed.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function deleteVideo(mediaId: string) {
    const response = await fetch(
      `/api/match-videos?mediaId=${encodeURIComponent(mediaId)}`,
      {
        method: 'DELETE',
      },
    );
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? 'Could not delete the video.');
      return;
    }
    setMessage('Video deleted.');
    await loadVideos();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film /> Match video
        </CardTitle>
        <Badge variant="outline">{data?.videos.length ?? 0} uploaded</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {!matchId ? (
          <p className="text-sm text-muted-foreground">
            Choose a match to view its video.
          </p>
        ) : (
          <>
            {data?.videos.map((video) => (
              <div className="space-y-2 rounded-lg border p-3" key={video.id}>
                <video
                  className="aspect-video w-full rounded-md bg-black"
                  controls
                  preload="metadata"
                  src={`/api/match-videos?mediaId=${encodeURIComponent(video.id)}`}
                >
                  <track kind="captions" />
                </video>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {matchLabel} · {(video.bytes / 1024 / 1024).toFixed(1)} MB ·
                    uploaded by {video.uploaderName}
                  </span>
                  {(data.canDeleteAny ||
                    data.userId === video.uploaderUserId) && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Delete match video"
                      onClick={() => void deleteVideo(video.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {data && data.videos.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No video has been uploaded for {matchLabel}.
              </p>
            )}
            {data?.canUpload && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Upload a recording</p>
                <Input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mov"
                  disabled={uploading}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  MP4, WebM, or MOV up to 2 GB. Keep this page open while the
                  upload finishes.
                </p>
                {uploading && (
                  <progress className="h-2 w-full" max={100} value={progress}>
                    {progress}%
                  </progress>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!file || uploading}
                  onClick={() => void uploadVideo()}
                >
                  <Upload />{' '}
                  {uploading ? `${progress}% uploaded` : 'Upload video'}
                </Button>
              </div>
            )}
            {message && (
              <output className="block text-sm text-muted-foreground">
                {message}
              </output>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
