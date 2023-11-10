import { addSeconds, AppEnv } from "../../src";
import vt2geojson from "@mapbox/vt2geojson";
import { FeatureCollection } from "geojson";
import { CreateServices } from "./setup/services";
import { TestEnv } from "./setup/environment";
import { faker } from "@faker-js/faker";
import refGeojson from "./resources/mairie46185_mairie_46309.json";

const Services = CreateServices();

beforeAll(
  () =>
    new Promise<any>((done, fail) => {
      Services.signUpActor.runScenario(done, fail, faker.helpers.replaceSymbolWithNumber("06########"));
    }),
  5000
);

vi.setConfig({ testTimeout: 5_000 });

const readLianeTile = (
  z: number,
  x: number,
  y: number,
  sourceLayer: "rallying_point_display" | "liane_display",
  date?: Date
): Promise<FeatureCollection> =>
  new Promise((resolve, reject) => {
    const params = "?" + AppEnv.getLayerDateParams(date ?? new Date());
    vt2geojson(
      {
        uri: `${TestEnv.TILES_ULR}/liane_display/${z}/${x}/${y}${params}`,
        layer: sourceLayer
      },
      (err: any, result: FeatureCollection) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });

describe("Liane Service", () => {
  test("Should create new liane", async () => {
    const liane = await Services.liane.post({
      from: "mairie:46185",
      to: "mairie:46309",
      departureTime: addSeconds(new Date(), 3600 * 5).toISOString(),
      availableSeats: 2,
      geolocationLevel: "None",
      recurrence: "0000000"
    });
    expect(liane.wayPoints.length).toBe(2);

    // Check liane is displayed on the expected tile
    const geojson = await readLianeTile(10, 516, 368, "liane_display");
    expect(geojson.features[0].geometry).toEqual(refGeojson);
  });
});
