import { AuthServiceMock } from "@/api/service/mock/auth";
import { LianeServiceMock } from "@/api/service/mock/liane";
import { AppServices } from "@/api/service";
import { RallyingPointMock } from "@/api/service/mock/rallyingPoints";

export const CreateMockServices = (): AppServices => ({
  auth: new AuthServiceMock(),
  liane: new LianeServiceMock(),
  rallyingPoint: new RallyingPointMock()
});
