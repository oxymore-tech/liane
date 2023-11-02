import { AppLogger } from "@liane/common";

export class ConsoleAppLogger implements AppLogger {
  debug(tag: string, args: any): void {
    console.debug(tag, args);
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
