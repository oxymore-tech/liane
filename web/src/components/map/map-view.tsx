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
import { getLiane, listLianes, listLianesNear } from "@/api/lianes";
import type { Liane } from "@/api/types";
import { Logo } from "@/components/brand";
import { useAppContext } from "@/components/context-provider";
import { memberCountLabel } from "@/components/liane/labels";
import {
  MemberCount,
  ScheduleTable,
  StopList,
} from "@/components/liane/liane-summary";
import { buttonClass, listClass, mutedClass } from "@/components/ui";
import { cn } from "@/components/utils";
import {
  LIANES_TOUCH_LAYER_ID,
  LIANES_TOUCH_WIDTH_PIXELS,
  LianesLayer,
} from "./lianes-layer";
import { boundsOf, DEFAULT_VIEW, mapStyle } from "./map-style";
import { PlaceNamesLayer } from "./place-names-layer";

/** Sur grand écran, la fiche flotte à gauche de la carte : le cadrage lui laisse la place. */
const WIDE_SCREEN = "(min-width: 1024px)";
const PANEL_WIDTH_PIXELS = 416;

const panelClass =
  "overflow-y-auto rounded-t-card border-t border-bordure bg-white p-4 text-encre lg:absolute lg:bottom-4 lg:left-4 lg:max-h-[calc(100%-6rem)] lg:w-[26rem] lg:rounded-card lg:border";

const navLinkClass =
  "flex min-h-11 items-center rounded-full border border-bordure bg-white px-3.5 text-sm font-semibold text-liane sm:px-4 sm:text-base";

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fermer"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pale text-xl text-liane"
    >
      ×
    </button>
  );
}

function LianePanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data: liane, isError } = useQuery({
    queryKey: ["liane", slug],
    queryFn: () => getLiane(slug),
  });

  return (
    <section
      aria-label="Fiche de la liane"
      className={cn(panelClass, "max-h-[70%]")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">{liane?.name ?? "…"}</h2>
          {liane && <MemberCount liane={liane} />}
        </div>
        <CloseButton onClose={onClose} />
      </div>
      {isError && (
        <p className="mt-2 text-gris">Cette liane est introuvable.</p>
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

/** Mètres par pixel à une latitude et un zoom donnés (tuiles de 512 pixels). */
const metersPerPixel = (latitude: number, zoom: number) =>
  (78271.517 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;

/** Là où plusieurs lianes empruntent la même route, le toucher ne peut pas en désigner une seule. */
function LianeChoice({
  lianes,
  onChoose,
  onClose,
}: {
  lianes: Liane[];
  onChoose: (slug: string) => void;
  onClose: () => void;
}) {
  return (
    <section
      aria-label="Lianes qui passent ici"
      className={cn(panelClass, "max-h-[60%]")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {lianes.length} lianes passent ici
          </h2>
          <p className="text-gris">Laquelle voulez-vous voir ?</p>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <ul className={cn(listClass, "mt-2")}>
        {lianes.map((liane) => (
          <li key={liane.id}>
            <button
              type="button"
              className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left"
              onClick={() => onChoose(liane.slug)}
            >
              <span>
                <span className="block font-semibold">{liane.name}</span>
                <span className={cn(mutedClass, "block")}>
                  {memberCountLabel(liane.member_count)}
                </span>
              </span>
              <span aria-hidden className="text-xl text-liane">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { user } = useAppContext();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [choices, setChoices] = useState<Liane[] | null>(null);
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
      const besidePanel = window.matchMedia(WIDE_SCREEN).matches;
      mapRef.current?.fitBounds(bounds, {
        padding: {
          top: 72,
          bottom: 48,
          right: 48,
          left: besidePanel ? PANEL_WIDTH_PIXELS + 64 : 48,
        },
        duration: 0,
      });
    }
  }, [mapLoaded, lianes]);

  const select = useCallback((slug: string | null) => {
    setSelectedSlug(slug);
    setChoices(null);
    setListOpen(false);
  }, []);

  /** On demande au serveur quelles lianes passent sous le doigt : une seule s'ouvre, plusieurs se choisissent. */
  const onClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      if (!event.features?.length) {
        select(null);
        return;
      }
      const radius =
        (LIANES_TOUCH_WIDTH_PIXELS / 2) *
        metersPerPixel(event.lngLat.lat, event.target.getZoom());
      const touched = await listLianesNear(event.lngLat, radius).catch(
        () => [],
      );
      if (touched.length > 1) {
        select(null);
        setChoices(touched);
      } else {
        select(touched[0]?.slug ?? null);
      }
    },
    [select],
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <nav className="absolute left-3 right-3 top-3 z-10 flex flex-wrap gap-2">
        <span className={navLinkClass}>
          <Logo className="h-[18px] sm:h-5" />
        </span>
        <Link href="/recherche" className={navLinkClass}>
          Rechercher
        </Link>
        <Link
          href={user ? "/mes-lianes" : "/connexion"}
          className={navLinkClass}
        >
          {user ? "Mes lianes" : "Connexion"}
        </Link>
        {user?.is_admin && (
          <Link href="/admin/lianes" className={navLinkClass}>
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
            position="bottom-right"
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation
          />
          <NavigationControl position="bottom-right" showCompass={false} />
          <PlaceNamesLayer />
          <LianesLayer lianes={lianes ?? []} selectedSlug={selectedSlug} />
        </MapGL>
      </div>

      {choices ? (
        <LianeChoice
          lianes={choices}
          onChoose={select}
          onClose={() => select(null)}
        />
      ) : selectedSlug ? (
        <LianePanel slug={selectedSlug} onClose={() => select(null)} />
      ) : (
        <section className={cn(panelClass, "max-h-[50%] py-2")}>
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
              <span className="text-liane underline">
                {listOpen ? "Fermer" : "Liste"}
              </span>
            )}
          </button>
          {listOpen && (
            <ul className={cn(listClass, "mt-1")}>
              {lianes?.map((liane) => (
                <li key={liane.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
                    onClick={() => select(liane.slug)}
                  >
                    <span className="font-medium">{liane.name}</span>
                    <span className={mutedClass}>
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
