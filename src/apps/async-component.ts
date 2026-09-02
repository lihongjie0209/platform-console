import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import ApplicationLoadError from '@/components/business/application/application-load-error';
import type { ApplicationPageLoader } from './types';
import { shouldRetryApplicationLoad } from './async-load-policy';

export function createApplicationAsyncComponent(loader: ApplicationPageLoader): Component {
  return defineAsyncComponent({
    loader,
    errorComponent: ApplicationLoadError,
    delay: 150,
    timeout: 30_000,
    suspensible: false,
    onError(...args) {
      const [error, retry, fail, attempts] = args;
      if (shouldRetryApplicationLoad(error, attempts)) retry();
      else fail();
    }
  });
}
