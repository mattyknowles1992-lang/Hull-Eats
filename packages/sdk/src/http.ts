export class ApiRequestError extends Error {
  readonly response: Response;

  constructor(response: Response, message?: string) {
    super(message ?? `Request failed with status ${response.status}`);
    this.name = "ApiRequestError";
    this.response = response;
  }
}

export type ApiJsonOptions = RequestInit & {
  baseUrl: string;
  token?: string;
  fetcher?: typeof fetch;
};

export async function apiJson<T>(path: string, options: ApiJsonOptions): Promise<T> {
  const response = await apiFetch(path, options);
  return (await response.json()) as T;
}

export async function apiFetch(path: string, options: ApiJsonOptions): Promise<Response> {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const fetcher = options.fetcher ?? fetch;
  const { baseUrl: _baseUrl, token, fetcher: _fetcher, ...init } = options;

  const response = await fetcher(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(response);
  }

  return response;
}
