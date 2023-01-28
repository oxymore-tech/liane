import { LatLng, RallyingPoint } from "@/api";

export interface RallyingPointService {
  search(search: string, location: LatLng): Promise<RallyingPoint[]>;
}

export class RallyingPointMock implements RallyingPointService {
  readonly mockRP: RallyingPoint[] = [
    {
      label: "Toulouse",
      location: {
        lat: 1.35,
        lng: 43.6
      }
    },
    {
      label: "Muret",
      location: {
        lat: 1.28,
        lng: 43.44
      }
    },
    {
      label: "Luchon",
      location: {
        lat: 0.54,
        lng: 42.75
      }
    }
  ];

  async search(search: string, location: LatLng): Promise<RallyingPoint[]> {
    return this.mockRP.filter(rp => rp.label.startsWith(search));
  }
}
