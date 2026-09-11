"use client";

import {
  EmptyState,
  Permissions,
  shortId,
  timeAgo,
  type DeviceSummary,
} from "@/lib/ui";

export function DeviceList({
  devices,
  selectedId,
  onSelect,
  query,
  onQuery,
}: {
  devices: DeviceSummary[];
  selectedId: string | null;
  onSelect: (deviceId: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative mb-3">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-3.5"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 14 14" strokeLinecap="round" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search devices"
          className="mat-well w-full rounded-[10px] py-3 pr-3 pl-8 text-[13px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      <div className="no-bar flex-1 overflow-y-auto">
        {devices.length === 0 ? (
          <EmptyState
            title="No devices yet"
            hint="Open the calculator app on a phone and allow the permissions."
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`mb-1 w-full rounded-[10px] px-3 py-3 text-left transition-colors ${
                selectedId === null
                  ? "mat-row ring-1 ring-accent/40"
                  : "hover:bg-white/[0.03]"
              }`}
            >
              <div className="text-[13px] font-medium text-ink">All devices</div>
              <div className="meta mt-1.5 text-ink-3">{devices.length} devices</div>
            </button>
            {devices.map((device) => (
              <button
                key={device.deviceId}
                type="button"
                onClick={() => onSelect(device.deviceId)}
                className={`mb-1 w-full rounded-[10px] px-3 py-3 text-left transition-colors ${
                  selectedId === device.deviceId
                    ? "mat-row ring-1 ring-accent/40"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-ink">
                    {device.deviceModel}
                  </span>
                  <span className="meta shrink-0 text-ink-3">
                    {timeAgo(device.lastSeen)}
                  </span>
                </div>
                <div className="meta mt-1.5 text-ink-3">
                  {shortId(device.deviceId)} · {device.captureCount} events
                </div>
                <div className="mt-2">
                  <Permissions c={device} />
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
