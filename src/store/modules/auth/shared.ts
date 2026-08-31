import { sessionStg } from '@/utils/storage';

/** Get token */
export function getToken() {
  return sessionStg.get('token') || '';
}

/** Clear auth storage */
export function clearAuthStorage() {
  sessionStg.remove('token');
  sessionStg.remove('refreshToken');
}
