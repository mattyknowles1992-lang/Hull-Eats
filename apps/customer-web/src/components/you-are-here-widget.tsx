"use client";

type YouAreHereWidgetProps = {
  latitude: number;
  longitude: number;
};

export function YouAreHereWidget({ latitude, longitude }: YouAreHereWidgetProps) {
  return (
    <aside className="you-are-here-widget" aria-label="Your approximate position on the map">
      <div className="you-are-here-map" aria-hidden="true">
        <div className="you-are-here-grid" />
        <div className="you-are-here-shore" />
        <span className="you-are-here-pin" title="You are here" />
      </div>
      <div className="you-are-here-copy">
        <p className="eyebrow you-are-here-eyebrow">You are here</p>
        <p className="you-are-here-coords">
          {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
        </p>
        <p className="you-are-here-hint">Hull area · used to sort nearby stores</p>
      </div>
    </aside>
  );
}
