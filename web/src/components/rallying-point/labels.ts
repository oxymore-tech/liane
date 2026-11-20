import { BadRequest, Conflict } from "@/api/exception";
import type { AdminRallyingPoint } from "@/api/types";

export const KIND_LABELS: Record<string, string> = {
  CarpoolArea: "Aire de covoiturage",
  Parking: "Parking",
  RelayParking: "Parking relais",
  Supermarket: "Supermarché",
  TownHall: "Mairie",
  HighwayExit: "Sortie d'autoroute",
  AbandonedRoad: "Délaissé routier",
  AutoStop: "Auto-stop",
};

export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind;

export const originLabel = (point: AdminRallyingPoint) =>
  point.source === null
    ? "Créé à la main"
    : point.edited_at
      ? "Modifié à la main"
      : null;

export const lianeCountLabel = (count: number) =>
  count === 1 ? "1 liane" : `${count} lianes`;

export const quoted = (names: string[]) =>
  names.map((name) => `« ${name} »`).join(", ");

const REFUSALS: Record<string, string> = {
  InvalidLabel: "Donnez un libellé au point (255 caractères au plus).",
  InvalidPosition: "La position du point n'est pas valide.",
  InvalidKind: "Choisissez un type dans la liste.",
  InvalidAddress: "L'adresse est trop longue (500 caractères au plus).",
  InvalidZipCode: "Le code postal est trop long (10 caractères au plus).",
  InvalidCity: "Le nom de la commune est trop long (100 caractères au plus).",
  InvalidPlaceCount: "Le nombre de places doit être un nombre positif ou nul.",
};

const STOP_OF_LIANES = "StopOfLianes: ";

/** Le message à afficher quand l'API refuse d'enregistrer un point. */
export const saveErrorMessage = (err: unknown) => {
  if (err instanceof Conflict && err.message.startsWith(STOP_OF_LIANES)) {
    const names = err.message.slice(STOP_OF_LIANES.length).split(", ");
    return `Ce point ne peut pas être désactivé : c'est un arrêt de ${quoted(names)}. Retirez-le d'abord de ${names.length === 1 ? "cette liane" : "ces lianes"}.`;
  }
  if (err instanceof BadRequest && REFUSALS[err.message]) {
    return REFUSALS[err.message];
  }
  return "Le point n'a pas été enregistré. Réessayez dans un instant.";
};
