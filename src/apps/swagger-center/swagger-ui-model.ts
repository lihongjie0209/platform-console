export function swaggerUIAssetURLs(baseURL: string) {
  const origin = new URL(baseURL);
  return {
    stylesheet: new URL('/swagger-assets/swagger-ui.css', origin).toString(),
    bundle: new URL('/swagger-assets/swagger-ui-bundle.js', origin).toString(),
    preset: new URL('/swagger-assets/swagger-ui-standalone-preset.js', origin).toString()
  };
}

export function injectSwaggerAuthorization(headers: Record<string, string>, authorization: string | null) {
  if (authorization) headers.Authorization = authorization;
  return headers;
}
