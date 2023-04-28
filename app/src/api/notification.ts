import { Ref, User, UTCDateTime } from "@/api/index";
import { LianeEvent } from "@/api/event";

export type Notification = Info | Reminder | Event;

export enum Answer {
  Accept = "Accept",
  Reject = "Reject"
}

export type Recipient = Readonly<{
  user: Ref<User>;
  seenAt?: UTCDateTime;
}>;

export type Info = Readonly<{
  _t: "Info";
  id?: string;
  sender?: Ref<User>;
  sentAt: UTCDateTime;
  recipients: Recipient[];
  answers: Answer[];
  title: string;
  message: string;
}>;

export type Reminder = Readonly<{
  _t: "Reminder";
  id?: string;
  sender?: Ref<User>;
  sentAt: UTCDateTime;
  recipients: Recipient[];
  answers: Answer[];
  title: string;
  message: string;
  payload: Reminder;
}>;

export type Event<T extends LianeEvent = LianeEvent> = Readonly<{
  _t: "Event";
  id?: string;
  sender?: Ref<User>;
  sentAt: UTCDateTime;
  recipients: Recipient[];
  answers: Answer[];
  title: string;
  message: string;
  payload: T;
}>;
