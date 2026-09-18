"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Meta, Panel, SectionTitle, type DeviceSummary } from "@/lib/ui";

type ButtonKey = "front" | "rear" | "mic-start" | "mic-stop";

export function ControlsPanel({ device }: { device: DeviceSummary }) {
  const createCommand = useMutation(api.media.createCommand);
  const commands = useQuery(api.media.commandsByDevice, { deviceId: device.deviceId });
  const [inFlight, setInFlight] = useState<ButtonKey | null>(null);

  const buttons: Array<{ key: ButtonKey; label: string; run: () => Promise<unknown> }> = [
    {
      key: "front",
      label: "PHOTO FRONT",
      run: () => createCommand({ deviceId: device.deviceId, type: "photo", lens: "front" }),
    },
    {
      key: "rear",
      label: "PHOTO REAR",
      run: () => createCommand({ deviceId: device.deviceId, type: "photo", lens: "rear" }),
    },
    {
      key: "mic-start",
      label: "MIC START",
      run: () => createCommand({ deviceId: device.deviceId, type: "audio", audioAction: "start" }),
    },
    {
      key: "mic-stop",
      label: "MIC STOP",
      run: () => createCommand({ deviceId: device.deviceId, type: "audio", audioAction: "stop" }),
    },
  ];

  const onClick = (key: ButtonKey, run: () => Promise<unknown>) => {
    if (inFlight !== null) return;
    setInFlight(key);
    void run().finally(() => {
      setTimeout(() => setInFlight((current) => (current === key ? null : current)), 3000);
    });
  };

  const pending = commands ? commands.filter((c) => c.status === "pending").length : 0;
  const failed = commands ? commands.slice(0, 5).some((c) => c.status === "failed") : false;

  return (
    <Panel className="p-4">
      <SectionTitle>REMOTE CONTROLS</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            disabled={inFlight === b.key}
            onClick={() => onClick(b.key, b.run)}
            className={`mat-cap min-h-[44px] w-full rounded-[10px] px-3 py-2.5 text-ink-2 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-50 ${
              inFlight === b.key ? "cursor-wait" : "cursor-pointer"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      {commands ? (
        <div className="mt-3 flex items-center gap-3">
          <Meta className="tnum">PENDING: {pending}</Meta>
          {failed ? <Meta className="text-flag">last command failed</Meta> : null}
        </div>
      ) : null}
    </Panel>
  );
}
