import { faker } from "@faker-js/faker";
import { ConcurrencyError, HttpClient, NetworkUnavailable, QueryPostOptions, UnauthorizedError } from "../../src";
import { LocalStorageImpl } from "./mocks/storage";
import { TestEnv } from "./setup/environment";
import { CreateServices } from "./setup/services";
import { expect } from "vitest";

const phoneNumber = faker.helpers.replaceSymbolWithNumber("06########");

class LocalStorageTestImpl extends LocalStorageImpl {
  setRefreshToken(token: string): Promise<void> {
    return this.storeAsync("refreshToken", token);
  }
  setAccessToken(token: string): Promise<void> {
    return this.storeAsync("token", token);
  }
}

class MockOfflineHttpClient extends HttpClient {
  override postAs<T>(_: string, __: QueryPostOptions = {}): Promise<T> {
    this.logger.info("Throwing network error...");
    throw new NetworkUnavailable();
  }
}

const storage = new LocalStorageTestImpl();
const baseServices = CreateServices(storage);
const offlineHttp = new MockOfflineHttpClient(`${TestEnv.API_URL}/api`, baseServices.logger, storage);

beforeEach(async () => {
  await storage.clearStorage();
  await baseServices.signUpActor.signUpUser(phoneNumber);
  await storage.storeUser(await baseServices.auth.me());
}, 10_000);
vi.setConfig({ testTimeout: 10_000 });
describe.sequential("Session", () => {
  test("Should refresh token", () =>
    new Promise<void>((done, fail) => {
      baseServices.http
        .tryRefreshToken(async () => {
          done();
        })
        .catch(fail);
    }));
  test("Should refresh token from http service", async () => {
    await storage.setAccessToken("dummy");
    const originalRefreshToken = await storage.getRefreshToken();
    expect(originalRefreshToken).not.undefined;
    await baseServices.auth.me();
    const newRefreshToken = await storage.getRefreshToken();
    expect(newRefreshToken).not.undefined;
    expect(originalRefreshToken).not.toEqual(newRefreshToken);
  });
  test("Should refresh token from hub", async () => {
    await storage.setAccessToken("dummy");
    const originalRefreshToken = await storage.getRefreshToken();
    expect(originalRefreshToken).not.undefined;
    await baseServices.hub.start();
    const newRefreshToken = await storage.getRefreshToken();
    expect(newRefreshToken).not.undefined;
    expect(originalRefreshToken).not.toEqual(newRefreshToken);
  });
  test("Should refresh token after network error", () =>
    new Promise<void>((done, fail) => {
      offlineHttp
        .tryRefreshToken(async () => {})
        .catch(e => {
          expect(e).instanceof(NetworkUnavailable);
          baseServices.http
            .tryRefreshToken(async () => {
              done();
            })
            .catch(fail);
        });
    }));
  test("Should not send request while refreshing token", async () => {
    await storage.setAccessToken("dummy");
    const catchError = vi.fn(e => expect(e).instanceof(ConcurrencyError));
    const createPromise = () => new Promise(resolve => baseServices.auth.me().then(resolve).catch(catchError));
    const user = await Promise.race([createPromise(), createPromise(), createPromise()]);
    expect(catchError).toHaveBeenCalledTimes(2);
    expect(user).to.not.undefined;
  });

  test("Should not refresh with invalid token", () =>
    new Promise<void>((done, fail) => {
      storage.setRefreshToken("dummy").then(() =>
        baseServices.http
          .tryRefreshToken(async () => {
            fail();
          })
          .catch(e => {
            expect(e).instanceof(UnauthorizedError);
            done();
          })
      );
    }));
});
