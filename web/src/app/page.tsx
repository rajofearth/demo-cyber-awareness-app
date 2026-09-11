"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { DeviceList } from "@/components/dashboard/device-list";
import { GlobalOverview } from "@/components/dashboard/global-overview";
import { DeviceDetail } from "@/components/dashboard/device-detail";
import { HoldToConfirm } from "@/components/interior/hold-to-confirm";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import { logout } from "@/app/login/actions";
import {
  EmptyState,
  Meta,
  Panel,
  timeAgo,
  type Capture,
  type DeviceSummary,
  type LocationPoint,
} from "@/lib/ui";

const MapPanel = dynamic(
  () => import("@/components/dashboard/map-panel").then((m) => m.MapPanel),
  {
    ssr: false,
    loading: () => (
      <div className="mat-panel h-full rounded-[14px]">
        <EmptyState title="Loading map" />
      </div>
    ),
  },
);

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const summaries = useQuery(api.captures.summaries);
  const stats = useQuery(api.captures.stats);
  const deviceCaptures = useQuery(
    api.captures.byDevice,
    selectedId ? { deviceId: selectedId } : "skip",
  );
  const deviceLocations = useQuery(
    api.captures.locationsByDevice,
    selectedId ? { deviceId: selectedId } : "skip",
  );
  const clearAll = useMutation(api.captures.clearAll);

  const devices: DeviceSummary[] = summaries ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      [d.deviceModel, d.deviceId, d.osVersion].join(" ").toLowerCase().includes(q),
    );
  }, [devices, query]);

  const selected = devices.find((d) => d.deviceId === selectedId) ?? null;

  const globalPoints: LocationPoint[] = useMemo(
    () =>
      devices
        .filter((d) => d.hasLocation && d.lastLat !== undefined && d.lastLon !== undefined)
        .map((d, i) => ({
          _id: `${d.deviceId}-${i}`,
          lat: d.lastLat as number,
          lon: d.lastLon as number,
          accuracy: d.lastAccuracy,
          address: d.lastAddress,
          capturedAt: d.lastSeen,
        })),
    [devices],
  );

  const ready = summaries !== undefined && stats !== undefined;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bezel text-ink">
      <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-hairline bg-sub">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-hairline px-4">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flag opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-flag" />
          </span>
          <span className="text-[13px] font-semibold">Permission Harvest</span>
        </div>

        <div className="min-h-0 flex-1">
          <DeviceList
            devices={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            query={query}
            onQuery={setQuery}
          />
        </div>

        <div className="shrink-0 space-y-2 border-t border-hairline p-3">
          <HoldToConfirm
            onConfirm={() => void clearAll()}
            confirmLabel="Erased"
            className="w-full text-flag"
          >
            Hold to erase all data
          </HoldToConfirm>
          <form action={logout}>
            <button
              type="submit"
              className="mat-cap w-full rounded-[10px] py-2 text-[12.5px] text-ink-2 hover:bg-white/[0.04]"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-5">
          <span className="truncate text-[13px] font-medium">
            {selected ? selected.deviceModel : "All devices"}
          </span>
          <span className="meta text-ink-3">
            {selected
              ? `${selected.captureCount} EVENTS · LAST ${timeAgo(selected.lastSeen).toUpperCase()}`
              : `${devices.length} DEVICES`}
          </span>
          <div className="ml-auto flex items-center gap-4">
            <Meta>{stats ? `${stats.totalCaptures} CAPTURES` : "CONNECTING"}</Meta>
            <Meta className="text-flag">
              {stats ? `${stats.allGranted} FULL GRANTS` : ""}
            </Meta>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!ready ? (
            <Panel className="p-6">
              <SkeletonSwap ready={false} lines={8}>
                {null}
              </SkeletonSwap>
            </Panel>
          ) : devices.length === 0 ? (
            <Panel className="p-6">
              <EmptyState
                title="No devices yet"
                hint="Install the calculator app on a phone, open it, and allow the permissions. Data appears here the moment it checks in."
              />
            </Panel>
          ) : selected ? (
            <DeviceDetail
              device={selected}
              captures={(deviceCaptures as Capture[] | undefined) ?? []}
              map={<MapPanel points={(deviceLocations as LocationPoint[] | undefined) ?? []} />}
            />
          ) : (
            <GlobalOverview
              stats={stats}
              devices={devices}
              map={<MapPanel points={globalPoints} />}
            />
          )}
        </div>
      </main>
    </div>
  );
}
