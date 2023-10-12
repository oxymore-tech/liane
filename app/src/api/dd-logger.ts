import { LogArguments, LogWithErrorArguments } from "@datadog/mobile-react-native/lib/typescript/logs/types";
import { LoggerNamespace } from "@/api/logger";
import { DD_CLIENT_TOKEN } from "@env";
import { DdLogs } from "@datadog/mobile-react-native";

export function datadogTransport(props: {
  msg: any;
  rawMsg: any;
  level: { severity: number; text: string };
  extension?: string | null;
  options?: any;
}) {
  if (!DD_CLIENT_TOKEN) {
    return;
  }
  const tag = (props.extension || "APP") as LoggerNamespace;
  if (Array.isArray(props.rawMsg)) {
    log(props.level.severity, tag, props.rawMsg);
  } else {
    log(props.level.severity, tag, [props.rawMsg]);
  }
}

function log(level: number, tag: LoggerNamespace, args: any[]) {
  const formatted = formatLogArguments(tag, args);
  switch (level) {
    case 0:
      return DdLogs.debug(...formatted);

    case 2:
      return DdLogs.warn(...formatted);

    case 3:
      return DdLogs.error(...formatted);

    case 1:
    default:
      return DdLogs.info(...formatted);
  }
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
