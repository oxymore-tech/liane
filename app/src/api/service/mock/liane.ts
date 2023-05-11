import { Liane, LianeMatch, LianeRequest, LianeSearchFilter, LocationType, PaginatedResponse } from "@/api";
import { LianeService } from "@/api/service/liane";

export class LianeServiceMock implements LianeService {
  async list() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { data: MockLianes, pageSize: MockLianes.length };
  }

  private fail = false;
  async post(liane: LianeRequest) {
    console.log("FAKE POST", this.fail, liane);
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.fail = !this.fail;
    if (this.fail) {
      throw new Error();
    }
    return MockLianes[0];
  }

  async match(_: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      pageSize: 1,
      data: LianeMatches
    };
  }
}

const MockLianes: Liane[] = [
  {
    conversation: "11",
    departureTime: "2023-01-05T10:05:00Z",
    wayPoints: [
      {
        rallyingPoint: {
          isActive: true,
          label: "Toulouse",
          city: "Toulouse",
          type: LocationType.CarpoolArea,
          address: "rue de X",
          zipCode: "31400",
          location: {
            lat: 1.35,
            lng: 43.6
          }
        },
        duration: 0,
        order: 0
      },

      {
        rallyingPoint: {
          isActive: true,
          label: "Muret",
          city: "Muret",
          address: "avenue de K",
          type: LocationType.TownHall,
          zipCode: "31600",
          location: {
            lat: 1.28,
            lng: 43.44
          }
        },
        duration: 1860,
        order: 1
      },
      {
        rallyingPoint: {
          isActive: true,
          label: "Luchon",
          city: "Luchon",
          type: LocationType.AbandonedRoad,
          address: "chemin de T",
          zipCode: "31110",
          location: {
            lat: 0.54,
            lng: 42.75
          }
        },
        duration: 6000,
        order: 2
      }
    ],
    members: []
  },
  {
    conversation: "22",
    departureTime: "2023-01-06T15:05:00Z",
    wayPoints: [
      {
        rallyingPoint: {
          isActive: true,
          label: "Toulouse",
          city: "Toulouse",
          type: LocationType.CarpoolArea,
          address: "rue de X",
          zipCode: "31400",
          location: {
            lat: 1.35,
            lng: 43.6
          }
        },
        duration: 0,
        order: 3
      },
      {
        rallyingPoint: {
          isActive: true,
          label: "Muret",
          city: "Muret",
          address: "avenue de K",
          type: LocationType.TownHall,
          zipCode: "31600",
          location: {
            lat: 1.28,
            lng: 43.44
          }
        },
        duration: 1860,
        order: 4
      },
      {
        rallyingPoint: {
          isActive: true,
          label: "Luchon",
          city: "Luchon",
          type: LocationType.AbandonedRoad,
          address: "chemin de T",
          zipCode: "31110",
          location: {
            lat: 0.54,
            lng: 42.75
          }
        },
        duration: 6000,
        order: 5
      }
    ],
    members: []
  },
  {
    conversation: "33",
    departureTime: "2023-01-06T10:05:00Z",
    wayPoints: [
      {
        rallyingPoint: {
          isActive: true,
          label: "Toulouse",
          city: "Toulouse",
          type: LocationType.CarpoolArea,
          address: "rue de X",
          zipCode: "31400",
          location: {
            lat: 1.35,
            lng: 43.6
          }
        },
        duration: 0,
        order: 0
      },
      {
        rallyingPoint: {
          isActive: true,
          label: "Luchon",
          city: "Luchon",
          type: LocationType.AbandonedRoad,
          address: "chemin de T",
          zipCode: "31110",
          location: {
            lat: 0.54,
            lng: 42.75
          }
        },
        duration: 7800,
        order: 1
      }
    ],
    members: []
  }
];

const LianeMatches: LianeMatch[] = [
  {
    liane: "63f402fb5a62152114683382",
    departureTime: "2023-02-24T23:48:09.345Z",
    returnTime: "2023-02-25T01:45:58.579Z",
    wayPoints: [
      {
        rallyingPoint: {
          id: "mairie:46284",
          label: "Mairie de Saint-Michel-Loubéjou",
          location: { lat: 44.8946723938, lng: 1.85013198853 },
          type: LocationType.TownHall,
          address: "Le Bourg",
          zipCode: "46130",
          city: "Saint-Michel-Loubéjou",
          isActive: true
        },
        order: 0,
        duration: 0
      },
      {
        rallyingPoint: {
          id: "mairie:46029",
          label: "Mairie de Biars-sur-Cère",
          location: { lat: 44.9244995117, lng: 1.84375 },
          type: LocationType.TownHall,
          address: "32 avenue de la République",
          zipCode: "46130",
          city: "Biars-sur-Cère",
          isActive: true
        },
        order: 1,
        duration: 444
      },
      {
        rallyingPoint: {
          id: "mairie:46234",
          label: "Mairie de Rampoux",
          location: { lat: 44.6415939331, lng: 1.3109099865 },
          type: LocationType.TownHall,
          address: "Le bourg",
          zipCode: "46340",
          city: "RAMPOUX",
          isActive: true
        },
        order: 2,
        duration: 4884
      },
      {
        rallyingPoint: {
          id: "mairie:46164",
          label: "Mairie de Lavercantière",
          location: { lat: 44.637437, lng: 1.317838 },
          type: LocationType.TownHall,
          address: "1 place de la Paix",
          zipCode: "46340",
          city: "Lavercantière",
          isActive: true
        },
        order: 3,
        duration: 110
      }
    ],
    originalTrip: [
      {
        rallyingPoint: {
          id: "mairie:46284",
          label: "Mairie de Saint-Michel-Loubéjou",
          location: { lat: 44.8946723938, lng: 1.85013198853 },
          type: LocationType.TownHall,
          address: "Le Bourg",
          zipCode: "46130",
          city: "Saint-Michel-Loubéjou",
          isActive: true
        },
        order: 0,
        duration: 0
      },
      {
        rallyingPoint: {
          id: "mairie:46164",
          label: "Mairie de Lavercantière",
          location: { lat: 44.637437, lng: 1.317838 },
          type: LocationType.TownHall,
          address: "1 place de la Paix",
          zipCode: "46340",
          city: "Lavercantière",
          isActive: true
        },
        order: 1,
        duration: 4654
      }
    ],
    freeSeatsCount: 1,
    driver: "63f402f95a6215211468337d",
    match: { type: "Compatible", deltaInSeconds: 500 }
  }
];
