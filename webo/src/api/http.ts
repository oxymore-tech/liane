import { ResourceNotFoundError, UnauthorizedError, ValidationError } from "@/api/exception";
import { FilterQuery, SortOptions } from "@/api/filter";
import { getStoredToken } from "@/api/storage";

const BaseUrl = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : "https://dev.liane.app";

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
  listOptions?: ListOptions<T>,
  params?: QueryParams
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

export async function remove(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("DELETE", uri, options);
}

export function post(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("POST", uri, options);
}

export function put(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("PUT", uri, options);
}

async function fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  const response = await fetchAndCheck(method, uri, options);
  return response.json();
}

async function fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions<any> = {}) {
  const { body, bodyAsJson } = options;
  const response = await fetch(formatUrl(uri, options), {
    headers: await headers(body, bodyAsJson),
    method,
    body: formatBody(body, bodyAsJson)
  });
  if (response.status !== 200 && response.status !== 201) {
    switch (response.status) {
      case 400:
        const json = await response.json();
        throw new ValidationError(json?.errors || {});
      case 404:
        throw new ResourceNotFoundError(await response.text());
      case 401:
      case 403:
        throw new UnauthorizedError();
      default:
        throw new Error(await response.text());
    }
  }
  return response;
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

async function headers(body?: any, bodyAsJson: boolean = true) {
  const h = new Headers();
  const token = await getStoredToken();
  if (token) {
    h.append("Authorization", `Bearer ${token}`);
  }
  if (body && bodyAsJson) {
    h.append("Content-Type", "application/json");
  }
  return h;
}