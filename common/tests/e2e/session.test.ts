import { faker } from "@faker-js/faker";
import { Fetch, HttpClient, isTokenExpired, NetworkUnavailable, sleep } from "../../src";
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

function failingFetch(numberOfFailingCalls: number): Fetch {
  let count = 0;
  return async (url: string, init?: RequestInit) => {
    if (count < numberOfFailingCalls) {
      count++;
      throw new NetworkUnavailable();
    }
    count++;
    return await global.fetch(url, init);
  };
}

const storage = new LocalStorageTestImpl();

const baseServices = CreateServices(storage);

function failingHttpClient(numberOfFailingCalls: number): HttpClient {
  const options = { fetchImpl: failingFetch(numberOfFailingCalls), retryStrategy: baseServices.retryStrategy };
  return new HttpClient(`${TestEnv.API_URL}/api`, baseServices.logger, storage, options);
}

beforeEach(async () => {
  await storage.clearStorage();
  await baseServices.signUpActor.signUpUser(phoneNumber);
  await storage.storeUser(await baseServices.auth.me());
}, 10_000);
vi.setConfig({ testTimeout: 10_000 });
describe.sequential("Session", () => {
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
    const expired = isTokenExpired("dummy");
    expect(expired).to.be.true;

    await storage.setAccessToken("dummy");
    const originalRefreshToken = await storage.getRefreshToken();
    expect(originalRefreshToken).not.undefined;
    await baseServices.hub.start();
    await sleep(2000);
    const newRefreshToken = await storage.getRefreshToken();
    expect(newRefreshToken).not.undefined;
    expect(originalRefreshToken).not.toEqual(newRefreshToken);
  });
  test("Should retry http request after network error", async () => {
    const offlineHttp = failingHttpClient(2);
    const actual = await offlineHttp.get("/user");
    expect(actual).not.undefined;
  });
  test("Should returns original error after max retries", async () => {
    try {
      const offlineHttp = failingHttpClient(10);
      await offlineHttp.get("/user");
      expect.fail("Should throw error");
    } catch (e) {
      expect(e).instanceof(NetworkUnavailable);
    }
  });
  test("Should refresh token after network error", async () => {
    const offlineHttp = failingHttpClient(2);
    const actual = await offlineHttp.get("/user");
    expect(actual).not.undefined;
  });
  test("Should not send request while refreshing token", async () => {
    const callUser = vi.fn();
    const callRefreshToken = vi.fn();
    const fetchImpl = vi.fn((url: string, init) => {
      if (url.endsWith("/api/user")) {
        callUser();
      }
      if (url.endsWith("/auth/token")) {
        callRefreshToken();
      }
      return global.fetch(url, init);
    });
    const options = { fetchImpl, retryStrategy: baseServices.retryStrategy };
    const httpClient = new HttpClient(`${TestEnv.API_URL}/api`, baseServices.logger, storage, options);
    await storage.setAccessToken("dummy");
    const createPromise = () => httpClient.get("/user");
    const user = await Promise.race([createPromise(), createPromise(), createPromise()]);
    expect(callRefreshToken).toHaveBeenCalledTimes(1);
    expect(callUser).toHaveBeenCalledTimes(6);
    expect(user).to.not.undefined;
  });

  test("Should not refresh with invalid token", async () => {
    await storage.setRefreshToken("dummy");
    const actual = await baseServices.http.tryRefreshToken();
    expect(actual).to.be.false;
  });
});
