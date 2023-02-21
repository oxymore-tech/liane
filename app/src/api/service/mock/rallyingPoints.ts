import { LatLng, LocationType, RallyingPoint } from "@/api";

export interface RallyingPointService {
  search(search: string, location: LatLng): Promise<RallyingPoint[]>;
}

export class RallyingPointMock implements RallyingPointService {
  readonly mockRP: RallyingPoint[] = [
    {
      id: "1",
      isActive: true,
      label: "Métro Ramonville",
      type: LocationType.CarpoolArea,
      address: "rue de X",
      zipCode: "31400",
      city: "Toulouse",
      location: {
        lng: 1.4229,
        lat: 43.5779
      }
    },
    {
      id: "2",
      isActive: true,
      label: "Leclerc",
      type: LocationType.Supermarket,
      address: "rue de Y",
      zipCode: "31100",
      city: "Toulouse",
      location: {
        lng: 1.3635,
        lat: 43.5678
      }
    },
    {
      id: "41",
      isActive: true,
      label: "Mairie de Muret",
      city: "Muret",
      address: "avenue de K",
      type: LocationType.TownHall,
      zipCode: "31600",
      location: {
        lng: 1.2637,
        lat: 43.4407
      }
    },
    {
      id: "81",
      isActive: true,
      label: "Arrêt Luchon",
      city: "Luchon",
      type: LocationType.AbandonedRoad,
      address: "chemin de T",
      zipCode: "31110",
      location: {
        lng: 0.5913,
        lat: 42.7492
      }
    }
  ];

  async search(search: string, location?: LatLng): Promise<RallyingPoint[]> {
    return search.length === 0
      ? this.mockRP
      : this.mockRP.filter(rp => (rp.label + rp.zipCode + rp.address + rp.city).toLowerCase().includes(search.toLowerCase()));
  }
}
