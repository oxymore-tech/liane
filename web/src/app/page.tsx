"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex flex-1">
      <MapView />
    </main>
  );
}
