import { LogArguments, LogWithErrorArguments } from "@datadog/mobile-react-native/lib/typescript/logs/types";
import { LoggerNamespace } from "@/api/logger";
import { DD_CLIENT_TOKEN } from "@env";
import { DdLogs } from "@datadog/mobile-react-native";
import { getCurrentUser } from "@/api/storage";

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

async function log(level: number, tag: LoggerNamespace, args: any[]) {
  const formatted = await formatLogArguments(tag, args);
  switch (level) {
    case 0:
      return DdLogs.debug(...formatted);

    case 3:
      return DdLogs.warn(...formatted);

    case 4:
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

async function getUserInfo() {
  const user = await getCurrentUser();
  if (!user) {
    return undefined;
  }
  return { pseudo: user.pseudo, id: user.id };
}

async function formatLogWithErrorArguments(
  tag: LoggerNamespace,
  message: string | null,
  error: Error | null,
  args: any[]
): Promise<LogArguments | LogWithErrorArguments> {
  const user = await getUserInfo();
  if (!error) {
    if (!message) {
      return [`[${tag}]${formatArgs(args)}`, { tag, user, args }];
    }
    return [`[${tag}] ${message}${formatArgs(args)}`, { tag, user, args }];
  }

  if (!message) {
    return [`[${tag}] ${error.message}${formatArgs(args)}`, error.name, error.cause?.toString(), error.stack, { tag, user, error: message, args }];
  }

  return [
    `[${tag}] ${message}${formatArgs(args)} : ${error.message}`,
    error.name,
    error.cause?.toString(),
    error.stack,
    { tag, user, error: message, args }
  ];
}

function formatLogArguments(tag: LoggerNamespace, args: any[]): Promise<LogArguments | LogWithErrorArguments> {
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
