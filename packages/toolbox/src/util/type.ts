export interface NetworkRequestEvent {
  url?: string;
  method?: string;
  status?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: string | null;
  responseBody?: string | null;
  responseHeaders?: Record<string, string>;
  startTime?: number;
  endTime?: number;
}
