"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { EmptyState, Meta, Panel, SectionTitle, Well, formatDateTime } from "@/lib/ui";

const site = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(".cloud", ".site");
const fileUrl = (storageId: string) => `${site}/api/file/${storageId}`;

export function MediaPanel({ deviceId }: { deviceId: string }) {
  const data = useQuery(api.media.mediaByDevice, { deviceId });

  if (data === undefined) {
    return (
      <Panel className="p-4">
        <SectionTitle>CAPTURED MEDIA</SectionTitle>
        <EmptyState title="Loading" />
      </Panel>
    );
  }

  const photos = data.filter((m) => m.kind === "photo");
  const audio = data.filter((m) => m.kind === "audio").sort((a, b) => b.takenAt - a.takenAt);

  return (
    <Panel className="p-4">
      <SectionTitle right={<Meta className="tnum">{data.length} ITEMS</Meta>}>
        CAPTURED MEDIA
      </SectionTitle>

      {data.length === 0 ? (
        <EmptyState
          title="No media yet"
          hint="Use the remote controls to capture a photo or record audio."
        />
      ) : null}

      {photos.length > 0 ? (
        <div className="pb-2">
          <Meta>PHOTOS</Meta>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((item) => (
              <Well key={item._id} className="overflow-hidden">
                <a href={fileUrl(item.storageId)} target="_blank" rel="noreferrer">
                  <img
                    src={fileUrl(item.storageId)}
                    alt=""
                    loading="lazy"
                    className="h-[150px] w-full cursor-pointer object-cover"
                  />
                </a>
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  {item.lens ? <Meta className="text-flag">{item.lens}</Meta> : <span />}
                  <span className="tnum text-[11px] text-ink-3">
                    {formatDateTime(item.takenAt)}
                  </span>
                </div>
              </Well>
            ))}
          </div>
        </div>
      ) : null}

      {audio.length > 0 ? (
        <div className="pb-2">
          <Meta>AUDIO</Meta>
          <div className="mt-2 flex flex-col gap-2">
            {audio.map((item) => (
              <div key={item._id} className="mat-row rounded-[10px] px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {item.seq !== undefined ? <Meta className="tnum">#{item.seq}</Meta> : null}
                  {item.durationMs !== undefined ? (
                    <Meta className="tnum">{(item.durationMs / 1000).toFixed(0)}s</Meta>
                  ) : null}
                  <span className="tnum text-[11px] text-ink-3">
                    {formatDateTime(item.takenAt)}
                  </span>
                </div>
                <audio
                  controls
                  preload="none"
                  src={fileUrl(item.storageId)}
                  className="mt-2 h-8 w-full"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
