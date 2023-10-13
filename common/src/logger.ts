export type LoggerAction<Tag> = (tag: Tag, ...args: any[]) => void;

export interface AppLogger<Tag extends string = string> {
  debug: LoggerAction<Tag>;
  info: LoggerAction<Tag>;
  warn: LoggerAction<Tag>;
  error: LoggerAction<Tag>;
}
