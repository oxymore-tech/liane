import { ResourceNotFoundError, UnauthorizedError, ValidationError } from "@api/exception";
import { FilterQuery, SortOptions } from "@api/filter";

const BaseUrl = "https://liane.gjini.co/api"; // http://192.168.1.66:8081/api

export interface ListOptions<T> {
  readonly filter?: FilterQuery<T>;
  readonly skip?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly sort?: SortOptions<T>;
}

export function getStoredToken() {
  try {
    return localStorage?.getItem("token");
  } catch (e) {
  }
  return null;
}

type MethodType = "GET" | "POST" | "PUT" | "DELETE";

type QueryParams = { [k: string]: any };

export interface QueryAsOptions<T> {
  listOptions?: ListOptions<T>;
  params?: QueryParams;
}

export interface QueryPostOptions<T> extends QueryAsOptions<T> {
  body?: any;
}

function formatUrl<T>(uri: string, {listOptions, params}: QueryAsOptions<T>) {
  const url = new URL(uri, BaseUrl);
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
      url.searchParams.append(k, v.toString());
    }
  }
  return url.toString();
}

export async function get<T>(uri: string, options: QueryAsOptions<T> = {}): Promise<T> {
  return fetchAndCheckAs<T>("GET", formatUrl(uri, options));
}

export async function postAs<T>(uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  return fetchAndCheckAs<T>("POST", formatUrl(uri, options), options.body);
}

export async function remove(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("DELETE", formatUrl(uri, {}));
}

export function post(uri: string, options: QueryPostOptions<any> = {}) {
  return fetchAndCheck("POST", formatUrl(uri, options), options.body);
}

async function fetchAndCheckAs<T>(method: MethodType, uri: string, options: QueryPostOptions<T> = {}): Promise<T> {
  const response = await fetchAndCheck(method, uri, options);
  return response.json();
}

function formatBody(body?: any) {
  if (!body) {
    return null;
  }
  if (body instanceof File) {
    const formData = new FormData();
    formData.append("file", body);
    return formData;
  } else {
    return JSON.stringify(body);
  }
}

async function fetchAndCheck(method: MethodType, uri: string, options: QueryPostOptions<any> = {}) {
  const response = await fetch(formatUrl(uri, options), {
    headers: headers(options.body),
    method,
    body: formatBody(options.body)
  });
  if (response.status != 200 && response.status != 201) {
    switch (response.status) {
      case 400:
        throw new ValidationError(await response.json());
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

function headers(body?: any) {
  const headers = new Headers();
  const token = getStoredToken();
  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }
  if (body) {
    if (!(body instanceof File)) {
      headers.append("Content-Type", "application/json");
    }
  }
  return headers;
}