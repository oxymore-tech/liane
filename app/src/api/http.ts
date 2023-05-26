import { API_URL, APP_ENV } from "@env";
import { Mutex } from "async-mutex";
import { ForbiddenError, ResourceNotFoundError, UnauthorizedError, ValidationError } from "@/api/exception";
import { FilterQuery, SortOptions } from "@/api/filter";
import { clearStorage, getRefreshToken, getAccessToken, getUserSession, processAuthResponse } from "@/api/storage";
import { AuthResponse } from "@/api/index";

const domain = APP_ENV === "production" ? "liane.app" : "dev.liane.app";

export const BaseUrl = `${API_URL || `https://${domain}`}/api`;

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
  bodyAsJson?: boolean;
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

export async function del(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("DELETE", uri, options);
}

export function post(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("POST", uri, options);
}

export function patch(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("PATCH", uri, options);
}

async function fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  const response = await fetchAndCheck(method, uri, options);
  try {
    return response.status === 204 ? undefined : response.json();
  } catch (e) {
    console.error(e);
  }
}

function formatBody(body?: any, bodyAsJson: boolean = true) {
  if (!body) {
    return null;
  }
  if (bodyAsJson) {
    return JSON.stringify(body);
  }
  return body;
}

const refreshTokenMutex = new Mutex();

async function fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions<any> = {}): Promise<Response> {
  const { body, bodyAsJson } = options;
  const url = formatUrl(uri, options);
  const formatedBody = formatBody(body, bodyAsJson);
  const formatedHeaders = await headers(body, bodyAsJson);
  if (__DEV__) {
    console.debug(`Fetch API ${method} "${url}"`, formatedBody ?? "");
  }
  const response = await fetch(url, {
    headers: formatedHeaders,
    method,
    body: formatedBody
  });
  if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
    switch (response.status) {
      case 400:
        /*
                const message400 = await response.text();
                console.log(`Error 400 on ${method} ${uri}`, response.status, message400);
                throw new Error(message400); */
        if (response.headers.get("content-type") === "application/json" || response.headers.get("content-type") === "application/problem+json") {
          const json = await response.json();
          throw new ValidationError(json?.errors);
        }
        throw new ResourceNotFoundError(await response.text());
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
        console.log(`Unexpected error on ${method} ${uri}`, response.status, message);
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
          console.debug("Try refresh token...");
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
          if (__DEV__) {
            console.error("Error: could not refresh token: ", e);
          }
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

async function headers(body?: any, bodyAsJson: boolean = true) {
  const h = new Headers();
  const token = await getAccessToken();
  if (token) {
    h.append("Authorization", `Bearer ${token}`);
  }
  if (body && bodyAsJson) {
    h.append("Content-Type", "application/json; charset=utf-8");
  }
  return h;
}
