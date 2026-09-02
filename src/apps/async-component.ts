import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import ApplicationLoadError from '@/components/business/application/application-load-error';
import type { ApplicationLoadContext } from '@/platform/application-load-events';
import { createApplicationLoadFailure, reportApplicationLoadFailure } from '@/platform/application-load-events';
import type { ApplicationPageLoader } from './types';
import { shouldRetryApplicationLoad } from './async-load-policy';

export function createApplicationAsyncComponent(
  loader: ApplicationPageLoader,
  context: ApplicationLoadContext
): Component {
  return defineAsyncComponent({
    loader,
    errorComponent: ApplicationLoadError,
    delay: 150,
    timeout: 30_000,
    suspensible: false,
    onError(...args) {
      const [error, retry, fail, attempts] = args;
      const retrying = shouldRetryApplicationLoad(error, attempts);
      reportApplicationLoadFailure(createApplicationLoadFailure({ context, error, attempts, retrying }));
      if (retrying) retry();
      else fail();
    }
  });
}
