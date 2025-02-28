import { LocalStorageImpl } from "../mocks/storage";
import { ConsoleAppLogger } from "../mocks/logger";
import {
  AppStorage,
  AuthServiceClient,
  CommunityServiceClient,
  EventServiceClient,
  HttpClient,
  HubServiceClient,
  TripServiceClient,
  Ref,
  User
} from "../../../src";
import { TestEnv } from "./environment";

export const CreateServices = (storage?: AppStorage) => {
  storage = storage ?? new LocalStorageImpl();
  const logger = new ConsoleAppLogger();
  const retryStrategy = { delay: 10, backoff: 0, maxAttempts: 3 };
  const http = new HttpClient(`${TestEnv.API_URL}/api`, logger, storage, { timeout: 4000, retryStrategy });
  const auth = new AuthServiceClient(http, storage);
  const hub = new HubServiceClient(`${TestEnv.API_URL}/api`, logger, storage, http);
  const liane = new TripServiceClient(http);
  const community = new CommunityServiceClient(http);
  const event = new EventServiceClient(http);
  const loginTestUser = async (phone: string) => {
    return (await auth.login({ phone, code: TestEnv.TEST_CODE })).id;
  };
  return { liane, community, storage, logger, http, auth, hub, event, retryStrategy, loginTestUser };
};

export type UserContext = {
  id: Ref<User>;
  services: ReturnType<typeof CreateServices>;
};
