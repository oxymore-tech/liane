import { SignUpContext, SignUpPayload, ValidationError } from "../../src";
import { faker } from "@faker-js/faker";
import { CreateServices } from "./setup/services";
import { TestEnv } from "./setup/environment";

const Services = CreateServices();
vi.setConfig({ testTimeout: 5_000 });

const newUserPhone = faker.helpers.replaceSymbolWithNumber("06########");

describe.sequential("Signing up and authenticating", () => {
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
        expect(finalContext.authUser?.isSignedUp).true;
        Services.auth.me().then(res => {
          expect(res).toMatchObject(user);
          done();
        });
      };
      Services.signUpActor.runScenario(onDone, fail, newUserPhone, user);
    }));

  test("Should delete account", async () => {
    await Services.auth.deleteAccount();
  });

  test("Should log in existing user", () =>
    new Promise<void>((done, fail) => {
      const onDone = (finalContext: SignUpContext) => {
        expect(finalContext.authUser?.isSignedUp).true;
        done();
      };
      Services.signUpActor.runScenario(onDone, fail, TestEnv.TEST_ACCOUNT);
    }));

  test("Should fail signing up with with a name too short", () =>
    new Promise<any>((done, fail) => {
      const phone = faker.helpers.replaceSymbolWithNumber("06########");
      const user: SignUpPayload = {
        firstName: faker.person.firstName(),
        lastName: "X",
        gender: "Man"
      };
      const onFail = (reason: any) => {
        expect(reason).instanceof(ValidationError);
        done(reason);
      };
      Services.signUpActor.runScenario(fail, onFail, phone, user);
    }));
});
