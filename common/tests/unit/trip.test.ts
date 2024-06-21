import { getTotalDistance, getTotalDuration, getTripCostContribution, getUserTrip, Liane, UserTrip } from "../../src";

describe("trip", () => {
  test("should get user trip for augustin (the driver)", () => {
    const userTrip = getUserTrip(blajoux_mende, "63f73936d3436d499d1075f6");
    expect(userTrip).toEqual(AugustinTrip);
    const totalDuration = getTotalDuration(userTrip.wayPoints);
    expect(totalDuration).toEqual(2323); // 38 min
    const totalDistance = getTotalDistance(userTrip.wayPoints);
    expect(totalDistance).toEqual(35900);
  });

  test("should get user trip for brutus", () => {
    const userTrip = getUserTrip(blajoux_mende, "654e2de81435035edcef9b7f");
    expect(userTrip).toEqual(BrutusTrip);
    const totalDuration = getTotalDuration(userTrip.wayPoints);
    expect(totalDuration).toEqual(1479); // 25 min
    const totalDistance = getTotalDistance(userTrip.wayPoints);
    expect(totalDistance).toEqual(25120);
  });

  test("should compute cost contribution", () => {
    const costContribution = getTripCostContribution(blajoux_mende);
    expect(costContribution).toEqual({
      cost: 9,
      total: 4,
      byMembers: {
        "63f73936d3436d499d1075f6": 5,
        "654e2de81435035edcef9b7f": 4
      }
    });
  });
});

const blajoux_mende: Liane = {
  id: "6675355f30087c234678a97c",
  createdBy: "63f73936d3436d499d1075f6",
  createdAt: "2024-06-21T08:10:07.027Z",
  departureTime: "2024-06-24T08:04:12.562Z",
  wayPoints: [
    {
      rallyingPoint: {
        id: "48:blajoux_01",
        label: "Blajoux Hotel Saint-Pierre",
        location: {
          lat: 44.33713324214392,
          lng: 3.483362330168376
        },
        type: "Parking",
        address: "lieu-dit Blajoux",
        zipCode: "48320",
        city: "Blajoux",
        placeCount: 10,
        isActive: true
      },
      duration: 0,
      distance: 0,
      eta: "2024-06-24T08:04:12.562Z"
    },
    {
      rallyingPoint: {
        id: "48:quezac_parking",
        label: "Usine de Quézac",
        location: {
          lat: 44.376964161791335,
          lng: 3.5232480370979147
        },
        type: "Parking",
        address: "Chem. des Cayres",
        zipCode: "48320",
        city: "Ispagnac",
        placeCount: 40,
        isActive: true
      },
      duration: 538,
      distance: 7763,
      eta: "2024-06-24T08:13:10.562Z"
    },
    {
      rallyingPoint: {
        id: "48:mende_01",
        label: "Parking Lamole",
        location: {
          lat: 44.517770652788954,
          lng: 3.4932879665586256
        },
        type: "Parking",
        address: "27 Av. du Marechal Foch",
        zipCode: "48000",
        city: "Mende",
        placeCount: 70,
        isActive: true
      },
      duration: 1479,
      distance: 25120,
      eta: "2024-06-24T08:37:49.562Z"
    },
    {
      rallyingPoint: {
        id: "48:mende_02",
        label: "POLEN",
        location: {
          lat: 44.5282153970999,
          lng: 3.4669995466528576
        },
        type: "Parking",
        address: "Rue Albert Einstein",
        zipCode: "48000",
        city: "Mende",
        placeCount: 10,
        isActive: true
      },
      duration: 306,
      distance: 3017,
      eta: "2024-06-24T08:42:55.562Z"
    }
  ],
  members: [
    {
      user: {
        id: "63f73936d3436d499d1075f6",
        createdAt: "2023-02-23T10:00:22.962Z",
        pseudo: "Augustin  G.",
        gender: "Unspecified",
        pictureUrl: "https://imagedelivery.net/boxAzHNMt6Z2TVNFAJ2vsQ/user_63f73936d3436d499d1075f6/avatar?rnd=1701609549033",
        stats: {
          totalTrips: 0,
          totalAvoidedEmissions: 0,
          totalCreatedTrips: 132,
          totalJoinedTrips: 39
        }
      },
      from: "48:blajoux_01",
      to: "48:mende_02",
      seatCount: 1,
      geolocationLevel: "Shared",
      departure: null,
      cancellation: null
    },
    {
      user: {
        id: "654e2de81435035edcef9b7f",
        createdAt: "2023-11-10T13:19:36.426Z",
        pseudo: "Brutus S.",
        gender: "Unspecified",
        pictureUrl: "https://imagedelivery.net/boxAzHNMt6Z2TVNFAJ2vsQ/user_654e2de81435035edcef9b7f/avatar?rnd=1701018659688",
        stats: {
          totalTrips: 0,
          totalAvoidedEmissions: 0,
          totalCreatedTrips: 105,
          totalJoinedTrips: 52
        }
      },
      from: "48:quezac_parking",
      to: "48:mende_01",
      seatCount: -1,
      geolocationLevel: "Shared",
      departure: null,
      cancellation: null
    }
  ],
  driver: {
    user: "63f73936d3436d499d1075f6",
    canDrive: true
  },
  state: "NotStarted",
  conversation: "6675357930087c234678a97e"
};

const AugustinTrip: UserTrip = {
  departureTime: "2024-06-24T08:04:12.562Z",
  wayPoints: [
    {
      distance: 0,
      duration: 0,
      eta: "2024-06-24T08:04:12.562Z",
      rallyingPoint: {
        address: "lieu-dit Blajoux",
        city: "Blajoux",
        id: "48:blajoux_01",
        isActive: true,
        label: "Blajoux Hotel Saint-Pierre",
        location: {
          lat: 44.33713324214392,
          lng: 3.483362330168376
        },
        placeCount: 10,
        type: "Parking",
        zipCode: "48320"
      }
    },
    {
      distance: 7763,
      duration: 538,
      eta: "2024-06-24T08:13:10.562Z",
      rallyingPoint: {
        address: "Chem. des Cayres",
        city: "Ispagnac",
        id: "48:quezac_parking",
        isActive: true,
        label: "Usine de Quézac",
        location: {
          lat: 44.376964161791335,
          lng: 3.5232480370979147
        },
        placeCount: 40,
        type: "Parking",
        zipCode: "48320"
      }
    },
    {
      distance: 25120,
      duration: 1479,
      eta: "2024-06-24T08:37:49.562Z",
      rallyingPoint: {
        address: "27 Av. du Marechal Foch",
        city: "Mende",
        id: "48:mende_01",
        isActive: true,
        label: "Parking Lamole",
        location: {
          lat: 44.517770652788954,
          lng: 3.4932879665586256
        },
        placeCount: 70,
        type: "Parking",
        zipCode: "48000"
      }
    },
    {
      distance: 3017,
      duration: 306,
      eta: "2024-06-24T08:42:55.562Z",
      rallyingPoint: {
        address: "Rue Albert Einstein",
        city: "Mende",
        id: "48:mende_02",
        isActive: true,
        label: "POLEN",
        location: {
          lat: 44.5282153970999,
          lng: 3.4669995466528576
        },
        placeCount: 10,
        type: "Parking",
        zipCode: "48000"
      }
    }
  ]
};

const BrutusTrip: UserTrip = {
  departureTime: "2024-06-24T08:13:10.562Z",
  wayPoints: [
    {
      distance: 0,
      duration: 0,
      eta: "2024-06-24T08:13:10.562Z",
      rallyingPoint: {
        address: "Chem. des Cayres",
        city: "Ispagnac",
        id: "48:quezac_parking",
        isActive: true,
        label: "Usine de Quézac",
        location: {
          lat: 44.376964161791335,
          lng: 3.5232480370979147
        },
        placeCount: 40,
        type: "Parking",
        zipCode: "48320"
      }
    },
    {
      distance: 25120,
      duration: 1479,
      eta: "2024-06-24T08:37:49.562Z",
      rallyingPoint: {
        address: "27 Av. du Marechal Foch",
        city: "Mende",
        id: "48:mende_01",
        isActive: true,
        label: "Parking Lamole",
        location: {
          lat: 44.517770652788954,
          lng: 3.4932879665586256
        },
        placeCount: 70,
        type: "Parking",
        zipCode: "48000"
      }
    }
  ]
};
