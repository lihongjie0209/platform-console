import type { AxiosResponse } from 'axios';
import { BACKEND_ERROR_CODE, createFlatRequest } from '@sa/axios';
import { PlatformErrorCode, isAuthenticationFailure } from '@/platform/error-code';
import { serviceBaseURL } from '@/platform/runtime-config';
import { authenticationFailureAction } from '@/platform/token-refresh';
import type { AuthenticationRetryState } from '@/platform/token-refresh';
import { getAuthorization, handleExpiredRequest, resetAuthentication, showErrorMsg } from './shared';
import type { RequestInstanceState } from './type';

export interface PlatformResponse<T> {
  code: number;
  message: string;
  body: T;
  request_id?: string;
}

const clients = new Map<PlatformService, ReturnType<typeof createPlatformClient>>();

function createPlatformClient(service: PlatformService) {
  return createFlatRequest<PlatformResponse<unknown>, unknown, RequestInstanceState>(
    { baseURL: serviceBaseURL(service) },
    {
      defaultState: { errMsgStack: [] },
      transform(response: AxiosResponse<PlatformResponse<unknown>>) {
        return response.data.body;
      },
      async onRequest(config) {
        const authorization = getAuthorization();
        if (authorization) {
          config.headers.set('Authorization', authorization);
        }
        if (
          config.method &&
          !['get', 'head', 'options'].includes(config.method.toLowerCase()) &&
          !config.headers.has('Idempotency-Key')
        ) {
          config.headers.set('Idempotency-Key', crypto.randomUUID());
        }
        return config;
      },
      isBackendSuccess(response) {
        return response.data.code === PlatformErrorCode.ok;
      },
      async onBackendFail(response, instance) {
        const retryState = response.config as typeof response.config & AuthenticationRetryState;
        if (isAuthenticationFailure(response.data.code)) {
          const action = authenticationFailureAction(
            retryState,
            service === 'identity' && Boolean(response.config.url?.endsWith('/auth/refresh'))
          );
          if (action === 'reset') {
            await resetAuthentication();
            return null;
          }
          if (action === 'ignore') return null;
          const refreshed = await handleExpiredRequest();
          if (refreshed) {
            const authorization = getAuthorization();
            if (authorization) {
              response.config.headers.set('Authorization', authorization);
            }
            return instance.request(response.config) as Promise<AxiosResponse>;
          }
        }
        return null;
      },
      onError(error) {
        const message =
          error.code === BACKEND_ERROR_CODE ? error.response?.data?.message || error.message : error.message;
        showErrorMsg(
          clients.get(service)?.state || {
            errMsgStack: []
          },
          message
        );
      }
    }
  );
}

export function platformRequest(service: PlatformService) {
  let client = clients.get(service);
  if (!client) {
    client = createPlatformClient(service);
    clients.set(service, client);
  }
  return client;
}
