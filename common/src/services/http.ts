import { Mutex } from "async-mutex";
import { ForbiddenError, ResourceNotFoundError, UnauthorizedError, ValidationError } from "../exception";
import { AuthResponse } from "../api";
import { AppEnv } from "../env";
import { AppLogger } from "../logger";
import { AppStorage } from "../storage";
import urlJoin from "url-join";

export class HttpClient {
  private readonly refreshTokenMutex = new Mutex();

  constructor(private env: AppEnv, private logger: AppLogger, private storage: AppStorage) {}

  get<T>(uri: string, options: QueryAsOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("GET", uri, options);
  }

  async getAsString(uri: string, options: QueryAsOptions = {}): Promise<string> {
    const response = await this.fetchAndCheck("GET", uri, options);
    return await response.text();
  }

  postAs<T>(uri: string, options: QueryPostOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("POST", uri, options);
  }

  async postAsString(uri: string, options: QueryPostOptions = {}): Promise<string> {
    const response = await this.fetchAndCheck("POST", uri, options);
    return await response.text();
  }

  del(uri: string, options: QueryPostOptions = {}) {
    return this.fetchAndCheck("DELETE", uri, options);
  }

  post(uri: string, options: QueryPostOptions = {}) {
    return this.fetchAndCheck("POST", uri, options);
  }

  patch(uri: string, options: QueryPostOptions = {}) {
    return this.fetchAndCheck("PATCH", uri, options);
  }

  patchAs<T>(uri: string, options: QueryPostOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("PATCH", uri, options);
  }

  private async fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions = {}): Promise<T> {
    const response = await this.fetchAndCheck(method, uri, options);
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

  private async fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions = {}): Promise<Response> {
    const { body } = options;
    const url = this.formatUrl(uri, options);
    const formattedBody = this.formatBodyAsJsonIfNeeded(body);
    const formattedHeaders = await this.headers(body);
    if (this.env.isDev) {
      this.logger.debug("HTTP", `Fetch API ${method} "${url}"`, formattedBody ?? "");
    }
    const response = await fetch(url, {
      headers: formattedHeaders,
      method,
      body: formattedBody
    });
    if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
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
          return this.tryRefreshToken(async () => {
            return this.fetchAndCheck(method, uri, options);
          });

        case 403:
          throw new ForbiddenError();

        default:
          const message = await response.text();
          this.logger.error("HTTP", `Unexpected error on ${method} ${uri}`, response.status, message);
          throw new Error(message);
      }
    }
    return response;
  }

  public async tryRefreshToken<TResult>(retryAction: () => Promise<TResult>): Promise<TResult> {
    const refreshToken = await this.storage.getRefreshToken();
    const user = await this.storage.getUser();
    if (refreshToken && user) {
      if (this.refreshTokenMutex.isLocked()) {
        // Ignore if concurrent refresh
        await this.refreshTokenMutex.waitForUnlock();
      } else {
        return this.refreshTokenMutex.runExclusive(async () => {
          if (this.env.isDev) {
            this.logger.debug("HTTP", "Try refresh token...");
          }
          // Call refresh token endpoint
          try {
            const res = await Promise.race([
              new Promise<AuthResponse>((_, reject) => setTimeout(reject, 10000)),
              this.postAs<AuthResponse>("/auth/token", { body: { userId: user.id, refreshToken } })
            ]);
            await this.storage.processAuthResponse(res);
            // Retry
            return await retryAction();
          } catch (e) {
            this.logger.error("HTTP", "Error: could not refresh token: ", e);

            // Logout if unauthorized
            if (e instanceof UnauthorizedError) {
              await this.storage.clearStorage();
            }
            throw new UnauthorizedError();
          }
        });
      }
    }
    throw new UnauthorizedError();
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
    const url = new URL(urlJoin(this.env.baseUrl, uri));

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
}

export interface QueryPostOptions extends QueryAsOptions {
  body?: any;
}
