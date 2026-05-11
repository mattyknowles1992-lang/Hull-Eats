"use client";

import { useEffect, useState } from "react";

import { isSensoryDelightsEnabled, setSensoryDelightsEnabled } from "../lib/customer-experience";

export function SensoryDelightsToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(isSensoryDelightsEnabled());
    sync();
    window.addEventListener("hull-eats-sensory-changed", sync);
    return () => window.removeEventListener("hull-eats-sensory-changed", sync);
  }, []);

  return (
    <label className="sensory-delights-toggle">
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => {
          setSensoryDelightsEnabled(event.target.checked);
          setOn(event.target.checked);
        }}
      />
      <span>Tiny sound &amp; buzz on success (optional)</span>
    </label>
  );
}
