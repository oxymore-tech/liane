import { consoleTransport, logger } from "react-native-logs";
import { datadogTransport } from "@/api/dd-logger";

const LoggerNamespaces = [
  "INIT",
  "HOME",
  "HUB",
  "HTTP",
  "NOTIFICATIONS",
  "SETTINGS",
  "MAP",
  "STORAGE",
  "LOGIN",
  "LOGOUT",
  "GEOPINGS",
  "GEOLOC",
  "DEEP_LINKING"
] as const;
const config = {
  severity: __DEV__ ? "debug" : "info",
  dateFormat: "iso",
  transport: [consoleTransport, datadogTransport],
  transportOptions: {
    colors: {
      info: "blueBright",
      warn: "yellowBright",
      error: "redBright"
    }
  },
  enabledExtensions: [...LoggerNamespaces]
};

const rootLogger = logger.createLogger(config);

export type LoggerNamespace = (typeof config.enabledExtensions)[number];
export type LoggerAction = (tag: LoggerNamespace, ...args: any[]) => void;
const namespaceLoggers = (() => {
  return Object.fromEntries(LoggerNamespaces.map(n => [n, rootLogger.extend(n)]));
})();

export interface ILogger {
  debug: LoggerAction;
  info: LoggerAction;
  warn: LoggerAction;
  error: LoggerAction;
}

export class AppLoggerImpl implements ILogger {
  debug(tag: LoggerNamespace, ...args: any[]): void {
    namespaceLoggers[tag].debug(...args);
  }

  info(tag: LoggerNamespace, ...args: any[]): void {
    namespaceLoggers[tag].info(...args);
  }

  warn(tag: LoggerNamespace, ...args: any[]): void {
    namespaceLoggers[tag].warn(...args);
  }

  error(tag: LoggerNamespace, ...args: any[]): void {
    namespaceLoggers[tag].error(...args);
  }
}

export const AppLogger = new AppLoggerImpl();
