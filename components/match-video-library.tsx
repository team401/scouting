'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Square, Trash2, Upload } from 'lucide-react';
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
  externalVideos = [],
  playbackOnly = false,
}: {
  matchId: string | null;
  matchLabel: string;
  externalVideos?: Array<{ type: string; key: string }>;
  playbackOnly?: boolean;
}) {
  const [data, setData] = useState<VideoResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [selectedVideoKey, setSelectedVideoKey] = useState('');
  const previewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoSources = [
    ...(data?.videos ?? []).map((video, index) => ({
      key: `team:${video.id}`,
      label: `Team ${index + 1}`,
      kind: 'team' as const,
      video,
    })),
    ...externalVideos
      .filter((video) => video.type === 'youtube')
      .map((video, index) => ({
        key: `tba:${video.key}`,
        label: `TBA ${index + 1}`,
        kind: 'tba' as const,
        video,
      })),
  ];
  const selectedVideo =
    videoSources.find((source) => source.key === selectedVideoKey) ??
    videoSources[0];

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

  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function startRecording() {
    if (!matchId) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage(
        'This browser cannot record video here. Record with the camera app, then choose the file below.',
      );
      return;
    }
    try {
      setMessage('Requesting camera access…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: true,
      });
      const candidates = [
        'video/mp4;codecs=h264,aac',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = candidates.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      streamRef.current = stream;
      recorderRef.current = recorder;
      recordedChunksRef.current = [];
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play();
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const contentType = (recorder.mimeType || 'video/webm').split(';')[0];
        const extension = contentType === 'video/mp4' ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: contentType });
        const recordedFile = new File(
          [blob],
          `${matchLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.${extension}`,
          { type: contentType },
        );
        setFile(recordedFile);
        setRecording(false);
        setMessage('Recording ready. Review the selection, then upload it.');
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (previewRef.current) previewRef.current.srcObject = null;
      };
      recorder.start(1000);
      setRecording(true);
      setMessage('Recording…');
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
      setMessage(
        error instanceof Error
          ? `Could not start recording: ${error.message}`
          : 'Could not start recording.',
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

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
      <CardHeader className="flex flex-row items-center gap-3 overflow-hidden">
        <CardTitle className="shrink-0">Match video</CardTitle>
        {videoSources.length > 1 && (
          <div
            className="flex min-w-0 gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Video source"
          >
            {videoSources.map((source) => {
              const selected = selectedVideo?.key === source.key;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={
                    selected
                      ? 'shrink-0 border-b-2 border-primary px-2 py-1 text-sm font-semibold text-primary'
                      : 'shrink-0 border-b-2 border-transparent px-2 py-1 text-sm text-muted-foreground hover:text-foreground'
                  }
                  key={source.key}
                  onClick={() => setSelectedVideoKey(source.key)}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!matchId ? (
          <p className="text-sm text-muted-foreground">
            Choose a match to view its video.
          </p>
        ) : (
          <>
            {selectedVideo?.kind === 'tba' && (
                <div className="space-y-2">
                  <iframe
                    className="aspect-video w-full rounded-md bg-black"
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedVideo.video.key)}`}
                    title={`${matchLabel} TBA video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <p className="text-xs text-muted-foreground">
                    {matchLabel} · provided by The Blue Alliance
                  </p>
                </div>
            )}
            {selectedVideo?.kind === 'team' && (
              <div className="space-y-2">
                <video
                  className="aspect-video w-full rounded-md bg-black"
                  controls
                  preload="metadata"
                  src={`/api/match-videos?mediaId=${encodeURIComponent(selectedVideo.video.id)}`}
                >
                  <track kind="captions" />
                </video>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {matchLabel} · {(selectedVideo.video.bytes / 1024 / 1024).toFixed(1)} MB ·
                    uploaded by {selectedVideo.video.uploaderName}
                  </span>
                  {!playbackOnly &&
                    (data?.canDeleteAny ||
                    data?.userId === selectedVideo.video.uploaderUserId) && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Delete match video"
                      onClick={() => void deleteVideo(selectedVideo.video.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            )}
            {data && data.videos.length === 0 && externalVideos.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No video has been uploaded for {matchLabel}.
              </p>
            )}
            {!playbackOnly && data?.canUpload && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Record or upload video</p>
                <video
                  ref={previewRef}
                  className={
                    recording
                      ? 'aspect-video w-full rounded-md bg-black object-cover'
                      : 'hidden'
                  }
                  muted
                  playsInline
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={recording ? 'destructive' : 'outline'}
                    disabled={uploading}
                    onClick={() =>
                      recording ? stopRecording() : void startRecording()
                    }
                  >
                    {recording ? <Square /> : <Camera />}
                    {recording ? 'Stop recording' : 'Record video'}
                  </Button>
                </div>
                <p className="text-xs font-medium">Or choose an existing file</p>
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
                {file && (
                  <p className="truncate text-sm">
                    Ready to upload: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
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
