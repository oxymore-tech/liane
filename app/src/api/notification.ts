import { ConversationGroup, Ref, User, UTCDateTime } from "@/api/index";
import { LianeEvent } from "@/api/event";

export type Notification = (Info | Event | NewMessage) & AbstractNotification;

export enum Answer {
  Accept = "Accept",
  Reject = "Reject"
}

export type Recipient = Readonly<{
  user: Ref<User>;
  seenAt?: UTCDateTime;
}>;

type AbstractNotification = Readonly<{
  type: string;
  id?: string;
  createdBy: Ref<User>;
  createdAt: UTCDateTime;
  recipients: Recipient[];
  answers: Answer[];
  title: string;
  message: string;
}>;

export type Info = Readonly<{
  type: "Info";
}> &
  AbstractNotification;
/*
export type Reminder = Readonly<{
  type: "Reminder";
  payload: {
    liane: Ref<Liane>;
    trip: WayPoint[];
    //   rallyingPoint: RallyingPoint;
    //  at: UTCDateTime;
  };
}> &
  AbstractNotification;*/

export type NewMessage = Readonly<{
  type: "NewMessage";
  conversation: Ref<ConversationGroup>;
}> &
  AbstractNotification;

export type Event<T extends LianeEvent = LianeEvent> = Readonly<{
  type: "Event";
  payload: T;
}> &
  AbstractNotification;
