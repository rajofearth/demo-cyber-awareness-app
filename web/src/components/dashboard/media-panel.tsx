"use client";

import { useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Lightbox } from "@/components/interior/lightbox";
import {
  EmptyState,
  Meta,
  Panel,
  SectionTitle,
  formatDateTime,
} from "@/lib/ui";

const site = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(".cloud", ".site");
const fileUrl = (storageId: string) => `${site}/api/file/${storageId}`;

type MediaItem = {
  _id: string;
  kind: string;
  lens?: string;
  storageId: string;
  mime: string;
  takenAt: number;
  durationMs?: number;
  seq?: number;
};

function fmt(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M3 1.8v8.4L10 6 3 1.8Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <rect x="2.4" y="1.6" width="2.6" height="8.8" rx="0.8" />
      <rect x="7" y="1.6" width="2.6" height="8.8" rx="0.8" />
    </svg>
  );
}

function AudioRow({
  item,
  active,
  playing,
  time,
  duration,
  onToggle,
  onSeek,
}: {
  item: MediaItem;
  active: boolean;
  playing: boolean;
  time: number;
  duration: number;
  onToggle: () => void;
  onSeek: (ratio: number) => void;
}) {
  const total = duration || (item.durationMs ? item.durationMs / 1000 : 0);
  const ratio = total > 0 ? Math.min(1, time / total) : 0;

  return (
    <div className="mat-row rounded-[10px] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={onToggle}
          className={`grid size-11 shrink-0 place-items-center rounded-full ${
            active && playing ? "bg-accent/15 text-accent" : "mat-cap text-ink-2"
          }`}
        >
          {active && playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate">
              {item.seq !== undefined ? (
                <Meta className="text-ink-2">#{item.seq}</Meta>
              ) : null}
              <Meta className="ml-2">{formatDateTime(item.takenAt)}</Meta>
            </div>
            <span className="tnum shrink-0 text-[12px] text-ink-2">
              {active ? `${fmt(time)} / ${fmt(total)}` : `0:00 / ${fmt(total)}`}
            </span>
          </div>
          <div
            className="mt-2 h-[3px] cursor-pointer overflow-hidden rounded-full bg-well"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onSeek((e.clientX - rect.left) / rect.width);
            }}
          >
            <div
              className={`h-full rounded-full ${active && playing ? "bg-accent" : "bg-ink-3/50"}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MediaPanel({ deviceId }: { deviceId: string }) {
  const data = useQuery(api.media.mediaByDevice, { deviceId }) as
    | MediaItem[]
    | undefined;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);

  if (data === undefined) {
    return (
      <Panel className="p-4">
        <EmptyState title="Loading" />
      </Panel>
    );
  }

  const photos = data.filter((m) => m.kind === "photo");
  const audio = data.filter((m) => m.kind === "audio");

  const toggle = (item: MediaItem) => {
    const el = audioRef.current;
    if (!el) return;
    if (activeId === item._id) {
      if (el.paused) {
        void el.play();
      } else {
        el.pause();
      }
      return;
    }
    setActiveId(item._id);
    setTime(0);
    setDuration(item.durationMs ? item.durationMs / 1000 : 0);
    el.src = fileUrl(item.storageId);
    void el.play().catch(() => {});
  };

  const seek = (ratio: number) => {
    const el = audioRef.current;
    const total = duration || 0;
    if (el && total > 0) el.currentTime = Math.min(1, Math.max(0, ratio)) * total;
  };

  return (
    <Panel className="p-4">
      <SectionTitle right={<Meta>{data.length} ITEMS</Meta>}>CAPTURED MEDIA</SectionTitle>

      {data.length === 0 ? (
        <EmptyState
          title="No media yet"
          hint="Use the remote controls to capture a photo or record audio."
        />
      ) : (
        <div className="space-y-5">
          <div>
            <Meta>PHOTOS · {photos.length}</Meta>
            {photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {photos.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() =>
                      setLightbox({
                        src: fileUrl(p.storageId),
                        caption: `${p.lens ?? "camera"} · ${formatDateTime(p.takenAt)}`,
                      })
                    }
                    className="group text-left"
                  >
                    <div className="mat-well overflow-hidden rounded-[10px]">
                      <img
                        src={fileUrl(p.storageId)}
                        alt="capture"
                        loading="lazy"
                        className="h-[190px] w-full object-cover transition-opacity group-hover:opacity-80"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between px-0.5">
                      <Meta className={p.lens ? "text-flag" : ""}>{p.lens ?? "camera"}</Meta>
                      <span className="tnum text-[11px] text-ink-3">
                        {formatDateTime(p.takenAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No photos" />
            )}
          </div>

          <div>
            <Meta>AUDIO · {audio.length}</Meta>
            {audio.length > 0 ? (
              <div className="mt-3 space-y-2">
                {audio.map((a) => (
                  <AudioRow
                    key={a._id}
                    item={a}
                    active={activeId === a._id}
                    playing={playing}
                    time={activeId === a._id ? time : 0}
                    duration={duration}
                    onToggle={() => toggle(a)}
                    onSeek={seek}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No audio" />
            )}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        className="hidden"
      />

      {lightbox ? (
        <Lightbox
          open
          onClose={() => setLightbox(null)}
          src={lightbox.src}
          alt="capture"
          caption={lightbox.caption}
        />
      ) : null}
    </Panel>
  );
}
