import { Mutex } from "async-mutex";
import { ForbiddenError, ResourceNotFoundError, TimedOutError, UnauthorizedError, ValidationError } from "../exception";
import { AuthResponse } from "../api";
import { AppLogger } from "../logger";
import { SessionProvider } from "../storage";
import urlJoin from "url-join";
import { retry, RetryStrategy } from "../util/retry";

export type Fetch = (url: string, options?: RequestInit) => Promise<Response>;

export type HttpClientOptions = {
  timeout?: number;
  fetchImpl?: Fetch;
  retryStrategy?: RetryStrategy;
};

const DEFAULT_TIMEOUT = 10_000; // in seconds

export class HttpClient {
  private readonly refreshTokenMutex = new Mutex();

  constructor(
    protected readonly baseUrl: string,
    protected readonly logger: AppLogger,
    protected readonly storage: SessionProvider,
    private readonly options: HttpClientOptions = {}
  ) {}

  get<T>(uri: string, options: QueryAsOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("GET", uri, options);
  }

  async getAsString(uri: string, options: QueryAsOptions = {}): Promise<string> {
    const response = await this.fetchAndCheckWithRetry("GET", uri, options);
    return await response.text();
  }

  postAs<T>(uri: string, options: QueryPostOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("POST", uri, options);
  }

  async postAsString(uri: string, options: QueryPostOptions = {}): Promise<string> {
    const response = await this.fetchAndCheckWithRetry("POST", uri, options);
    return await response.text();
  }

  del(uri: string, options: QueryPostOptions = {}) {
    return this.fetchAndCheckWithRetry("DELETE", uri, options);
  }

  post(uri: string, options: QueryPostOptions = {}) {
    return this.fetchAndCheckWithRetry("POST", uri, options);
  }

  patch(uri: string, options: QueryPostOptions = {}) {
    return this.fetchAndCheckWithRetry("PATCH", uri, options);
  }

  patchAs<T>(uri: string, options: QueryPostOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("PATCH", uri, options);
  }

  private async fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions = {}): Promise<T> {
    const response = await this.fetchAndCheckWithRetry(method, uri, options);
    if (response.status === 204) {
      // Do not try parsing body
      return undefined as any;
    }
    try {
      const res = await response.text();
      return res ? JSON.parse(res) : undefined;
    } catch (e) {
      this.logger.error("HTTP", e);
    }
    return undefined as any;
  }

  private formatBodyAsJsonIfNeeded(body?: any) {
    if (this.isRawBody(body)) {
      return body;
    }
    return JSON.stringify(body);
  }

  private isRawBody(body?: any) {
    return !body || body instanceof Blob || body instanceof FormData;
  }

  private async fetchAndCheckWithRetry(method: MethodType, uri: string, options: QueryPostOptions = {}): Promise<Response> {
    return retry({
      body: () => this.fetchAndCheck(method, uri, options),
      retryOn: (error, attempt) => this.retryStrategy(error, attempt, options.disableRefreshToken),
      logger: {
        retry: (attempt, delay, error) =>
          this.logger.debug("HTTP", `'${uri}' : '${error.message ?? typeof error}', will retry in ${delay}ms (${attempt})`),
        error: (attempt, error) => this.logger.warn("HTTP", `Receive an error, max retry reached (${attempt})`, error)
      }
    });
  }

  private async retryStrategy(error: any, _: number, disableRefreshToken?: boolean): Promise<RetryStrategy> {
    switch (error.constructor) {
      case UnauthorizedError:
        if (disableRefreshToken) {
          return false;
        }
        return (await this.tryRefreshToken()) ? { delay: 0 } : false;
      case ValidationError:
      case ResourceNotFoundError:
      case ForbiddenError:
        return false;
    }
    return this.options.retryStrategy ?? {};
  }

  private async fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions = {}): Promise<Response> {
    const { body } = options;
    const url = this.formatUrl(uri, options);
    const formattedBody = this.formatBodyAsJsonIfNeeded(body);
    const formattedHeaders = await this.headers(body);
    this.logger.debug("HTTP", `${method} "${url}"`, formattedBody ?? "");
    const f = this.options.fetchImpl ?? fetch;
    const response = await f(url, {
      headers: formattedHeaders,
      method,
      body: formattedBody
    });

    this.logger.debug("HTTP", `${method} "${url}" response : ${response.status}`);
    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    switch (response.status) {
      case 400: {
        const content = response.headers.get("content-type") ?? "";
        if (content.indexOf("json") !== -1) {
          const json = await response.json();
          throw new ValidationError(json.message ?? json.title, json.errors);
        }
        const text = await response.text();
        throw new ValidationError(text);
      }

      case 404:
        throw new ResourceNotFoundError(await response.text());

      case 401:
        throw new UnauthorizedError();

      case 403:
        throw new ForbiddenError();

      default:
        const message = await response.text();
        this.logger.error("HTTP", `Unexpected error on ${method} ${uri}`, response.status, message);
        throw new Error(message);
    }
  }

  public async tryRefreshToken(): Promise<boolean> {
    const refreshToken = await this.storage.getRefreshToken();
    const user = await this.storage.getSession();
    if (!refreshToken || !user) {
      this.logger.warn("HTTP", "Error: could not refresh token: user or refresh token not found");
      return false;
    }

    if (this.refreshTokenMutex.isLocked()) {
      // Reject on unlock if this is concurrent refresh so that calling service can retry manually to avoid duplicate requests
      await this.refreshTokenMutex.waitForUnlock();
      return true;
    } else {
      return await this.refreshTokenMutex.runExclusive(async () => {
        this.logger.info("HTTP", "Try refresh token...");

        // Call refresh token endpoint
        try {
          const ms = this.options.timeout ?? DEFAULT_TIMEOUT;
          console.log("timeout", ms);
          const res = await Promise.race([
            new Promise<AuthResponse>((_, reject) => setTimeout(() => reject(new TimedOutError()), ms)),
            this.postAs<AuthResponse>("/auth/token", { body: { userId: user.id, refreshToken }, disableRefreshToken: true })
          ]);
          console.log("RES", res);
          await this.storage.processAuthResponse(res);
          return true;
        } catch (e) {
          this.logger.error("HTTP", "Error: could not refresh token: ", e?.toString());

          // Logout if unauthorized
          if (e instanceof UnauthorizedError) {
            await this.storage.closeSession();
            return false;
          }
          return true;
        }
      });
    }
  }

  private async headers(body?: any) {
    const h = new Headers();
    const token = await this.storage.getAccessToken();
    if (token) {
      h.append("Authorization", `Bearer ${token}`);
    }
    if (!this.isRawBody(body)) {
      h.append("Content-Type", "application/json; charset=utf-8");
    } else if (body instanceof FormData) {
      h.append("Content-Type", "multipart/form-data");
    }
    return h;
  }

  private formatUrl(uri: string, { params }: QueryAsOptions) {
    const url = new URL(urlJoin(this.baseUrl, uri));

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) {
          if (Array.isArray(v)) {
            v.forEach(item => url.searchParams.append(k, item.toString()));
          } else {
            url.searchParams.append(k, v.toString());
          }
        }
      }
    }
    return url.toString();
  }
}

type MethodType = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type QueryParams = { [k: string]: any };

export interface QueryAsOptions {
  params?: QueryParams;
  disableRefreshToken?: boolean;
}

export interface QueryPostOptions extends QueryAsOptions {
  body?: any;
}
