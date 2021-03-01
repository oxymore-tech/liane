export interface LatLng { lat: number, lng: number }

export interface RallyingPoint { id: string, position: LatLng }

export interface Trip {coordinates: RallyingPoint[]}

export interface Route {
    readonly coordinates: LatLng[];
    readonly duration: number;
    readonly distance: number;
    readonly delta?: number;
  }

export interface RouteStat{coordinates: LatLng[], stat: number};