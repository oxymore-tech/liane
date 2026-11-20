"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useState } from "react";
import type {
  AdminRallyingPoint,
  RallyingPoint,
  RallyingPointInput,
} from "@/api/types";
import { PlaceField } from "@/components/place-field";
import { Button, Card, fieldClass, Notice } from "@/components/ui";
import { KIND_LABELS, lianeCountLabel, quoted } from "./labels";

const PointPicker = dynamic(() => import("@/components/map/point-picker"), {
  ssr: false,
});

type Place = { lat: number; lng: number };

const coordinatesLabel = (place: Place) =>
  `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`;

/**
 * Création ou modification d'un point de ralliement : position sur la carte, puis ses informations.
 * `onSave` enregistre et renvoie un message d'erreur à afficher, ou rien si tout s'est bien passé.
 */
export function PointForm({
  point,
  onSave,
}: {
  point?: AdminRallyingPoint;
  onSave: (input: RallyingPointInput) => Promise<string | null>;
}) {
  const [position, setPosition] = useState<Place | null>(
    point ? { lat: point.lat, lng: point.lng } : null,
  );
  const [centerPlace, setCenterPlace] = useState<RallyingPoint | null>(null);
  const [label, setLabel] = useState(point?.label ?? "");
  const [kind, setKind] = useState(point?.kind ?? "CarpoolArea");
  const [address, setAddress] = useState(point?.address ?? "");
  const [zipCode, setZipCode] = useState(point?.zip_code ?? "");
  const [city, setCity] = useState(point?.city ?? "");
  const [placeCount, setPlaceCount] = useState(
    point?.place_count?.toString() ?? "",
  );
  const [isActive, setIsActive] = useState(point?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const lianes = point?.lianes ?? [];
  const hasMoved =
    point !== undefined &&
    position !== null &&
    (position.lat !== point.lat || position.lng !== point.lng);
  const recomputeWarning = `Le tracé de ${quoted(lianes)} sera recalculé à l'enregistrement.`;

  const center = (place: RallyingPoint | null) => {
    setCenterPlace(place);
    if (place && !point) {
      setZipCode((current) => current || place.zip_code);
      setCity((current) => current || place.city);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const places = placeCount.trim() === "" ? null : Number(placeCount);
    if (!position) {
      setError("Touchez la carte pour placer le point.");
      return;
    }
    if (label.trim() === "") {
      setError("Donnez un libellé au point.");
      return;
    }
    if (places !== null && (!Number.isInteger(places) || places < 0)) {
      setError("Le nombre de places doit être un nombre positif ou nul.");
      return;
    }
    if (
      hasMoved &&
      lianes.length > 0 &&
      !window.confirm(`Ce point est déplacé. ${recomputeWarning} Continuer ?`)
    ) {
      return;
    }

    setSending(true);
    setError(null);
    const failure = await onSave({
      label: label.trim(),
      lat: position.lat,
      lng: position.lng,
      kind,
      address: address.trim(),
      zip_code: zipCode.trim(),
      city: city.trim(),
      place_count: places,
      is_active: isActive,
    });
    if (failure) {
      setError(failure);
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          {point ? "Modifier le point" : "Nouveau point"}
        </h2>
        {lianes.length > 0 && (
          <p className="text-sm text-gray-600">
            Arrêt de {lianeCountLabel(lianes.length)} : {quoted(lianes)}.
          </p>
        )}
        <PlaceField
          label="Centrer la carte sur une commune"
          placeholder="Nom de la commune"
          value={centerPlace}
          onChange={center}
        />
        <div className="h-80 overflow-hidden rounded-xl border border-gray-200 lg:h-96">
          <PointPicker
            position={position}
            center={centerPlace}
            onChange={setPosition}
          />
        </div>
        <p className="text-sm text-gray-600">
          {position
            ? `Position : ${coordinatesLabel(position)}. Touchez la carte ou déplacez le repère pour la changer.`
            : "Touchez la carte à l'endroit du point."}
        </p>
        {hasMoved && (
          <div className="flex flex-col gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>
              Le point a été déplacé.
              {lianes.length > 0 && ` ${recomputeWarning}`}
            </p>
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => setPosition({ lat: point.lat, lng: point.lng })}
            >
              Remettre à sa place
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Libellé
          <input
            className={fieldClass}
            value={label}
            maxLength={255}
            placeholder="Aire de covoiturage de la gare"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Type
          <select
            className={fieldClass}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {Object.entries(KIND_LABELS).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Adresse
          <input
            className={fieldClass}
            value={address}
            maxLength={500}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <div className="flex gap-3">
          <label className="w-32 text-sm font-medium">
            Code postal
            <input
              className={fieldClass}
              value={zipCode}
              maxLength={10}
              inputMode="numeric"
              onChange={(event) => setZipCode(event.target.value)}
            />
          </label>
          <label className="flex-1 text-sm font-medium">
            Commune
            <input
              className={fieldClass}
              value={city}
              maxLength={100}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>
        </div>
        <label className="text-sm font-medium">
          Nombre de places (facultatif)
          <input
            type="number"
            inputMode="numeric"
            className={fieldClass}
            value={placeCount}
            onChange={(event) => setPlaceCount(event.target.value)}
          />
        </label>
        {point && (
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Actif (proposé sur la carte et dans les recherches)
          </label>
        )}
      </Card>

      {error && <Notice>{error}</Notice>}
      <Button type="submit" disabled={sending}>
        {point ? "Enregistrer" : "Créer le point"}
      </Button>
    </form>
  );
}
