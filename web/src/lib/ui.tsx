import type { ReactNode } from "react";

export type Capture = {
  _id: string;
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  camera: boolean;
  mic: boolean;
  locationFine: boolean;
  locationCoarse: boolean;
  lat?: number;
  lon?: number;
  accuracy?: number;
  address?: string;
  capturedAt: number;
};

export type DeviceSummary = {
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  firstSeen: number;
  lastSeen: number;
  captureCount: number;
  camera: boolean;
  mic: boolean;
  location: boolean;
  hasLocation: boolean;
  lastLat?: number;
  lastLon?: number;
  lastAccuracy?: number;
  lastAddress?: string;
};

export type LocationPoint = {
  _id: string;
  lat: number;
  lon: number;
  accuracy?: number;
  address?: string;
  capturedAt: number;
};

export type Stats = {
  totalCaptures: number;
  totalDevices: number;
  cameraGrants: number;
  micGrants: number;
  locationGrants: number;
  allGranted: number;
  lastAt: number | null;
  perDay: Array<{ day: string; captures: number }>;
};

export function timeAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function shortId(id: string): string {
  return id.slice(0, 10);
}

export function hasLocation(c: Capture | DeviceSummary): boolean {
  if ("hasLocation" in c) return c.hasLocation;
  return c.lat !== undefined && c.lon !== undefined;
}

export function grantedCount(d: { camera: boolean; mic: boolean; location: boolean }): number {
  return (d.camera ? 1 : 0) + (d.mic ? 1 : 0) + (d.location ? 1 : 0);
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mat-panel rounded-[14px] ${className}`}>{children}</div>;
}

export function Well({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mat-well rounded-[10px] ${className}`}>{children}</div>;
}

export function Meta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`meta text-ink-3 ${className}`}>{children}</span>;
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pb-3">
      <span className="meta text-ink-3">{children}</span>
      {right}
    </div>
  );
}

export function PermChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`meta inline-block rounded-full px-2 py-[3px] ${
        ok ? "bg-flag/15 text-flag" : "bg-well text-ink-3"
      }`}
    >
      {label}
    </span>
  );
}

export function Permissions({ c }: { c: Capture | DeviceSummary }) {
  const cam = c.camera;
  const mic = c.mic;
  const loc = "location" in c ? c.location : c.locationFine || c.locationCoarse;
  return (
    <div className="flex flex-wrap gap-1.5">
      <PermChip ok={cam} label="CAM" />
      <PermChip ok={mic} label="MIC" />
      <PermChip ok={loc} label="LOC" />
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  className = "",
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-[10px] px-6 py-14 text-center ${className}`}
    >
      <div className="mat-well grid size-10 place-items-center rounded-full">
        <span className="size-1.5 rounded-full bg-ink-3" />
      </div>
      <div className="text-[13.5px] font-medium text-ink-2">{title}</div>
      {hint ? <div className="max-w-xs text-[12.5px] leading-relaxed text-ink-3">{hint}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Panel className="p-4">
      <Meta>{label}</Meta>
      <div className="mt-3 text-[26px] font-semibold leading-none tnum text-ink">{value}</div>
      {hint ? <div className="mt-2 text-[12px] leading-snug text-ink-3">{hint}</div> : null}
    </Panel>
  );
}
