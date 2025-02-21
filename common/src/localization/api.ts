import { LocationType, UserInfo } from "../api";

export const RallyingPointPropertiesLabels: { [key: string]: string } = {
  label: "Label",
  address: "Adresse",
  city: "Commune",
  zipCode: "Code postal",
  type: "Type",
  placeCount: "Nombre de places",
  location: "Localisation",
  "location.lat": "Latitude",
  "location.lng": "Longitude",
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
  Parking: "Parking",
  RoadSide: "Bord de route",
  TrainStation: "Gare"
};

export const UserInfoPropertiesLabels: { [k in keyof UserInfo]: string } = {
  gender: "Genre",
  firstName: "Prénom",
  lastName: "Nom"
};
