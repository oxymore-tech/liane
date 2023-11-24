import { AppLogger } from "../../../src";

export class ConsoleAppLogger implements AppLogger {
  debug(tag: string, ...args: any[]): void {
    console.debug(`[${new Date().toISOString()}] [${tag}]`, args);
  }

  error(tag: string, ...args: any[]): void {
    console.error(`[${new Date().toISOString()}] [${tag}]`, args);
  }

  info(tag: string, ...args: any[]): void {
    console.info(`[${new Date().toISOString()}] [${tag}]`, args);
  }

  warn(tag: string, ...args: any[]): void {
    console.warn(`[${new Date().toISOString()}] [${tag}]`, ...args);
  }
}
