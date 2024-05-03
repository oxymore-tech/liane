import { addSeconds } from "../../src";
import { CreateServices } from "./setup/services";
import { faker } from "@faker-js/faker";
import refGeojson from "./resources/mairie46185_mairie_46309.json";
import { readLianeTile } from "./utils/tiles";

const Services = CreateServices();

beforeAll(async () => {
  await Services.signUpActor.signUpUser(faker.helpers.replaceSymbolWithNumber("06########"));
}, 5000);

vi.setConfig({ testTimeout: 10_000 });

describe("Displaying trips", () => {
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
