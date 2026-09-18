"use client";

import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
} from "@/components/ui/map";
import {
  EmptyState,
  Panel,
  formatDateTime,
  type LocationPoint,
} from "@/lib/ui";

export function MapPanel({
  points,
  className = "h-full",
  theme = "dark",
}: {
  points: LocationPoint[];
  className?: string;
  theme?: "light" | "dark";
}) {
  if (points.length === 0) {
    return (
      <Panel className={className}>
        <EmptyState
          title="No location fix"
          hint="This device has not reported coordinates yet."
        />
      </Panel>
    );
  }

  const visible = points.slice(0, 200);
  const center: [number, number] = [
    visible.reduce((sum, p) => sum + p.lon, 0) / visible.length,
    visible.reduce((sum, p) => sum + p.lat, 0) / visible.length,
  ];
  const zoom = visible.length === 1 ? 15 : visible.length <= 5 ? 11 : 10;
  const trail = visible.map((p) => [p.lon, p.lat] as [number, number]);
  // MapLibre paint colors can't resolve CSS variables, so pick per theme.
  const trailColor = theme === "dark" ? "#f5897f" : "#c0442f";

  return (
    <Panel className={`overflow-hidden ${className}`}>
      <Map center={center} zoom={zoom} theme={theme}>
        <MapControls />
        {visible.length >= 2 ? (
          <MapRoute coordinates={trail} color={trailColor} width={2} opacity={0.55} />
        ) : null}
        {visible.map((p) => (
          <MapMarker key={p._id} longitude={p.lon} latitude={p.lat}>
            <MarkerContent>
              <div className="relative">
                <div className="absolute -inset-2 animate-ping rounded-full bg-flag/25" />
                <div className="size-3.5 rounded-full border-2 border-white bg-flag" />
              </div>
            </MarkerContent>
            <MarkerPopup className="bg-popover! text-popover-foreground!">
              <div className="text-[12px] leading-snug">
                <div>{p.address ?? "No address"}</div>
                <div className="tnum text-muted-foreground">
                  {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
                  {p.accuracy != null ? ` · ±${Math.round(p.accuracy)}m` : ""}
                </div>
                <div className="tnum text-muted-foreground">{formatDateTime(p.capturedAt)}</div>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}
      </Map>
    </Panel>
  );
}
