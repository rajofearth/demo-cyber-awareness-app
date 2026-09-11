"use client";

import type { ReactNode } from "react";
import { ValueFlash } from "@/components/interior/value-flash";
import {
  EmptyState,
  Meta,
  Panel,
  SectionTitle,
  Stat,
  timeAgo,
  type DeviceSummary,
  type Stats,
} from "@/lib/ui";

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] shrink-0 text-[12.5px] text-ink-2">{label}</span>
      <div className="h-[26px] flex-1 overflow-hidden rounded-[7px] bg-well">
        <div
          className="h-full rounded-[7px] bg-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right tnum text-[12.5px] text-ink">{value}</span>
    </div>
  );
}

function DayColumns({ data }: { data: Array<{ day: string; captures: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.captures));
  return (
    <div className="flex h-[170px] items-end gap-2">
      {data.map((d) => (
        <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="tnum text-[11px] text-ink-2">{d.captures}</span>
          <div
            className="w-full rounded-t-[6px] bg-accent"
            style={{ height: `${Math.max(8, (d.captures / max) * 116)}px` }}
          />
          <span className="meta text-ink-3">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

export function GlobalOverview({
  stats,
  devices,
  map,
}: {
  stats: Stats;
  devices: DeviceSummary[];
  map: ReactNode;
}) {
  const empty = stats.totalCaptures === 0 || devices.length === 0;
  const rate = stats.totalDevices > 0 ? Math.round((stats.allGranted / stats.totalDevices) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="DEVICES" value={<ValueFlash value={stats.totalDevices} label="Devices" />} />
        <Stat
          label="CAPTURES"
          value={<ValueFlash value={stats.totalCaptures} label="Captures" />}
        />
        <Stat
          label="FULL GRANTS"
          value={
            <ValueFlash value={stats.allGranted} label="Full grants" className="text-flag" />
          }
        />
        <Stat label="LAST CAPTURE" value={stats.lastAt ? timeAgo(stats.lastAt) : "—"} />
      </div>

      {empty ? (
        <Panel className="p-4">
          <EmptyState
            title="No data yet"
            hint="Waiting for the first device to check in."
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="h-[520px]">{map}</div>

          <div className="flex flex-col gap-4">
            <Panel className="p-4">
              <SectionTitle>GRANTS BY PERMISSION</SectionTitle>
              <div className="space-y-2.5">
                <BarRow label="Camera" value={stats.cameraGrants} max={stats.totalCaptures} />
                <BarRow label="Microphone" value={stats.micGrants} max={stats.totalCaptures} />
                <BarRow label="Location" value={stats.locationGrants} max={stats.totalCaptures} />
              </div>
            </Panel>

            <Panel className="p-4">
              <SectionTitle>FULL GRANTS</SectionTitle>
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-semibold leading-none tnum text-flag">
                  {rate}%
                </span>
                <Meta>
                  {stats.allGranted} OF {stats.totalDevices} DEVICES
                </Meta>
              </div>
              <div className="mt-3 h-[8px] overflow-hidden rounded-full bg-well">
                <div className="h-full rounded-full bg-flag" style={{ width: `${rate}%` }} />
              </div>
            </Panel>

            <Panel className="p-4">
              <SectionTitle>ACTIVITY, LAST 7 DAYS</SectionTitle>
              {stats.perDay.length > 0 ? (
                <DayColumns data={stats.perDay} />
              ) : (
                <EmptyState title="No activity yet" />
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
