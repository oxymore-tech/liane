import { describe, expect, test, vi } from "vitest";
import { SignUpContext, SignUpPayload, ValidationError } from "../../src";
import { faker } from "@faker-js/faker";
import { CreateServices } from "./setup/services";

const Services = CreateServices();
const newUserPhone = faker.helpers.replaceSymbolWithNumber("06########");
vi.setConfig({ testTimeout: 5_000 });

describe("Auth Service", () => {
  test("Should be undefined", async () => {
    const user = await Services.auth.me();
    expect(user).undefined;
  });

  test("Should sign up new user", () =>
    new Promise<void>((done, fail) => {
      const user: SignUpPayload = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        gender: "Man"
      };
      const onDone = (finalContext: SignUpContext) => {
        expect(finalContext.authUser.isSignedUp).true;
        Services.auth.me().then(res => {
          expect(res).toMatchObject(user);
          done();
        });
      };
      Services.signUpActor.runScenario(onDone, fail, newUserPhone, user);
    }));

  test("Should log in existing user", () =>
    new Promise<any>((done, fail) => {
      Services.signUpActor.runScenario(done, fail, newUserPhone);
    }));

  test("Should delete account", async () => {
    await Services.auth.deleteAccount();
  });

  test("Should not log in a deleted user", () =>
    new Promise<void>((done, fail) => {
      const onDone = (finalContext: SignUpContext) => {
        expect(finalContext.authUser.isSignedUp).false;
        done();
      };
      Services.signUpActor.runScenario(onDone, fail, newUserPhone);
    }));

  test.fails(
    "Should fail signing up with with a name too short",
    () =>
      new Promise<any>((done, fail) => {
        const phone = faker.helpers.replaceSymbolWithNumber("06########");
        const user: SignUpPayload = {
          firstName: faker.person.firstName(),
          lastName: "X",
          gender: "Man"
        };
        const onFail = (reason: any) => {
          expect(reason).instanceof(ValidationError);
          fail(reason);
        };
        Services.signUpActor.runScenario(done, onFail, phone, user);
      })
  );
});
