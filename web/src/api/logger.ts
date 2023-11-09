import { AppLogger } from "@liane/common";
import { AppEnv } from "@liane/common/src";

export class ConsoleAppLogger implements AppLogger {
  constructor(private env: AppEnv) {}
  debug(tag: string, args: any): void {
    if (this.env.isDev) console.debug(tag, args);
  }

  error(tag: string, args: any): void {
    console.error(tag, args);
  }

  info(tag: string, args: any): void {
    console.info(tag, args);
  }

  warn(tag: string, args: any): void {
    console.warn(tag, args);
  }
}
