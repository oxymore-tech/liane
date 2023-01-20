import { AuthServiceMock } from "@/api/service/mock/auth";
import { LianeServiceMock } from "@/api/service/mock/liane";
import { AppServices } from "@/api/service";

export const CreateMockServices = (): AppServices => ({
  auth: new AuthServiceMock(),
  liane: new LianeServiceMock()
});