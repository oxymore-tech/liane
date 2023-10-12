import { API_URL, APP_ENV, TILES_URL } from "@env";
import { Mutex } from "async-mutex";
import { BadRequest, ForbiddenError, ResourceNotFoundError, UnauthorizedError, ValidationError } from "@/api/exception";
import { FilterQuery, SortOptions } from "@/api/filter";
import { clearStorage, getAccessToken, getRefreshToken, getUserSession, processAuthResponse } from "@/api/storage";
import { AuthResponse } from "@/api/index";
import { AppLogger } from "@/api/logger";

const domain = APP_ENV === "production" ? "liane.app" : "dev.liane.app";

export const BaseUrl = `${API_URL || `https://${domain}`}/api`;
export const TilesUrl = `${TILES_URL || `https://${domain}`}`;

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

function formatUrl<T>(uri: string, { listOptions, params }: QueryAsOptions<T>) {
  const url = new URL(uri, BaseUrl);
  if (listOptions) {
    const { filter, skip, limit, sort, search } = listOptions;
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

export async function get<T>(uri: string, options: QueryAsOptions<T> = {}): Promise<T> {
  return fetchAndCheckAs<T>("GET", uri, options);
}

export async function getAsString(uri: string, options: QueryAsOptions<any> = {}): Promise<string> {
  const response = await fetchAndCheck("GET", uri, options);
  return response.text();
}

export async function postAs<T>(uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  return fetchAndCheckAs<T>("POST", uri, options);
}

export async function postAsString(uri: string, options: QueryPostOptions<any> = {}): Promise<string> {
  const response = await fetchAndCheck("POST", uri, options);
  return await response.text();
}

export async function del(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("DELETE", uri, options);
}

export function post(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("POST", uri, options);
}

export function patch(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("PATCH", uri, options);
}
export async function patchAs<T>(uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  return fetchAndCheckAs<T>("PATCH", uri, options);
}

// @ts-ignore
async function fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  const response = await fetchAndCheck(method, uri, options);
  if (response.status === 204) {
    // Do not try parsing body
    // @ts-ignore
    return undefined;
  } else {
    try {
      const res = await response.text();
      return res ? JSON.parse(res) : undefined;
    } catch (e) {
      console.error(e);
    }
  }
}

function formatBodyAsJsonIfNeeded(body?: any) {
  if (isRawBody(body)) {
    return body;
  }
  return JSON.stringify(body);
}

function isRawBody(body?: any) {
  return !body || body instanceof Blob || body instanceof FormData;
}

const refreshTokenMutex = new Mutex();

async function fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions<any> = {}): Promise<Response> {
  const { body } = options;
  const url = formatUrl(uri, options);
  const formattedBody = formatBodyAsJsonIfNeeded(body);
  const formattedHeaders = await headers(body);
  if (__DEV__) {
    AppLogger.debug("HTTP", `Fetch API ${method} "${url}"`, formattedBody ?? "");
  }
  const response = await fetch(url, {
    headers: formattedHeaders,
    method,
    body: formattedBody
  });
  if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
    switch (response.status) {
      case 400:
        if (response.headers.get("content-type") === "application/json" || response.headers.get("content-type") === "application/problem+json") {
          const json = await response.json();
          throw new ValidationError(json?.errors);
        }
        const text = await response.text();
        throw new BadRequest(text);
      case 404:
        throw new ResourceNotFoundError(await response.text());
      case 401:
        return tryRefreshToken(async () => {
          return await fetchAndCheck(method, uri, options);
        });
      case 403:
        throw new ForbiddenError();
      default:
        const message = await response.text();
        AppLogger.warn("HTTP", `Unexpected error on ${method} ${uri}`, response.status, message);
        throw new Error(message);
    }
  }
  return response;
}

export async function tryRefreshToken<TResult>(retryAction: () => Promise<TResult>): Promise<TResult> {
  const refreshToken = await getRefreshToken();
  const user = await getUserSession();
  if (refreshToken && user) {
    if (refreshTokenMutex.isLocked()) {
      // Ignore if concurrent refresh
      await refreshTokenMutex.waitForUnlock();
    } else {
      return refreshTokenMutex.runExclusive(async () => {
        if (__DEV__) {
          AppLogger.debug("HTTP", "Try refresh token...");
        }
        // Call refresh token endpoint
        try {
          const res = await Promise.race([
            new Promise<AuthResponse>((_, reject) => setTimeout(reject, 10000)),
            postAs<AuthResponse>("/auth/token", { body: { userId: user.id, refreshToken } })
          ]);
          await processAuthResponse(res);
          // Retry
          return await retryAction();
        } catch (e) {
          AppLogger.error("HTTP", "Error: could not refresh token: ", e);

          // Logout if unauthorized
          if (e instanceof UnauthorizedError) {
            await clearStorage();
          }
          throw new UnauthorizedError();
        }
      });
    }
  }
  throw new UnauthorizedError();
}

async function headers(body?: any) {
  const h = new Headers();
  const token = await getAccessToken();
  if (token) {
    h.append("Authorization", `Bearer ${token}`);
  }
  if (!isRawBody(body)) {
    h.append("Content-Type", "application/json; charset=utf-8");
  } else if (body instanceof FormData) {
    h.append("Content-Type", "multipart/form-data");
  }
  return h;
}
