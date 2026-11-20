"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useId, useState } from "react";
import type {
  AdminRallyingPoint,
  RallyingPoint,
  RallyingPointInput,
  RallyingPointKind,
} from "@/api/types";
import { ConfirmDialog } from "@/components/dialog";
import { PlaceField } from "@/components/place-field";
import { SelectField } from "@/components/select-field";
import {
  Button,
  Card,
  checkboxClass,
  FieldError,
  fieldClass,
  labelClass,
  Notice,
} from "@/components/ui";
import { isKind, KIND_LABELS, lianeCountLabel, quoted } from "./labels";

const PointPicker = dynamic(() => import("@/components/map/point-picker"), {
  ssr: false,
});

type Place = { lat: number; lng: number };

/** `field` désigne le champ fautif ; sans lui, l'erreur concerne tout le formulaire. */
type FormError = {
  field?: "position" | "label" | "placeCount";
  message: string;
};

const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, name]) => ({
  value,
  content: name,
}));

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
  const [kind, setKind] = useState<RallyingPointKind>(
    point?.kind ?? "CarpoolArea",
  );
  const [address, setAddress] = useState(point?.address ?? "");
  const [zipCode, setZipCode] = useState(point?.zip_code ?? "");
  const [city, setCity] = useState(point?.city ?? "");
  const [placeCount, setPlaceCount] = useState(
    point?.place_count?.toString() ?? "",
  );
  const [isActive, setIsActive] = useState(point?.is_active ?? true);
  const [error, setError] = useState<FormError | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmingMove, setConfirmingMove] = useState(false);
  const errorId = useId();
  const errorOf = (field: FormError["field"]) =>
    error && error.field === field ? error.message : null;

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

  const places = placeCount.trim() === "" ? null : Number(placeCount);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!position) {
      setError({
        field: "position",
        message: "Touchez la carte pour placer le point.",
      });
      return;
    }
    if (label.trim() === "") {
      setError({ field: "label", message: "Donnez un libellé au point." });
      return;
    }
    if (places !== null && (!Number.isInteger(places) || places < 0)) {
      setError({
        field: "placeCount",
        message: "Le nombre de places doit être un nombre positif ou nul.",
      });
      return;
    }
    if (hasMoved && lianes.length > 0) {
      setConfirmingMove(true);
      return;
    }
    save();
  };

  const save = async () => {
    if (!position) return;
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
    setConfirmingMove(false);
    if (failure) {
      setError({ message: failure });
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
          <p className="text-sm text-gris">
            Arrêt de {lianeCountLabel(lianes.length)} : {quoted(lianes)}.
          </p>
        )}
        <PlaceField
          label="Centrer la carte sur une commune"
          placeholder="Nom de la commune"
          value={centerPlace}
          onChange={center}
        />
        <div className="h-80 overflow-hidden rounded-card border border-bordure lg:h-96">
          <PointPicker
            position={position}
            center={centerPlace}
            onChange={setPosition}
          />
        </div>
        <p className="text-sm text-gris">
          {position
            ? `Position : ${coordinatesLabel(position)}. Touchez la carte ou déplacez le repère pour la changer.`
            : "Touchez la carte à l'endroit du point."}
        </p>
        {errorOf("position") && (
          <FieldError id={`${errorId}-position`}>
            {errorOf("position")}
          </FieldError>
        )}
        {hasMoved && (
          <div className="flex flex-col gap-2 rounded-lg bg-jaune-pale px-3 py-2 text-sm text-encre">
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
        <div>
          <label className={labelClass}>
            Libellé
            <input
              className={fieldClass}
              value={label}
              maxLength={255}
              placeholder="Aire de covoiturage de la gare"
              onChange={(event) => setLabel(event.target.value)}
              aria-invalid={errorOf("label") ? true : undefined}
              aria-describedby={
                errorOf("label") ? `${errorId}-label` : undefined
              }
            />
          </label>
          {errorOf("label") && (
            <FieldError id={`${errorId}-label`}>{errorOf("label")}</FieldError>
          )}
        </div>
        <SelectField
          label="Type"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(value) => {
            if (isKind(value)) setKind(value);
          }}
        />
        <label className={labelClass}>
          Adresse
          <input
            className={fieldClass}
            value={address}
            maxLength={500}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <div className="flex gap-3">
          <label className={`${labelClass} w-32`}>
            Code postal
            <input
              className={fieldClass}
              value={zipCode}
              maxLength={10}
              inputMode="numeric"
              onChange={(event) => setZipCode(event.target.value)}
            />
          </label>
          <label className={`${labelClass} flex-1`}>
            Commune
            <input
              className={fieldClass}
              value={city}
              maxLength={100}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>
        </div>
        <div>
          <label className={labelClass}>
            Nombre de places (facultatif)
            <input
              type="number"
              inputMode="numeric"
              className={fieldClass}
              value={placeCount}
              onChange={(event) => setPlaceCount(event.target.value)}
              aria-invalid={errorOf("placeCount") ? true : undefined}
              aria-describedby={
                errorOf("placeCount") ? `${errorId}-places` : undefined
              }
            />
          </label>
          {errorOf("placeCount") && (
            <FieldError id={`${errorId}-places`}>
              {errorOf("placeCount")}
            </FieldError>
          )}
        </div>
        {point && (
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Actif (proposé sur la carte et dans les recherches)
          </label>
        )}
      </Card>

      {error && !error.field && <Notice>{error.message}</Notice>}
      <Button type="submit" loading={sending}>
        {point ? "Enregistrer" : "Créer le point"}
      </Button>
      <ConfirmDialog
        open={confirmingMove}
        onClose={() => setConfirmingMove(false)}
        onConfirm={save}
        title="Ce point est déplacé"
        confirmLabel="Enregistrer le déplacement"
      >
        <p>{recomputeWarning}</p>
      </ConfirmDialog>
    </form>
  );
}
