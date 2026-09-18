"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { ReactNode } from "react";
import { Tabs } from "@/components/interior/tabs";
import { ControlsPanel } from "./controls-panel";
import { MediaPanel } from "./media-panel";
import { StreamView } from "./stream-view";
import {
  deviceName,
  EmptyState,
  Meta,
  Panel,
  Permissions,
  SectionTitle,
  Stat,
  formatDateTime,
  grantedCount,
  hasLocation,
  shortId,
  timeAgo,
  type Capture,
  type DeviceSummary,
} from "@/lib/ui";

function latestLocation(captures: Capture[]): Capture | null {
  let latest: Capture | null = null;
  for (const capture of captures) {
    if (capture.lat === undefined || capture.lon === undefined) continue;
    if (latest === null || capture.capturedAt > latest.capturedAt) latest = capture;
  }
  return latest;
}

function LocationPanel({
  lat,
  lon,
  accuracy,
  address,
  locatedAt,
  located,
}: {
  lat?: number;
  lon?: number;
  accuracy?: number;
  address?: string;
  locatedAt: number;
  located: boolean;
}) {
  return (
    <Panel className="p-4">
      <SectionTitle>LOCATION</SectionTitle>
      {located ? (
        <div className="space-y-3">
          <div className="tnum text-[15px] font-semibold text-ink sm:text-[18px]">
            {lat !== undefined && lon !== undefined ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : "—"}
          </div>
          <div className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-[110px_1fr] sm:text-[12px]">
            <Meta>Accuracy</Meta>
            <div className="tnum text-ink">
              {accuracy !== undefined ? `±${Math.round(accuracy)} m` : "—"}
            </div>
            <Meta>Address</Meta>
            <div className="min-w-0 break-words text-ink">{address ?? "—"}</div>
            <Meta>Captured</Meta>
            <div className="tnum text-ink">{formatDateTime(locatedAt)}</div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No location fix"
          hint="This device has not reported coordinates."
        />
      )}
    </Panel>
  );
}

export function DeviceDetail({
  device,
  captures,
  map,
}: {
  device: DeviceSummary;
  captures: Capture[];
  map?: ReactNode;
}) {
  const rename = useMutation(api.captures.renameDevice);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const location = latestLocation(captures);
  const lat = device.lastLat ?? location?.lat;
  const lon = device.lastLon ?? location?.lon;
  const accuracy = device.lastAccuracy ?? location?.accuracy;
  const address = device.lastAddress ?? location?.address;
  const locatedAt = location?.capturedAt ?? device.lastSeen;
  const name = deviceName(device);

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {editing ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void rename({ deviceId: device.deviceId, nickname: draft });
                  setEditing(false);
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  maxLength={40}
                  placeholder={device.friendlyName ?? device.deviceModel}
                  className="mat-well w-full max-w-[280px] rounded-[10px] px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3"
                />
                <button
                  type="submit"
                  className="mat-cap rounded-[10px] px-3 py-2 text-[12.5px] text-ink hover:bg-ink/[0.06]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-[10px] px-3 py-2 text-[12.5px] text-ink-3 hover:bg-ink/[0.06] hover:text-ink-2"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-baseline gap-3">
                <div className="truncate text-[20px] font-semibold text-ink">
                  {name}
                  {device.nickname ? (
                    <span className="text-[15px] font-normal text-ink-3">
                      {" "}
                      ({device.deviceModel})
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(device.nickname ?? "");
                    setEditing(true);
                  }}
                  className="shrink-0 text-[12px] text-ink-3 underline decoration-dotted underline-offset-4 hover:text-ink-2"
                >
                  Rename
                </button>
              </div>
            )}
            <div className="mt-1.5">
              <Meta>
                {shortId(device.deviceId)} · {device.osVersion} · app {device.appVersion}
              </Meta>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Permissions c={device} />
            {Date.now() - device.lastSeen < 90_000 ? (
              <div className="mat-cap flex items-center gap-2 rounded-full px-3 py-1.5">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flag opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-flag" />
                </span>
                <Meta className="text-flag">LIVE</Meta>
              </div>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="EVENTS" value={device.captureCount} />
        <Stat label="GRANTS" value={`${grantedCount(device)} / 3`} />
        <Stat
          label="FIRST SEEN"
          value={
            <span className="text-[15px] font-medium">{formatDateTime(device.firstSeen)}</span>
          }
        />
        <Stat label="LAST SEEN" value={timeAgo(device.lastSeen)} />
      </div>

      <Tabs
        items={[
          { value: "events", label: "Events" },
          { value: "media", label: "Media" },
          { value: "map", label: "Map & location" },
        ]}
        defaultValue="events"
        panelClassName="pt-4"
        renderPanel={(value) => {
          if (value === "media") {
            return (
              <div className="space-y-4">
                <ControlsPanel device={device} />
                <MediaPanel deviceId={device.deviceId} />
              </div>
            );
          }
          if (value === "map") {
            return (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="h-[360px] xl:h-[520px]">{map}</div>
                <LocationPanel
                  lat={lat}
                  lon={lon}
                  accuracy={accuracy}
                  address={address}
                  locatedAt={locatedAt}
                  located={hasLocation(device) || location !== null}
                />
              </div>
            );
          }
          return <StreamView captures={captures} />;
        }}
      />
    </div>
  );
}
