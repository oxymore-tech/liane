import { CreateServices, UserContext } from "./setup/services";
import { faker } from "@faker-js/faker";
import { addSeconds, LatLng, Liane, sleep, TrackingInfo } from "../../src";
import fc from "fast-check";

const users: UserContext[] = [];
const userCount = 2;
let trip: Liane | undefined;
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
describe.sequential("Joining a trip", () => {
  describe("User B", () => {
    test("Should create a liane and post a new trip", async () => {
      const currentUser = users[0];

      const lianeRequest = await currentUser.services.community.create({
        wayPoints: [pickup, destination],
        arriveBefore: { hour: 9 },
        returnAfter: { hour: 18 },
        canDrive: true,
        weekDays: "1110000",
        isEnabled: true,
        roundTrip: false,
        name: "Test trip from A"
      });

      const secondUser = users[1];
      const secondLianeRequest = await secondUser.services.community.create({
        wayPoints: [pickup, destination],
        arriveBefore: { hour: 9 },
        returnAfter: { hour: 18 },
        canDrive: true,
        weekDays: "1110000",
        isEnabled: true,
        roundTrip: false,
        name: "Test trip from B"
      });
      await currentUser.services.community.joinRequest(lianeRequest.id!, secondLianeRequest.id!);
      const coLiane = await secondUser.services.community.accept(lianeRequest.id!, secondLianeRequest.id!);

      const posted = await secondUser.services.liane.post({
        liane: coLiane.id!,
        from: pickup,
        to: destination,
        departureTime: addSeconds(new Date(), 1800).toISOString(),
        returnTime: addSeconds(new Date(), 3600 * 5).toISOString(),
        availableSeats: 2,
        geolocationLevel: "None"
      });
      const tripList = await secondUser.services.liane.list(["NotStarted", "Started"], { asc: true, cursor: undefined, limit: 20 });
      expect(tripList.data.length).toBe(2);
      expect(tripList.data[0]).toEqual(posted);
      trip = posted;
    });
  });
  describe.concurrent("Member added", () => {
    test("User A join the trip", async () => {
      const currentUser = users[0];
      await currentUser.services.community.joinTrip({
        liane: trip!.liane!,
        trip: trip!.id!,
        takeReturnTrip: false
      });
    });
  });
  describe("User B", () => {
    test("Should have a passenger", async () => {
      const currentUser = users[1];
      const tripList = await currentUser.services.liane.list(["NotStarted", "Started"], { asc: true, cursor: undefined, limit: 20 });
      expect(tripList.data.length).toBe(2);
      const foundTrip = tripList.data.find(l => l.id! === trip!.id!);
      expect(foundTrip).not.undefined;
      expect(foundTrip!.members.length).toBe(2);
    });
  });
  describe("User 1", () => {
    test("Should be member of the trip", async () => {
      const currentUser = users[0];
      const tripList = await currentUser.services.liane.list(["NotStarted", "Started"], { asc: true, cursor: undefined, limit: 20 });
      expect(tripList.data.length).toBe(1);
      expect(tripList.data[0].members.length).toBe(2);
    });
  });

  describe("Both users", () => {
    test("Should start the trip", async () => {
      for (const currentUser of users) {
        await currentUser.services.liane.start(trip!.id!);
      }
    });

    test("Should use geolocation", async () => {
      await fc.assert(
        fc.asyncProperty(fc.scheduler(), async s => {
          const pingsMap = new Map<string, TrackingInfo[]>();
          const subscriptions = [];
          const receivePing = vi.fn((subscriberId: string, trackedMemberLocation: TrackingInfo) => {
            const value = pingsMap.get(subscriberId) ?? [];
            pingsMap.set(subscriberId, [...value, trackedMemberLocation]);
          });
          const driver = users[0];
          const passenger = users[1];
          const driverCoords: LatLng[] = [
            { lat: 44.9358973, lng: 1.5635225 },
            { lat: 44.9458973, lng: 1.5735225 },
            { lat: 44.9558973, lng: 1.5835225 }
          ];
          const passengerCoords: LatLng[] = [
            { lat: 44.8358973, lng: 1.5635225 },
            { lat: 44.8458973, lng: 1.5735225 },
            { lat: 44.8558973, lng: 1.5835225 }
          ];
          for (const subscriber of users) {
            const sub = await subscriber.services.hub.subscribeToTrackingInfo(trip!.id!, trackedMemberLocation => {
              receivePing(subscriber.id, trackedMemberLocation);
            });
            subscriptions.push(sub);
          }

          s.scheduleSequence(
            driverCoords.map(coordinate => {
              return () =>
                sleep(50).then(() =>
                  driver.services.event.sendPing({
                    liane: trip!.id!,
                    timestamp: new Date().getTime(),
                    coordinate,
                    type: "MemberPing"
                  })
                );
            })
          );
          s.scheduleSequence(
            passengerCoords.map(coordinate => {
              return () =>
                sleep(50).then(() =>
                  passenger.services.event.sendPing({
                    liane: trip!.id!,
                    timestamp: new Date().getTime(),
                    coordinate,
                    type: "MemberPing"
                  })
                );
            })
          );
          await s.waitAll();
          await sleep(200);

          // For each user, we expect to receive an update for each ping + one initial update
          expect(receivePing).toHaveBeenCalledTimes((driverCoords.length + passengerCoords.length + 1) * users.length);
          for (const sub of subscriptions) {
            await sub.unsubscribe();
          }
        }),
        { numRuns: 10 }
      );
    }, 30_000);
  });
});
