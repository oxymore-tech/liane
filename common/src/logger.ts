export type LoggerAction = (tag: string, ...args: any[]) => void;

export interface AppLogger {
  debug: LoggerAction;
  info: LoggerAction;
  warn: LoggerAction;
  error: LoggerAction;
}

