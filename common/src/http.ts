import {Mutex} from "async-mutex";
import {ForbiddenError, ResourceNotFoundError, UnauthorizedError, ValidationError} from "./exception";
import {FilterQuery, SortOptions} from "./filter";
import {AuthResponse} from "./api";
import {AppEnv} from "./env";
import {AppLogger} from "./logger";
import {AppStorage} from "./storage";

type HttpClientProps = {
  env: AppEnv;
  logger: AppLogger;
  storage: AppStorage;
}

export class HttpClient {

  private readonly refreshTokenMutex = new Mutex();
  private readonly baseUrl: string;

  constructor(private props: HttpClientProps) {

    const host = props.env.APP_ENV === "production" ? "liane.app" : "dev.liane.app";

    this.baseUrl = `${props.env.API_URL || `https://${host}`}/api`;
  }

  async get<T>(uri: string, options: QueryAsOptions<T> = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("GET", uri, options);
  }

  async getAsString(uri: string, options: QueryAsOptions<any> = {}): Promise<string> {
    const response = await this.fetchAndCheck("GET", uri, options);
    return response.text();
  }

  async postAs<T>(uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("POST", uri, options);
  }

  async postAsString(uri: string, options: QueryPostOptions<any> = {}): Promise<string> {
    const response = await this.fetchAndCheck("POST", uri, options);
    return await response.text();
  }

  async del(uri: string, options: QueryPostOptions<any> = {}) {
    return this.fetchAndCheck("DELETE", uri, options);
  }

  post(uri: string, options: QueryPostOptions<any> = {}) {
    return this.fetchAndCheck("POST", uri, options);
  }

  patch(uri: string, options: QueryPostOptions<any> = {}) {
    return this.fetchAndCheck("PATCH", uri, options);
  }

  async patchAs<T>(uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("PATCH", uri, options);
  }

  private async fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
    const response = await this.fetchAndCheck(method, uri, options);
    if (response.status === 204) {
      // Do not try parsing body
      // @ts-ignore
      return undefined as any;
    }
    try {
      const res = await response.text();
      return res ? JSON.parse(res) : undefined;
    } catch (e) {
      this.props.logger.error("HTTP", e);
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

  private async fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions<any> = {}): Promise<Response> {
    const {body} = options;
    const url = this.formatUrl(uri, options);
    const formattedBody = this.formatBodyAsJsonIfNeeded(body);
    const formattedHeaders = await this.headers(body);
    if (this.props.env.isDev) {
      this.props.logger.debug("HTTP", `Fetch API ${method} "${url}"`, formattedBody ?? "");
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
            return await this.fetchAndCheck(method, uri, options);
          });

        case 403:
          throw new ForbiddenError();

        default:
          const message = await response.text();
          this.props.logger.error("HTTP", `Unexpected error on ${method} ${uri}`, response.status, message);
          throw new Error(message);
      }
    }
    return response;
  }

  private async tryRefreshToken<TResult>(retryAction: () => Promise<TResult>): Promise<TResult> {
    const refreshToken = await this.props.storage.getRefreshToken();
    const user = await this.props.storage.getUserSession();
    if (refreshToken && user) {
      if (this.refreshTokenMutex.isLocked()) {
        // Ignore if concurrent refresh
        await this.refreshTokenMutex.waitForUnlock();
      } else {
        return this.refreshTokenMutex.runExclusive(async () => {
          if (this.props.env.isDev) {
            this.props.logger.debug("HTTP", "Try refresh token...");
          }
          // Call refresh token endpoint
          try {
            const res = await Promise.race([
              new Promise<AuthResponse>((_, reject) => setTimeout(reject, 10000)),
              this.postAs<AuthResponse>("/auth/token", {body: {userId: user.id, refreshToken}})
            ]);
            await this.props.storage.processAuthResponse(res);
            // Retry
            return await retryAction();
          } catch (e) {
            this.props.logger.error("HTTP", "Error: could not refresh token: ", e);

            // Logout if unauthorized
            if (e instanceof UnauthorizedError) {
              await this.props.storage.clearStorage();
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
    const token = await this.props.storage.getAccessToken();
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

  private formatUrl<T>(uri: string, {listOptions, params}: QueryAsOptions<T>) {
    const url = new URL(uri, this.baseUrl);
    if (listOptions) {
      const {filter, skip, limit, sort, search} = listOptions;
      if (filter) {
        url.searchParams.append("filter", JSON.stringify(filter));
      }
      if (search) {
        url.searchParams.append("search", search);
      }
      if (skip) {
        url.searchParams.append("skip", skip.toString());
      }
      if (limit) {
        url.searchParams.append("limit", limit.toString());
      }
      if (sort) {
        url.searchParams.append("sort", JSON.stringify(sort));
      }
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) {
          url.searchParams.append(k, v.toString());
        }
      }
    }
    return url.toString();
  }

}

export interface ListOptions<T> {
  readonly filter?: FilterQuery<T>;
  readonly skip?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly sort?: SortOptions<T>;
}

type MethodType = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type QueryParams = { [k: string]: any };

export interface QueryAsOptions<T> {
  listOptions?: ListOptions<T>;
  params?: QueryParams;
}

export interface QueryPostOptions<T> extends QueryAsOptions<T> {
  body?: any;
}