import { logger } from "react-native-logs";
import { DdLogs } from "@datadog/mobile-react-native";
import { LogArguments, LogWithErrorArguments } from "@datadog/mobile-react-native/lib/typescript/logs/types";

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

function formatArgs(args: any[]) {
  if (!args.length) {
    return "";
  }
  if (args.length === 1) {
    return " (1 arg)";
  }
  return ` (${args.length} args)`;
}

function formatLogWithErrorArguments(
  tag: LoggerNamespace,
  message: string | null,
  error: Error | null,
  args: any[]
): LogArguments | LogWithErrorArguments {
  if (!error) {
    if (!message) {
      return [`[${tag}]${formatArgs(args)}`, { tag, args }];
    }
    return [`[${tag}] ${message}${formatArgs(args)}`, { tag, args }];
  }

  if (!message) {
    return [`[${tag}] ${error.message}${formatArgs(args)}`, error.name, error.cause?.toString(), error.stack, { tag, error: message, args }];
  }

  return [
    `[${tag}] ${message}${formatArgs(args)} : ${error.message}`,
    error.name,
    error.cause?.toString(),
    error.stack,
    { tag, error: message, args }
  ];
}

function formatLogArguments(tag: LoggerNamespace, args: any[]): LogArguments | LogWithErrorArguments {
  if (!args.length) {
    return formatLogWithErrorArguments(tag, null, null, args);
  }
  const [first, ...tail1] = args;

  if (typeof first === "string") {
    if (!tail1.length) {
      return formatLogWithErrorArguments(tag, first, null, tail1);
    }
    const [second, ...tail2] = tail1;
    if (second instanceof Error) {
      return formatLogWithErrorArguments(tag, first, second, tail2);
    }
    return formatLogWithErrorArguments(tag, first, null, tail1);
  }

  if (first instanceof Error) {
    return formatLogWithErrorArguments(tag, null, first, tail1);
  }

  return formatLogWithErrorArguments(tag, null, null, args);
}

export class AppLoggerImpl implements ILogger {
  debug(tag: LoggerNamespace, ...args: any[]): void {
    const a = formatLogArguments(tag, args);
    namespaceLoggers[tag].debug(...a);
    DdLogs.debug(...a);
  }

  info(tag: LoggerNamespace, ...args: any[]): void {
    const a = formatLogArguments(tag, args);
    namespaceLoggers[tag].info(...a);
    DdLogs.info(...a);
  }

  warn(tag: LoggerNamespace, ...args: any[]): void {
    const a = formatLogArguments(tag, args);
    namespaceLoggers[tag].warn(...a);
    DdLogs.warn(...a);
  }

  error(tag: LoggerNamespace, ...args: any[]): void {
    const a = formatLogArguments(tag, args);
    namespaceLoggers[tag].error(...a);
    DdLogs.error(...a);
  }
}

export const AppLogger = new AppLoggerImpl();
