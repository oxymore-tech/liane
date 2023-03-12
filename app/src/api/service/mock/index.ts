import { AuthServiceMock } from "@/api/service/mock/auth";
import { LianeServiceMock } from "@/api/service/mock/liane";
import { AppServices } from "@/api/service";
import { RallyingPointMock } from "@/api/service/mock/rallyingPoints";
import { HubServiceMock } from "@/api/service/mock/chat";
import { LocationServiceClient } from "@/api/service/location";

export const CreateMockServices = (): AppServices => ({
  auth: new AuthServiceMock(),
  liane: new LianeServiceMock(),
  rallyingPoint: new RallyingPointMock(),
  chatHub: new HubServiceMock(),
  location: new LocationServiceClient()
});
