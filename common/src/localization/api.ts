import { LocationType, RallyingPoint, UserInfo } from "../api";

export const RallyingPointPropertiesLabels: { [k in keyof RallyingPoint]: string } = {
  label: "Label",
  address: "Adresse",
  city: "Commune",
  zipCode: "Code postal",
  type: "Type",
  placeCount: "Nombre de places",
  location: "Localisation",
  isActive: "Actif",
  id: "ID"
};
export const RallyingPointLocationLabels: { [k in LocationType]: string } = {
  AbandonedRoad: "Route abandonnée",
  AutoStop: "Auto-stop",
  HighwayExit: "Sortie d'autoroute",
  RelayParking: "Parking relai",
  Supermarket: "Supermarché",
  TownHall: "Mairie",
  CarpoolArea: "Aire de covoiturage",
  Parking: "Parking"
};

export const UserInfoPropertiesLabels: { [k in keyof UserInfo]: string } = {
  gender: "Genre",
  firstName: "Prénom",
  lastName: "Nom"
};
