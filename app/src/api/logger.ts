import { logger } from "react-native-logs";

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
  severity: __DEV__ ? "debug" : "warn",
  dateFormat: "iso",
  transportOptions: {
    colors: {
      info: "blueBright",
      warn: "yellowBright",
      error: "redBright"
    }
  },
  enabledExtensions: [...LoggerNamespaces]
};

export type LoggerNamespace = (typeof config.enabledExtensions)[number];
export type LoggerAction = (tag: LoggerNamespace, ...args: any[]) => void;
const namespaceLoggers = (() => {
  const rootLogger = logger.createLogger(config);
  return Object.fromEntries(LoggerNamespaces.map(n => [n, rootLogger.extend(n)]));
})();

export interface ILogger {
  debug: LoggerAction;
  info: LoggerAction;
  warn: LoggerAction;
  error: LoggerAction;
}

export const AppLogger: ILogger = {
  debug: (tag, ...args) => {
    namespaceLoggers[tag].debug(args);
  },
  info: (tag, ...args) => {
    namespaceLoggers[tag].info(args);
  },
  warn: (tag, ...args) => {
    namespaceLoggers[tag].warn(args);
  },
  error: (tag, ...args) => {
    namespaceLoggers[tag].error(args);
  }
};
