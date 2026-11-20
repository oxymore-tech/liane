"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { type FormEvent, useCallback, useState } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import {
  previewRoute,
  searchRallyingPoints,
  snapRallyingPoint,
} from "@/api/lianes";
import type {
  Liane,
  LianeInput,
  RoutePreview as RoutePreviewData,
} from "@/api/types";
import { useDebounce } from "@/components/hooks";
import { routeLabel, stopName } from "@/components/liane/labels";
import { DEFAULT_VIEW } from "@/components/map/map-style";
import { RallyingPointsLayer } from "@/components/map/rallying-points-layer";
import {
  Button,
  Card,
  fieldClass,
  labelClass,
  mutedClass,
  Notice,
  suggestionsClass,
} from "@/components/ui";

const RoutePreview = dynamic(() => import("@/components/map/route-preview"), {
  ssr: false,
});

type Stop = {
  id: string;
  lat: number;
  lng: number;
  city: string;
  label: string;
};

const TOUCH_RADIUS_PIXELS = 32;

function RoutePreviewNote({
  preview,
  loading,
  failed,
}: {
  preview: RoutePreviewData | undefined;
  loading: boolean;
  failed: boolean;
}) {
  if (loading) {
    return <p className={mutedClass}>Calcul du tracé…</p>;
  }
  if (failed) {
    return (
      <p className={mutedClass}>
        L'aperçu du tracé n'est pas disponible pour l'instant.
      </p>
    );
  }
  if (!preview) {
    return (
      <p className={mutedClass}>
        Le tracé par la route s'affiche à partir de deux arrêts.
      </p>
    );
  }
  if (preview.route_source === "Straight") {
    return (
      <Notice tone="warning">
        Tracé approximatif : le calcul par la route n'a pas abouti, la ligne
        relie les arrêts en ligne droite ({routeLabel(preview).toLowerCase()}).
        La liane peut être enregistrée ; son tracé pourra être recalculé plus
        tard.
      </Notice>
    );
  }
  return (
    <p className="text-sm">
      Tracé par la route : <strong>{routeLabel(preview)}</strong>
    </p>
  );
}

/**
 * Création ou modification d'une liane : nom, arrêts dans l'ordre, aperçu du tracé.
 * `onSave` enregistre et renvoie un message d'erreur à afficher, ou rien si tout s'est bien passé.
 */
export function LianeForm({
  liane,
  onSave,
}: {
  liane?: Liane;
  onSave: (input: LianeInput) => Promise<string | null>;
}) {
  const [name, setName] = useState(liane?.name ?? "");
  const [stops, setStops] = useState<Stop[]>(liane?.stops ?? []);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const near = stops[stops.length - 1] ?? {
    lat: DEFAULT_VIEW.latitude,
    lng: DEFAULT_VIEW.longitude,
  };
  const { data: results } = useQuery({
    queryKey: ["rallying-points", debouncedSearch, near.lat, near.lng],
    queryFn: () => searchRallyingPoints(debouncedSearch, near),
    enabled: debouncedSearch.length >= 2,
  });

  const stopIds = stops.map((stop) => stop.id);
  const {
    data: preview,
    isFetching: previewLoading,
    isError: previewFailed,
  } = useQuery({
    queryKey: ["route-preview", stopIds],
    queryFn: () => previewRoute(stopIds),
    enabled: stopIds.length >= 2,
  });
  const shownPreview = stopIds.length >= 2 ? preview : undefined;

  const addStop = useCallback((stop: Stop) => {
    setStops((current) =>
      current.some((existing) => existing.id === stop.id)
        ? current
        : [...current, stop],
    );
    setSearch("");
  }, []);

  /** Un point de ralliement est petit sous le doigt : on prend le plus proche du toucher. */
  const onMapClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const point = await snapRallyingPoint(event.lngLat.lat, event.lngLat.lng);
      const position = event.target.project([point.lng, point.lat]);
      const distance = Math.hypot(
        position.x - event.point.x,
        position.y - event.point.y,
      );
      if (distance <= TOUCH_RADIUS_PIXELS) addStop(point);
    },
    [addStop],
  );

  const move = (index: number, offset: number) =>
    setStops((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const suggestedName =
    stops.length >= 2
      ? `${stopName(stops[0])} – ${stopName(stops[stops.length - 1])}`
      : "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    const failure = await onSave({
      name: name.trim() || suggestedName,
      stop_ids: stopIds,
      is_active: liane?.is_active ?? true,
    });
    if (failure) {
      setError(failure);
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          {liane ? "Modifier la liane" : "Nouvelle liane"}
        </h2>
        <label className={labelClass}>
          Nom de la liane
          <input
            className={fieldClass}
            value={name}
            placeholder={suggestedName || "Florac – Mende"}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">Arrêts, dans l'ordre</h2>
        {stops.length === 0 && (
          <p className={mutedClass}>
            Cherchez une commune ou touchez un point sur la carte. Il faut au
            moins deux arrêts.
          </p>
        )}
        <ol className="flex flex-col gap-1">
          {stops.map((stop, index) => (
            <li
              key={stop.id}
              className="flex items-center gap-2 rounded-field bg-pierre px-2 py-1"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-liane text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                {stopName(stop)}
                <span className="block text-xs text-gris">{stop.label}</span>
              </span>
              <button
                type="button"
                aria-label={`Monter ${stopName(stop)}`}
                className="h-11 w-11 shrink-0 text-lg text-liane disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Descendre ${stopName(stop)}`}
                className="h-11 w-11 shrink-0 text-lg text-liane disabled:opacity-30"
                disabled={index === stops.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Retirer ${stopName(stop)}`}
                className="h-11 w-11 shrink-0 text-lg text-rouge"
                onClick={() =>
                  setStops((current) =>
                    current.filter((existing) => existing.id !== stop.id),
                  )
                }
              >
                ×
              </button>
            </li>
          ))}
        </ol>

        <label className={labelClass}>
          Ajouter un arrêt
          <input
            type="search"
            className={fieldClass}
            value={search}
            placeholder="Nom de la commune"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {debouncedSearch.length >= 2 && results && (
          <ul className={suggestionsClass}>
            {results.length === 0 && (
              <li className={`${mutedClass} px-3 py-2`}>
                Aucun point de ralliement trouvé.
              </li>
            )}
            {results.map((point) => (
              <li key={point.id}>
                <button
                  type="button"
                  className="min-h-11 w-full px-3 py-2 text-left"
                  onClick={() => addStop(point)}
                >
                  {point.label}
                  <span className="block text-xs text-gris">
                    {point.zip_code} {point.city}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="h-80 overflow-hidden rounded-card border border-bordure">
          <RoutePreview
            stops={stops}
            route={shownPreview?.route.coordinates}
            onClick={onMapClick}
          >
            <RallyingPointsLayer />
          </RoutePreview>
        </div>
        <RoutePreviewNote
          preview={shownPreview}
          loading={previewLoading}
          failed={previewFailed}
        />
      </Card>

      {error && <Notice>{error}</Notice>}
      <Button type="submit" disabled={sending || stops.length < 2}>
        {liane ? "Enregistrer" : "Créer la liane"}
      </Button>
    </form>
  );
}
