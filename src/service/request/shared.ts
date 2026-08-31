import { useAuthStore } from '@/store/modules/auth';
import { sessionStg } from '@/utils/storage';
import { fetchRefreshToken } from '../api';
import type { RequestInstanceState } from './type';

let refreshTokenPromise: Promise<boolean> | null = null;

export function getAuthorization() {
  const token = sessionStg.get('token');
  const Authorization = token ? `Bearer ${token}` : null;

  return Authorization;
}

/** refresh token */
async function handleRefreshToken() {
  const { resetStore } = useAuthStore();

  const rToken = sessionStg.get('refreshToken') || '';
  const { error, data } = await fetchRefreshToken(rToken);
  if (!error) {
    sessionStg.set('token', data.access_token);
    sessionStg.set('refreshToken', data.refresh_token);
    return true;
  }

  resetStore();

  return false;
}

export async function handleExpiredRequest() {
  if (!refreshTokenPromise) {
    refreshTokenPromise = handleRefreshToken();
  }

  const success = await refreshTokenPromise;

  setTimeout(() => {
    refreshTokenPromise = null;
  }, 1000);

  return success;
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
