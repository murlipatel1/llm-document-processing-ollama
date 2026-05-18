export function createSSE(url: string) {
  return new EventSource(url);
}
