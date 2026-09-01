import { getAuthorization } from '@/service/request/shared';
import { serviceBaseURL } from '@/platform/runtime-config';
import { injectSwaggerAuthorization, swaggerUIAssetURLs } from './swagger-ui-model';

interface SwaggerUIRequest {
  headers: Record<string, string>;
}

interface SwaggerUIInstance {
  destroy?: () => void;
}

interface SwaggerUIFactory {
  (options: Record<string, unknown>): SwaggerUIInstance;
  presets: { apis: unknown };
}

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUIFactory;
    SwaggerUIStandalonePreset?: unknown;
  }
}

let assetsPromise: Promise<SwaggerUIFactory> | undefined;

function loadElement<T extends HTMLElement>(element: T, ready: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    if (ready()) {
      resolve();
      return;
    }
    element.addEventListener('load', () => resolve(), { once: true });
    element.addEventListener(
      'error',
      () => reject(new Error(`unable to load ${element.getAttribute('src') || element.getAttribute('href')}`)),
      {
        once: true
      }
    );
    document.head.append(element);
  });
}

export function loadSwaggerUIAssets() {
  if (window.SwaggerUIBundle) return Promise.resolve(window.SwaggerUIBundle);
  if (assetsPromise) return assetsPromise;

  const urls = swaggerUIAssetURLs(serviceBaseURL('swagger'));
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = urls.stylesheet;
  const bundle = document.createElement('script');
  bundle.src = urls.bundle;
  const preset = document.createElement('script');
  preset.src = urls.preset;

  assetsPromise = Promise.all([
    loadElement(stylesheet, () => Boolean(document.querySelector(`link[href="${stylesheet.href}"]`))),
    loadElement(bundle, () => Boolean(window.SwaggerUIBundle)),
    loadElement(preset, () => Boolean(window.SwaggerUIStandalonePreset))
  ]).then(() => {
    if (!window.SwaggerUIBundle) throw new Error('Swagger UI bundle is unavailable');
    return window.SwaggerUIBundle;
  });
  return assetsPromise;
}

export async function renderSwaggerUI(element: HTMLElement, spec: Record<string, unknown>) {
  const factory = await loadSwaggerUIAssets();
  return factory({
    domNode: element,
    spec,
    deepLinking: true,
    displayRequestDuration: true,
    persistAuthorization: true,
    presets: [factory.presets.apis, window.SwaggerUIStandalonePreset],
    layout: 'BaseLayout',
    requestInterceptor(request: SwaggerUIRequest) {
      injectSwaggerAuthorization(request.headers, getAuthorization());
      return request;
    }
  });
}
