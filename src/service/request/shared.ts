import { useAuthStore } from '@/store/modules/auth';
import { sessionStg } from '@/utils/storage';
import { createTokenRefreshCoordinator } from '@/platform/token-refresh';
import { fetchRefreshToken } from '../api';
import type { RequestInstanceState } from './type';

export function getAuthorization() {
  const token = sessionStg.get('token');
  const Authorization = token ? `Bearer ${token}` : null;

  return Authorization;
}

/** refresh token */
async function handleRefreshToken() {
  const authStore = useAuthStore();

  const rToken = sessionStg.get('refreshToken') || '';
  if (!rToken) {
    await authStore.resetStore();
    return false;
  }
  const { error, data } = await fetchRefreshToken(rToken);
  if (!error) {
    sessionStg.set('token', data.access_token);
    sessionStg.set('refreshToken', data.refresh_token);
    authStore.token = data.access_token;
    return true;
  }

  await authStore.resetStore();

  return false;
}

export const handleExpiredRequest = createTokenRefreshCoordinator(handleRefreshToken);

export async function resetAuthentication() {
  await useAuthStore().resetStore();
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error({
      message,
      onClose: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
