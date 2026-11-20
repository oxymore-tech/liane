"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GeolocateControl,
  Map as MapGL,
  type MapLayerMouseEvent,
  type MapRef,
  NavigationControl,
  Popup,
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
import { PointName } from "@/components/rallying-point/point-name";
import {
  Button,
  buttonClass,
  Chevron,
  listClass,
  mutedClass,
} from "@/components/ui";
import { cn } from "@/components/utils";
import {
  LIANE_STOPS_LAYER_ID,
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

const navActionClass = cn(
  navLinkClass,
  "border-liane transition-colors hover:bg-pale active:bg-pousse",
);

const rowButtonClass =
  "flex min-h-14 w-full items-center justify-between gap-3 rounded-field px-2 py-2 text-left transition-colors hover:bg-pale active:bg-pousse";

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fermer"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pale text-xl text-liane transition-colors hover:bg-pousse"
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
      onKeyDown={(event) => event.key === "Escape" && onClose()}
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
      onKeyDown={(event) => event.key === "Escape" && onClose()}
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
              className={rowButtonClass}
              onClick={() => onChoose(liane.slug)}
            >
              <span>
                <span className="block font-semibold">{liane.name}</span>
                <span className={cn(mutedClass, "block")}>
                  {memberCountLabel(liane.member_count)}
                </span>
              </span>
              <Chevron className="-rotate-90" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sans liane choisie : le nombre de lianes, et leur liste qui se déplie. */
function LianeList({
  lianes,
  onChoose,
}: {
  lianes: Liane[] | undefined;
  onChoose: (slug: string) => void;
}) {
  if (!lianes || lianes.length === 0) {
    return (
      <section className={cn(panelClass, "py-2")}>
        <p className="flex min-h-11 items-center font-semibold">
          {lianes ? "Aucune liane pour l'instant" : "Chargement des lianes…"}
        </p>
      </section>
    );
  }
  return (
    <Disclosure as="section" className={cn(panelClass, "max-h-[50%] py-2")}>
      <DisclosureButton className="group flex min-h-11 w-full items-center justify-between gap-3 text-left font-semibold">
        <span>
          {lianes.length === 1
            ? "1 liane – touchez-la sur la carte"
            : `${lianes.length} lianes – touchez-en une sur la carte`}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-liane underline underline-offset-2 group-hover:decoration-2">
          <span className="group-data-open:hidden">Liste</span>
          <span className="hidden group-data-open:inline">Fermer</span>
          <Chevron className="group-data-open:rotate-180" />
        </span>
      </DisclosureButton>
      <DisclosurePanel as="ul" className={cn(listClass, "mt-1")}>
        {lianes.map((liane) => (
          <li key={liane.id}>
            <button
              type="button"
              className={rowButtonClass}
              onClick={() => onChoose(liane.slug)}
            >
              <span>
                <span className="block font-semibold">{liane.name}</span>
                <span className={cn(mutedClass, "block")}>
                  {memberCountLabel(liane.member_count)}
                </span>
              </span>
              <Chevron className="-rotate-90" />
            </button>
          </li>
        ))}
      </DisclosurePanel>
    </Disclosure>
  );
}

/** Ce que le pointeur survole sur la carte : un arrêt, ou un tronçon et les lianes qui l'empruntent. */
type Hover = {
  key: string;
  lng: number;
  lat: number;
  stop: { label: string; city: string } | null;
  slugs: string[];
};

function hoverOf(event: MapLayerMouseEvent, lianes: Liane[]): Hover | null {
  const feature = event.features?.[0];
  if (!feature) return null;
  const properties = feature.properties;
  if (
    feature.layer.id === LIANE_STOPS_LAYER_ID &&
    feature.geometry.type === "Point"
  ) {
    const [lng, lat] = feature.geometry.coordinates;
    return {
      key: `stop:${properties.id}`,
      lng,
      lat,
      stop: { label: properties.label, city: properties.city },
      slugs: lianes
        .filter((liane) =>
          liane.stops.some((stop) => stop.id === properties.id),
        )
        .map((liane) => liane.slug),
    };
  }
  return {
    key: `lianes:${properties.slugs}`,
    lng: event.lngLat.lng,
    lat: event.lngLat.lat,
    stop: null,
    slugs: String(properties.slugs).split("|").filter(Boolean),
  };
}

/** Popover au survol d'un arrêt ou d'un tronçon : les lianes qui y passent, chacune avec « Voir ». */
function HoverPopover({
  hover,
  lianes,
  onSee,
  onEnter,
  onLeave,
}: {
  hover: Hover;
  lianes: Liane[];
  onSee: (slug: string) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const passing = lianes.filter((liane) => hover.slugs.includes(liane.slug));
  return (
    <Popup
      longitude={hover.lng}
      latitude={hover.lat}
      offset={14}
      maxWidth="19rem"
      closeButton={false}
      closeOnClick={false}
      focusAfterOpen={false}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: un groupe d'actions, pas un formulaire */}
      <div
        role="group"
        aria-label="Aperçu"
        className="flex flex-col gap-1"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {hover.stop && (
          <p>
            <PointName point={hover.stop} />
          </p>
        )}
        <ul className={listClass}>
          {passing.map((liane) => (
            <li
              key={liane.id}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <span>
                <span className="block font-semibold">{liane.name}</span>
                <span className={cn(mutedClass, "block")}>
                  {memberCountLabel(liane.member_count)}
                </span>
              </span>
              <Button
                variant="secondary"
                aria-label={`Voir ${liane.name}`}
                onClick={() => onSee(liane.slug)}
              >
                Voir
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Popup>
  );
}

const HOVER_CLOSE_DELAY_MS = 300;

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { user } = useAppContext();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [choices, setChoices] = useState<Liane[] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [overLiane, setOverLiane] = useState(false);
  const hoverCloseTimer = useRef<number | undefined>(undefined);
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
    setHover(null);
  }, []);

  const keepHover = useCallback(
    () => window.clearTimeout(hoverCloseTimer.current),
    [],
  );

  /** Le popover reste le temps d'aller du trait à son bouton « Voir ». */
  const closeHoverSoon = useCallback(() => {
    keepHover();
    hoverCloseTimer.current = window.setTimeout(
      () => setHover(null),
      HOVER_CLOSE_DELAY_MS,
    );
  }, [keepHover]);

  useEffect(() => keepHover, [keepHover]);

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const next = hoverOf(event, lianes ?? []);
      if (!next) return;
      keepHover();
      setHover((current) => (current?.key === next.key ? current : next));
    },
    [lianes, keepHover],
  );

  /** On demande au serveur quelles lianes passent sous le doigt : une seule s'ouvre, plusieurs se choisissent. */
  const onClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      setHover(null);
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
        <Link href="/recherche" className={navActionClass}>
          Rechercher
        </Link>
        <Link
          href={user ? "/mes-lianes" : "/connexion"}
          className={navActionClass}
        >
          {user ? "Mes lianes" : "Connexion"}
        </Link>
        {user?.is_admin && (
          <Link href="/admin/lianes" className={navActionClass}>
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
          interactiveLayerIds={[LIANES_TOUCH_LAYER_ID, LIANE_STOPS_LAYER_ID]}
          onClick={onClick}
          onMouseMove={onMouseMove}
          onMouseEnter={() => setOverLiane(true)}
          onMouseLeave={() => {
            setOverLiane(false);
            closeHoverSoon();
          }}
          onLoad={() => setMapLoaded(true)}
          cursor={overLiane ? "pointer" : "auto"}
        >
          <GeolocateControl
            position="bottom-right"
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation
          />
          <NavigationControl position="bottom-right" showCompass={false} />
          <PlaceNamesLayer />
          <LianesLayer lianes={lianes ?? []} selectedSlug={selectedSlug} />
          {hover && (
            <HoverPopover
              hover={hover}
              lianes={lianes ?? []}
              onSee={select}
              onEnter={keepHover}
              onLeave={() => setHover(null)}
            />
          )}
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
        <LianeList lianes={lianes} onChoose={select} />
      )}
    </div>
  );
}
