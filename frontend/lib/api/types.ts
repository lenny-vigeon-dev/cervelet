/**
 * API types and interfaces for requests and responses.
 */

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Primitive = string | number | boolean;

export type ApiQueryValue = Primitive | Primitive[] | undefined;

export interface ApiRequestOptions extends RequestInit {
  method?: ApiMethod;
  query?: Record<string, ApiQueryValue>;
  parseAs?: "json" | "text" | "void";
}

export interface EventStreamOptions {
  query?: Record<string, ApiQueryValue>;
  withCredentials?: boolean;
}
