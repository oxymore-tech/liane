import { consoleTransport, logger } from "react-native-logs";
import { datadogTransport } from "@/api/dd-logger";
import { AppLogger as CommonAppLogger } from "@liane/common";

export const LoggerNamespaces = [
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
  "DEEP_LINKING",
  "RALLYING_POINT",
  "COMMUNITIES"
] as const;

export type LoggerNamespace = (typeof LoggerNamespaces)[number];

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

const namespaceLoggers = (() => {
  return Object.fromEntries(LoggerNamespaces.map(n => [n, rootLogger.extend(n)]));
})();

export class ReactNativeLogger implements CommonAppLogger<LoggerNamespace> {
  debug(tag: LoggerNamespace, ...args: any[]): void {
    if (__DEV__) {
      namespaceLoggers[tag].debug(...args);
    }
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

export const AppLogger = new ReactNativeLogger();
