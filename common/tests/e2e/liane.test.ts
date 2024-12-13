import { CreateServices, UserContext } from "./setup/services";
import { faker } from "@faker-js/faker";

const users: UserContext[] = [];
const userCount = 2;
const pickup = "mairie:46185";
const destination = "mairie:46309";
beforeAll(async () => {
  for (let i = 0; i < userCount; i++) {
    const services = CreateServices();
    const id = await services.signUpActor.signUpUser(faker.helpers.replaceSymbolWithNumber("06########"));
    users.push({ services, id });
    await services.hub.start();
  }
}, 30_000);

afterAll(async () => {
  for (const user of users) await user.services.hub.stop();
});

vi.setConfig({ testTimeout: 10_000 });
describe.sequential("Liane as a community", () => {
  describe("User A", () => {
    test("Should create new liane request", async () => {
      const currentUser = users[0];
      await currentUser.services.community.create({
        name: "Boulot",
        wayPoints: [pickup, destination],
        roundTrip: false,
        canDrive: true,
        weekDays: "1100000",
        timeConstraints: [{ when: { start: { hour: 8 }, end: { hour: 9 } }, at: pickup }],
        isEnabled: true
      });
      const actual = await currentUser.services.community.match();
      expect(actual).toBeDefined();
    });
  });
});
