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
}: {
  points: LocationPoint[];
  className?: string;
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

  return (
    <Panel className={`overflow-hidden ${className}`}>
      <Map center={center} zoom={zoom}>
        <MapControls />
        {visible.length >= 2 ? (
          <MapRoute coordinates={trail} color="#f5897f" width={2} opacity={0.55} />
        ) : null}
        {visible.map((p) => (
          <MapMarker key={p._id} longitude={p.lon} latitude={p.lat}>
            <MarkerContent>
              <div className="relative">
                <div className="absolute -inset-2 animate-ping rounded-full bg-[#f5897f]/25" />
                <div className="size-3.5 rounded-full border-2 border-white bg-[#f5897f]" />
              </div>
            </MarkerContent>
            <MarkerPopup className="bg-white! text-stone-800!">
              <div className="text-[12px] leading-snug">
                <div>{p.address ?? "No address"}</div>
                <div className="tnum text-stone-600">
                  {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
                  {p.accuracy != null ? ` · ±${Math.round(p.accuracy)}m` : ""}
                </div>
                <div className="tnum text-stone-600">{formatDateTime(p.capturedAt)}</div>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}
      </Map>
    </Panel>
  );
}
