import { LocalStorageImpl } from "../mocks/storage";
import { ConsoleAppLogger } from "../mocks/logger";
import { AuthServiceClient, HttpClient, HubServiceClient, LianeServiceClient, Ref, User } from "../../../src";
import { TestEnv } from "./environment";
import { LoginActor } from "../actors/login";

export const CreateServices = () => {
  const storage = new LocalStorageImpl();
  const logger = new ConsoleAppLogger();
  const http = new HttpClient(`${TestEnv.API_URL}/api`, logger, storage);
  const auth = new AuthServiceClient(http, storage);
  const hub = new HubServiceClient(`${TestEnv.API_URL}/api`, logger, storage, http);
  const signUpActor = new LoginActor(auth);
  const liane = new LianeServiceClient(http);
  return { liane, storage, logger, http, auth, signUpActor, hub };
};

export type UserContext = {
  id: Ref<User>;
  services: ReturnType<typeof CreateServices>;
};
