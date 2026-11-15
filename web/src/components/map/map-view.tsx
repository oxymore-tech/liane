"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GeolocateControl,
  Map as MapGL,
  type MapLayerMouseEvent,
  type MapRef,
  NavigationControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getLiane, listLianes } from "@/api/lianes";
import { useAppContext } from "@/components/context-provider";
import { memberCountLabel } from "@/components/liane/labels";
import {
  MemberCount,
  ScheduleTable,
  StopList,
} from "@/components/liane/liane-summary";
import { buttonClass } from "@/components/ui";
import { LIANES_TOUCH_LAYER_ID, LianesLayer } from "./lianes-layer";
import { boundsOf, DEFAULT_VIEW, mapStyle } from "./map-style";
import { PlaceNamesLayer } from "./place-names-layer";

function LianePanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data: liane, isError } = useQuery({
    queryKey: ["liane", slug],
    queryFn: () => getLiane(slug),
  });

  return (
    <section
      aria-label="Fiche de la liane"
      className="max-h-[70%] overflow-y-auto rounded-t-2xl bg-white p-4 text-gray-900 shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{liane?.name ?? "…"}</h2>
          {liane && <MemberCount liane={liane} />}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-xl"
        >
          ×
        </button>
      </div>
      {isError && (
        <p className="mt-2 text-gray-600">Cette liane est introuvable.</p>
      )}
      {liane && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex gap-3">
            {!liane.membership && (
              <Link
                href={`/l/${liane.slug}?rejoindre=1`}
                className={`${buttonClass("primary")} flex-1`}
              >
                Rejoindre
              </Link>
            )}
            <Link
              href={`/l/${liane.slug}`}
              className={`${buttonClass("secondary")} flex-1`}
            >
              {liane.membership ? "Ouvrir ma liane" : "Voir la page"}
            </Link>
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Arrêts</h3>
            <StopList liane={liane} />
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Qui roule quand</h3>
            <ScheduleTable liane={liane} schedule={liane.schedule} />
          </div>
        </div>
      )}
    </section>
  );
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { user } = useAppContext();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const style = useMemo(mapStyle, []);
  const { data: lianes } = useQuery({
    queryKey: ["lianes"],
    queryFn: listLianes,
  });

  useEffect(() => {
    if (!mapLoaded || !lianes) return;
    const bounds = boundsOf(lianes.flatMap((liane) => liane.stops));
    if (bounds) {
      mapRef.current?.fitBounds(bounds, { padding: 48, duration: 0 });
    }
  }, [mapLoaded, lianes]);

  const select = useCallback((slug: string | null) => {
    setSelectedSlug(slug);
    setListOpen(false);
  }, []);

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const slug = event.features?.[0]?.properties?.slug;
      select(typeof slug === "string" ? slug : null);
    },
    [select],
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <nav className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 pr-14">
        <span className="rounded-full bg-emerald-700 px-4 py-2 font-bold text-white shadow">
          Liane
        </span>
        <Link
          href={user ? "/mes-lianes" : "/connexion"}
          className="rounded-full bg-white px-4 py-2 font-semibold text-gray-800 shadow"
        >
          {user ? "Mes lianes" : "Connexion"}
        </Link>
        {user?.is_admin && (
          <Link
            href="/admin/lianes"
            className="rounded-full bg-white px-4 py-2 font-semibold text-gray-800 shadow"
          >
            Admin
          </Link>
        )}
      </nav>

      <div className="relative flex-1">
        <MapGL
          ref={mapRef}
          initialViewState={DEFAULT_VIEW}
          mapStyle={style}
          attributionControl={false}
          interactiveLayerIds={[LIANES_TOUCH_LAYER_ID]}
          onClick={onClick}
          onLoad={() => setMapLoaded(true)}
          cursor="auto"
        >
          <GeolocateControl
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation
          />
          <NavigationControl position="top-right" showCompass={false} />
          <PlaceNamesLayer />
          <LianesLayer lianes={lianes ?? []} selectedSlug={selectedSlug} />
        </MapGL>
      </div>

      {selectedSlug ? (
        <LianePanel slug={selectedSlug} onClose={() => select(null)} />
      ) : (
        <section className="max-h-[50%] overflow-y-auto bg-white px-4 py-3 text-gray-900 shadow-[0_-4px_16px_rgba(0,0,0,0.15)]">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between text-left font-semibold"
            aria-expanded={listOpen}
            onClick={() => setListOpen((open) => !open)}
          >
            <span>
              {lianes === undefined
                ? "Chargement des lianes…"
                : lianes.length === 0
                  ? "Aucune liane pour l'instant"
                  : lianes.length === 1
                    ? "1 liane – touchez-la sur la carte"
                    : `${lianes.length} lianes – touchez-en une sur la carte`}
            </span>
            {lianes && lianes.length > 0 && (
              <span className="text-emerald-700">
                {listOpen ? "Fermer" : "Liste"}
              </span>
            )}
          </button>
          {listOpen && (
            <ul className="mt-1 divide-y divide-gray-100">
              {lianes?.map((liane) => (
                <li key={liane.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
                    onClick={() => select(liane.slug)}
                  >
                    <span className="font-medium">{liane.name}</span>
                    <span className="text-sm text-gray-500">
                      {memberCountLabel(liane.member_count)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
