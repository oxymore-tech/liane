import { addSeconds } from "../../src";
import { CreateServices } from "./setup/services";
import { faker } from "@faker-js/faker";

const Services = CreateServices();

beforeAll(async () => {
  await Services.signUpActor.signUpUser(faker.helpers.replaceSymbolWithNumber("06########"));
}, 5000);

vi.setConfig({ testTimeout: 10_000 });

describe("Displaying trips", () => {
  test("Should create new liane", async () => {
    const liane = await Services.liane.post({
      liane: "019233a0-5c48-7cfa-b12e-7e7f0eb9c69f",
      from: "mairie:46185",
      to: "mairie:46309",
      arriveAt: addSeconds(new Date(), 3600 * 5).toISOString(),
      availableSeats: 2,
      geolocationLevel: "None"
    });
    expect(liane.wayPoints.length).toBe(2);

    // Check liane is displayed on the expected tile
    //const geojson = await readLianeTile(10, 516, 368, "liane_display");
    //expect(geojson.features[0].geometry).toEqual(refGeojson);
  });
});
