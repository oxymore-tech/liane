import { LocalStorageImpl } from "../mocks/storage";
import { ConsoleAppLogger } from "../mocks/logger";
import {
  AppStorage,
  AuthServiceClient,
  CommunityServiceClient,
  EventServiceClient,
  HttpClient,
  HubServiceClient,
  LianeServiceClient,
  Ref,
  User
} from "../../../src";
import { TestEnv } from "./environment";
import { LoginActor } from "../actors/login";

export const CreateServices = (storage?: AppStorage) => {
  storage = storage ?? new LocalStorageImpl();
  const logger = new ConsoleAppLogger();
  const retryStrategy = { delay: 10, backoff: 0, maxAttempts: 3 };
  const http = new HttpClient(`${TestEnv.API_URL}/api`, logger, storage, { timeout: 4000, retryStrategy });
  const auth = new AuthServiceClient(http, storage);
  const hub = new HubServiceClient(`${TestEnv.API_URL}/api`, logger, storage, http);
  const signUpActor = new LoginActor(auth);
  const liane = new LianeServiceClient(http);
  const community = new CommunityServiceClient(http);
  const event = new EventServiceClient(http);
  return { liane, community, storage, logger, http, auth, signUpActor, hub, event, retryStrategy };
};

export type UserContext = {
  id: Ref<User>;
  services: ReturnType<typeof CreateServices>;
};
