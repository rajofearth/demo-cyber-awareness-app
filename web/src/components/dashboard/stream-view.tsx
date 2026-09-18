"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/interior/copy-button";
import { NewItemsPill, useNewItems } from "@/components/interior/new-items-pill";
import {
  EmptyState,
  Meta,
  Panel,
  Permissions,
  SectionTitle,
  formatDateTime,
  timeAgo,
  type Capture,
} from "@/lib/ui";

function grant(ok: boolean): string {
  return ok ? "granted" : "denied";
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  const missing = value === undefined || value === null || value === "";
  return (
    <>
      <Meta>{label}</Meta>
      <div className={`min-w-0 break-words ${missing ? "text-ink-3" : "text-ink"}`}>
        {missing ? "—" : value}
      </div>
    </>
  );
}

export function StreamView({
  captures,
  className = "",
}: {
  captures: Capture[];
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { scrollProps, unread, jump } = useNewItems<HTMLDivElement>({
    itemCount: captures.length,
    anchor: "top",
  });

  return (
    <Panel className={`p-4 ${className}`}>
      <SectionTitle
        right={
          <div className="flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flag opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-flag" />
            </span>
            <Meta>{captures.length} EVENTS</Meta>
          </div>
        }
      >
        EVENT STREAM
      </SectionTitle>

      {captures.length === 0 ? (
        <EmptyState title="No events" hint="Nothing has arrived from this device yet." />
      ) : (
        <div
          {...scrollProps}
          className="relative mt-1 max-h-[60vh] min-h-[220px] overflow-y-auto pr-1 sm:max-h-[560px]"
        >
          <NewItemsPill count={unread} onJump={jump} />
          <div className="space-y-2 pt-3">
            {captures.map((capture) => {
              const open = expandedId === capture._id;
              return (
                <div key={capture._id} className="mat-well rounded-[10px] px-3 py-2.5">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpandedId(open ? null : capture._id)}
                    className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 text-left"
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="tnum text-[12.5px] text-ink-2">
                        {formatDateTime(capture.capturedAt)}
                      </span>
                      <Meta>{timeAgo(capture.capturedAt)}</Meta>
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <Permissions c={capture} />
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`size-3.5 text-ink-3 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </span>
                  </button>

                  {open ? (
                    <div className="pt-3">
                      <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-[130px_1fr] sm:text-[12px]">
                        <Field label="Device ID" value={capture.deviceId} />
                        <Field label="Model" value={capture.deviceModel} />
                        <Field label="OS" value={capture.osVersion} />
                        <Field label="App" value={capture.appVersion} />
                        <Field label="CAM" value={grant(capture.camera)} />
                        <Field label="MIC" value={grant(capture.mic)} />
                        <Field label="LOC (precise)" value={grant(capture.locationFine)} />
                        <Field label="LOC (approx)" value={grant(capture.locationCoarse)} />
                        <Field
                          label="Latitude"
                          value={
                            capture.lat !== undefined ? (
                              <span className="tnum">{capture.lat.toFixed(5)}</span>
                            ) : undefined
                          }
                        />
                        <Field
                          label="Longitude"
                          value={
                            capture.lon !== undefined ? (
                              <span className="tnum">{capture.lon.toFixed(5)}</span>
                            ) : undefined
                          }
                        />
                        <Field
                          label="Accuracy"
                          value={
                            capture.accuracy !== undefined ? (
                              <span className="tnum">{Math.round(capture.accuracy)} m</span>
                            ) : undefined
                          }
                        />
                        <Field label="Address" value={capture.address} />
                        <Field
                          label="Captured At"
                          value={
                            <span className="tnum">
                              {new Date(capture.capturedAt).toISOString()}
                            </span>
                          }
                        />
                      </div>

                      <div className="mat-well mt-3 rounded-[10px] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                          <Meta>RAW PAYLOAD</Meta>
                          <CopyButton value={JSON.stringify(capture)} />
                        </div>
                        <pre className="overflow-x-auto text-[11px] leading-relaxed text-ink-2">
                          {JSON.stringify(capture, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}
