import { getTripMatch } from "@/components/trip/trip";

const testData = {
  to: {
    id: "mairie:46185",
    label: "Mairie de Martel",
    location: { lat: 44.9367980957, lng: 1.6085100174 },
    type: "TownHall",
    address: "Place des Consuls",
    zipCode: "46600",
    city: "Martel",
    placeCount: null,
    isActive: true
  },
  from: {
    id: "mairie:46084",
    label: "Mairie de Creysse",
    location: { lat: 44.88595, lng: 1.596213 },
    type: "TownHall",
    address: "Le Bourg",
    zipCode: "46600",
    city: "Creysse",
    placeCount: null,
    isActive: true
  },
  departureTime: "2023-03-15T13:12:00Z",
  originalTrip: [
    {
      rallyingPoint: {
        id: "mairie:46084",
        label: "Mairie de Creysse",
        location: { lat: 44.88595, lng: 1.596213 },
        type: "TownHall",
        address: "Le Bourg",
        zipCode: "46600",
        city: "Creysse",
        placeCount: null,
        isActive: true
      },
      order: 0,
      duration: 0,
      distance: 0
    },
    {
      rallyingPoint: {
        id: "mairie:46016",
        label: "Mairie de Baladou",
        location: { lat: 44.9219856262, lng: 1.55573999882 },
        type: "TownHall",
        address: "Le Bourg",
        zipCode: "46600",
        city: "Baladou",
        placeCount: null,
        isActive: true
      },
      order: 1,
      duration: 469,
      distance: 7664
    }
  ],
  newTrip: [
    {
      rallyingPoint: {
        id: "mairie:46084",
        label: "Mairie de Creysse",
        location: { lat: 44.88595, lng: 1.596213 },
        type: "TownHall",
        address: "Le Bourg",
        zipCode: "46600",
        city: "Creysse",
        placeCount: null,
        isActive: true
      },
      order: 1,
      duration: 0,
      distance: 0
    },
    {
      rallyingPoint: {
        id: "mairie:46185",
        label: "Mairie de Martel",
        location: { lat: 44.9367980957, lng: 1.6085100174 },
        type: "TownHall",
        address: "Place des Consuls",
        zipCode: "46600",
        city: "Martel",
        placeCount: null,
        isActive: true
      },
      order: 0,
      duration: 509,
      distance: 6907
    },
    {
      rallyingPoint: {
        id: "mairie:46016",
        label: "Mairie de Baladou",
        location: { lat: 44.9219856262, lng: 1.55573999882 },
        type: "TownHall",
        address: "Le Bourg",
        zipCode: "46600",
        city: "Baladou",
        placeCount: null,
        isActive: true
      },
      order: 1,
      duration: 120,
      distance: 596
    }
  ]
};

describe("trip", () => {
  test("compute match trip", () => {
    const result = getTripMatch(testData.to, testData.from, testData.originalTrip, testData.departureTime, testData.newTrip);
    expect(result.wayPoints.length).toEqual(3);
    expect(result.departureIndex).toEqual(0);
    expect(result.arrivalIndex).toEqual(result.wayPoints.length - 2);
  });
});
