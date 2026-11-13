import { BadRequest, Conflict, NotFound, Unauthorized } from "./exception";

export class HttpClient {
  constructor(protected readonly baseUrl: string) {}

  get<T>(uri: string, options: QueryAsOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("GET", uri, options);
  }

  postAs<T>(uri: string, options: QueryPostOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("POST", uri, options);
  }

  putAs<T>(uri: string, options: QueryPostOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("PUT", uri, options);
  }

  patchAs<T>(uri: string, options: QueryPostOptions = {}): Promise<T> {
    return this.fetchAndCheckAs<T>("PATCH", uri, options);
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

  private async fetchAndCheckAs<T>(
    method: MethodType,
    uri: string,
    options: QueryPostOptions = {},
  ): Promise<T> {
    const response = await this.fetchAndCheck(method, uri, options);
    return await response.json();
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

  private async fetchAndCheck(
    method: MethodType,
    uri: string,
    options: QueryPostOptions = {},
  ): Promise<Response> {
    const { body, headers } = options;
    const url = this.formatUrl(uri, options);
    const formattedBody = this.formatBodyAsJsonIfNeeded(body);
    const formattedHeaders = this.headers(body, headers);

    const response = await fetch(url, {
      headers: formattedHeaders,
      method,
      body: formattedBody,
      credentials: "same-origin",
    });

    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    switch (response.status) {
      case 400:
        throw new BadRequest(await response.text());
      case 404:
        throw new NotFound(await response.text());
      case 409:
        throw new Conflict(await response.text());
      case 401:
        throw new Unauthorized();
      default: {
        const message = await response.text();
        throw new Error(message);
      }
    }
  }

  private headers(body?: any, headersInput?: QueryParams | undefined) {
    const h = new Headers();
    const token = this.getToken();
    if (token) {
      h.append("Authorization", `Bearer ${token}`);
    }
    if (!this.isRawBody(body)) {
      h.append("Content-Type", "application/json; charset=utf-8");
    }
    if (!headersInput) {
      return h;
    }
    for (const [k, v] of Object.entries(headersInput)) {
      if (v !== undefined && v !== null) {
        h.append(k, v.toString());
      }
    }
    return h;
  }

  private formatUrl(uri: string, { params }: QueryAsOptions) {
    const url = new URL(uri, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) {
            v.forEach((item) => {
              url.searchParams.append(k, item.toString());
            });
          } else {
            url.searchParams.append(k, v.toString());
          }
        }
      }
    }
    return url.toString();
  }

  private getToken() {
    if (typeof window !== "undefined") {
      return localStorage.getItem("liane.token");
    }
  }

  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("liane.token", token);
    }
  }

  removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("liane.token");
    }
  }
}

type MethodType = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type QueryParams = { [k: string]: any };

export interface QueryAsOptions {
  params?: QueryParams;
  headers?: QueryParams;
}

export interface QueryPostOptions extends QueryAsOptions {
  body?: any;
}
