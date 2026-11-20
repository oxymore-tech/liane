"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { searchLianes } from "@/api/lianes";
import type { LianeSearchResult, RallyingPoint } from "@/api/types";
import {
  distanceLabel,
  memberCountLabel,
  stopName,
} from "@/components/liane/labels";
import { PlaceField } from "@/components/place-field";
import {
  buttonClass,
  Card,
  MascotNote,
  mutedClass,
  Notice,
  Page,
} from "@/components/ui";
import { cn } from "@/components/utils";

/** Un arrêt compte comme « près » du lieu cherché jusqu'à cette distance à vol d'oiseau. */
const SEARCH_RADIUS_METERS = 10_000;
const SAME_PLACE_METERS = 300;

function StopLine({
  verb,
  result,
  stopId,
  distanceMeters,
  place,
}: {
  verb: string;
  result: LianeSearchResult;
  stopId: string;
  distanceMeters: number;
  place: RallyingPoint;
}) {
  const stop = result.liane.stops.find((candidate) => candidate.id === stopId);
  if (!stop) return null;
  return (
    <p>
      {verb} <strong>{stopName(stop)}</strong>
      <span className={cn(mutedClass, "block")}>
        {stop.label}
        {distanceMeters > SAME_PLACE_METERS &&
          ` · à ${distanceLabel(distanceMeters)} de ${stopName(place)}`}
      </span>
    </p>
  );
}

function Result({
  result,
  from,
  to,
}: {
  result: LianeSearchResult;
  from: RallyingPoint;
  to: RallyingPoint;
}) {
  const { liane } = result;
  return (
    <Card className="flex flex-col gap-2">
      <div>
        <h2 className="text-xl font-extrabold">{liane.name}</h2>
        <p className={mutedClass}>{memberCountLabel(liane.member_count)}</p>
      </div>
      <StopLine
        verb="Montez à"
        result={result}
        stopId={result.from_stop_id}
        distanceMeters={result.from_distance_meters}
        place={from}
      />
      <StopLine
        verb="Descendez à"
        result={result}
        stopId={result.to_stop_id}
        distanceMeters={result.to_distance_meters}
        place={to}
      />
      <p className="text-sm">
        Tronçon de {distanceLabel(result.section_distance_meters)}
        {liane.route_source === "Straight" && " à vol d'oiseau"}
      </p>
      <Link href={`/l/${liane.slug}`} className={buttonClass("primary")}>
        Voir cette liane
      </Link>
    </Card>
  );
}

export default function SearchPage() {
  const [from, setFrom] = useState<RallyingPoint | null>(null);
  const [to, setTo] = useState<RallyingPoint | null>(null);
  const {
    data: results,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["liane-search", from?.id, to?.id],
    queryFn: () =>
      searchLianes(
        from as RallyingPoint,
        to as RallyingPoint,
        SEARCH_RADIUS_METERS,
      ),
    enabled: Boolean(from && to),
  });

  return (
    <Page title="Trouver une liane">
      <Card className="flex flex-col gap-4">
        <PlaceField
          label="D'où partez-vous ?"
          placeholder="Commune de départ"
          value={from}
          onChange={setFrom}
        />
        <PlaceField
          label="Où allez-vous ?"
          placeholder="Commune d'arrivée"
          value={to}
          onChange={setTo}
        />
      </Card>

      {from && to && isFetching && <Card>Recherche…</Card>}
      {isError && <Notice>La recherche n'a pas fonctionné. Réessayez.</Notice>}
      {from && to && !isFetching && results?.length === 0 && (
        <MascotNote>
          <p className="font-semibold">
            Aucune liane ne passe par là pour l'instant.
          </p>
          <Link href="/" className={buttonClass("secondary")}>
            Voir toutes les lianes sur la carte
          </Link>
        </MascotNote>
      )}
      {from &&
        to &&
        !isFetching &&
        results?.map((result) => (
          <Result key={result.liane.id} result={result} from={from} to={to} />
        ))}
    </Page>
  );
}
