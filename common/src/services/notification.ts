import { Ref, User, UTCDateTime } from "../api";

export type Notification = {
  id: string;
  createdBy: Ref<User>;
  createdAt: UTCDateTime;
  title: string;
  message: string;
  uri?: string;
};
