import { API_URL, APP_ENV } from "@env";
import { ResourceNotFoundError, UnauthorizedError, ValidationError } from "@/api/exception";
import { FilterQuery, SortOptions } from "@/api/filter";
import { getStoredRefreshToken, getStoredToken, getStoredUser, processAuthResponse } from "@/api/storage";
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

type MethodType = "GET" | "POST" | "PUT" | "DELETE";

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

async function fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  const response = await fetchAndCheck(method, uri, options);
  return response.json();
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

async function fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions<any> = {}) {
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
  if (response.status !== 200 && response.status !== 201) {
    switch (response.status) {
      case 400:
        /*
                const message400 = await response.text();
                console.log(`Error 400 on ${method} ${uri}`, response.status, message400);
                throw new Error(message400); */
        if ((response.headers.get("content-type") === "application/json")
                    || (response.headers.get("content-type") === ("application/problem+json"))) {
          const json = await response.json();
          throw new ValidationError(json?.errors);
        }
        throw new ResourceNotFoundError(await response.text());
      case 404:
        throw new ResourceNotFoundError(await response.text());
      case 401:
        // Try refreshing token
        const refreshToken = await getStoredRefreshToken();
        const user = await getStoredUser();
        if (refreshToken && user) {
          if (__DEV__) {
            console.debug("Refresh token");
          }
          // Call refresh token endpoint
          const res = await postAs<AuthResponse>("/auth/token", { body: refreshToken, params: { userId: user.id } });
          await processAuthResponse(res);
          // Retry query
          return fetchAndCheck(method, uri, options);
        }

        throw new UnauthorizedError();
      case 403:
        throw new UnauthorizedError();
      default:
        const message = await response.text();
        console.log(`Unexpected error on ${method} ${uri}`, response.status, message);
        throw new Error(message);
    }
  }
  return response;
}

async function headers(body?: any, bodyAsJson: boolean = true) {
  const h = new Headers();
  const token = await getStoredToken();
  if (token) {
    h.append("Authorization", `Bearer ${token}`);
  }
  if (body && bodyAsJson) {
    h.append("Content-Type", "application/json; charset=utf-8");
  }
  return h;
}
