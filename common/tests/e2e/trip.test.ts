import { CreateServices, UserContext } from "./setup/services";
import { faker } from "@faker-js/faker";
import { addSeconds, Answer, LatLng, sleep, TrackingInfo, UnionUtils } from "../../src";
import { readLianeFilteredTile, readLianeTile } from "./utils/tiles";
import fc from "fast-check";

const users: UserContext[] = [];
const userCount = 2;
let tripId: string | undefined;
let requestId: string | undefined;
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
  describe("User A", () => {
    test("Should create new trip", async () => {
      const currentUser = users[0];
      const posted = await currentUser.services.liane.post({
        from: pickup,
        to: destination,
        departureTime: addSeconds(new Date(), 1800).toISOString(),
        returnTime: addSeconds(new Date(), 3600 * 5).toISOString(),
        availableSeats: 2,
        geolocationLevel: "None",
        recurrence: "0000000"
      });
      const tripList = await currentUser.services.liane.list(["NotStarted", "Started"], { asc: true, cursor: undefined, limit: 20 });
      expect(tripList.data.length).toBe(2);
      expect(tripList.data[0]).toEqual(posted);
      tripId = posted.id!;
    });
  });
  describe("User B", () => {
    test("Should find created trip", async () => {
      const currentUser = users[1];
      let points = await readLianeTile(10, 516, 368, "rallying_point_display");
      const arrivalOptions = points.features.map(f => f.properties.id);
      expect(arrivalOptions).toContain(destination);
      points = await readLianeFilteredTile(10, 516, 368, "rallying_point_display", destination, "deposit");
      const departureOptions = points.features.map(f => f.properties.id);
      expect(departureOptions).toContain(pickup);

      const results = await currentUser.services.liane.match({
        from: pickup,
        to: destination,
        targetTime: { dateTime: new Date().toISOString(), direction: "Departure" },
        availableSeats: -1
      });

      const matchedTripsIds = results.lianeMatches.map(m => m.trip.id!);
      expect(matchedTripsIds).toContain(tripId!);
    });
  });
  describe.concurrent("Request", () => {
    test("Should be sent by B", async () => {
      const currentUser = users[1];
      await currentUser.services.liane.join({
        liane: tripId!,
        from: pickup,
        to: destination,
        seats: -1,
        type: "JoinRequest",
        geolocationLevel: "None",
        message: "Lorem ipsum",
        takeReturnTrip: false
      });

      const requestList = await currentUser.services.liane.listJoinRequests();
      expect(requestList.data.length).toBe(1);
      requestId = requestList.data[0].id!;
    });
    test("Should be received by A", () =>
      new Promise<void>(done => {
        const currentUser = users[0];
        currentUser.services.hub.subscribeToNotifications(n => {
          if (UnionUtils.isInstanceOf(n, "Event") && UnionUtils.isInstanceOf(n.payload, "JoinRequest")) {
            expect(n.payload.liane).toEqual(tripId!);
            done();
          }
        });
      }));
  });
  describe.concurrent("Answer", () => {
    test("Should be sent by A", async () => {
      const currentUser = users[0];
      await currentUser.services.hub.postAnswer(requestId!, Answer.Accept);
    });
    test("Should be received by B", () =>
      new Promise<void>(done => {
        const currentUser = users[1];
        currentUser.services.hub.subscribeToNotifications(n => {
          if (UnionUtils.isInstanceOf(n, "Event") && UnionUtils.isInstanceOf(n.payload, "MemberAccepted")) {
            expect(n.payload.liane).toEqual(tripId!);
            done();
          }
        });
      }));
  });
  describe("User A", () => {
    test("Should have a passenger", async () => {
      const currentUser = users[0];
      const tripList = await currentUser.services.liane.list(["NotStarted", "Started"], { asc: true, cursor: undefined, limit: 20 });
      expect(tripList.data.length).toBe(2);
      const trip = tripList.data.find(l => l.id! === tripId!);
      expect(trip).not.undefined;
      expect(trip!.members.length).toBe(2);
    });
  });
  describe("User B", () => {
    test("Should be member of the trip", async () => {
      const currentUser = users[1];
      const tripList = await currentUser.services.liane.list(["NotStarted", "Started"], { asc: true, cursor: undefined, limit: 20 });
      expect(tripList.data.length).toBe(1);
      expect(tripList.data[0].members.length).toBe(2);
    });
    test("Should have no more request", async () => {
      const currentUser = users[1];
      const requestList = await currentUser.services.liane.listJoinRequests();
      expect(requestList.data.length).toBe(0);
    });
  });

  describe("Both users", () => {
    test("Should start the trip", async () => {
      for (const currentUser of users) {
        await currentUser.services.liane.start(tripId!);
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
            const sub = await subscriber.services.hub.subscribeToTrackingInfo(tripId!, trackedMemberLocation => {
              receivePing(subscriber.id, trackedMemberLocation);
            });
            subscriptions.push(sub);
          }

          s.scheduleSequence(
            driverCoords.map(coordinate => {
              return () =>
                sleep(50).then(() =>
                  driver.services.event.sendPing({
                    liane: tripId!,
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
                    liane: tripId!,
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
