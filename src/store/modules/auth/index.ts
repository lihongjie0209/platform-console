import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { fetchGetUserInfo, fetchLogin, fetchLogout, fetchVerifyMFAChallenge } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { localStg, sessionStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import { $t } from '@/locales';
import { emptyUserInfo, normalizeUserInfo } from '@/platform/user-profile';
import { revokeCurrentSession } from '@/platform/session-lifecycle';
import { loginTokenFromResult, mfaChallengeFromLogin } from '@/platform/mfa-login';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import { clearAuthStorage, getToken } from './shared';

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const authStore = useAuthStore();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();
  const { loading: logoutLoading, startLoading: startLogoutLoading, endLoading: endLogoutLoading } = useLoading();

  const token = ref(getToken());
  const mfaChallenge = ref<Api.Auth.MFAChallenge | null>(null);

  const userInfo: Api.Auth.UserInfo = reactive(emptyUserInfo());

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;

    return VITE_AUTH_ROUTE_MODE === 'static' && userInfo.roles.includes(VITE_STATIC_SUPER_ROLE);
  });

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** Reset auth store */
  async function resetStore() {
    recordUserId();

    clearAuthStorage();

    authStore.$reset();

    if (!route.meta.constant) {
      await toLogin();
    }

    tabStore.cacheTabs();
    routeStore.resetStore();
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.subject) {
      return;
    }

    // Store current user ID locally for next login comparison
    localStg.set('lastLoginUserId', userInfo.subject);
  }

  /**
   * Check if current login user is different from previous login user If different, clear all tabs
   *
   * @returns {boolean} Whether to clear all tabs
   */
  function checkTabClear(): boolean {
    if (!userInfo.subject) {
      return false;
    }

    const lastLoginUserId = localStg.get('lastLoginUserId');

    // Clear all tabs if current user is different from previous user
    if (lastLoginUserId !== userInfo.subject) {
      localStg.remove('globalTabs');
      tabStore.clearTabs();

      return true;
    }

    return false;
  }

  /**
   * Login
   *
   * @param userName User name
   * @param password Password
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function login(userName: string, password: string, redirect = true) {
    startLoading();
    mfaChallenge.value = null;
    try {
      const { data: result, error } = await fetchLogin(userName, password);
      if (error) {
        await resetStore();
        return;
      }
      const challenge = mfaChallengeFromLogin(result);
      if (challenge) {
        mfaChallenge.value = challenge;
        return;
      }
      const loginToken = loginTokenFromResult(result);
      if (!loginToken) {
        window.$message?.error('登录响应不完整，请稍后重试。');
        return;
      }
      await completeLogin(loginToken, redirect);
    } finally {
      endLoading();
    }
  }

  async function verifyMFA(code: string, recoveryCode: string, redirect = true) {
    if (!mfaChallenge.value) return;
    startLoading();
    try {
      const { data: result, error } = await fetchVerifyMFAChallenge(mfaChallenge.value.token, code, recoveryCode);
      if (error) return;
      const loginToken = loginTokenFromResult(result);
      if (!loginToken) {
        window.$message?.error('MFA 验证响应不完整，请重新登录。');
        mfaChallenge.value = null;
        return;
      }
      mfaChallenge.value = null;
      await completeLogin(loginToken, redirect);
    } finally {
      endLoading();
    }
  }

  function cancelMFA() {
    mfaChallenge.value = null;
  }

  async function completeLogin(loginToken: Api.Auth.LoginToken, redirect: boolean) {
    const pass = await loginByToken(loginToken);
    if (!pass) return;
    const isClear = checkTabClear();
    await redirectFromLogin(isClear ? false : redirect);
    window.$notification?.success({
      title: $t('page.login.common.loginSuccess'),
      message: $t('page.login.common.welcomeBack', { userName: userInfo.subject }),
      duration: 4500
    });
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken) {
    // Tokens stay in session storage so closing the browser ends the console session.
    sessionStg.set('token', loginToken.access_token);
    sessionStg.set('refreshToken', loginToken.refresh_token);

    // 2. get user info
    const pass = await getUserInfo();

    if (pass) {
      token.value = loginToken.access_token;

      return true;
    }

    return false;
  }

  async function getUserInfo() {
    const { data: info, error } = await fetchGetUserInfo();

    if (!error) {
      // update store
      Object.assign(userInfo, normalizeUserInfo(info));

      return true;
    }

    return false;
  }

  async function initUserInfo() {
    const hasToken = getToken();

    if (hasToken) {
      const pass = await getUserInfo();

      if (!pass) {
        resetStore();
      }
    }
  }

  async function logout() {
    startLogoutLoading();
    let revoked: boolean;
    try {
      revoked = await revokeCurrentSession(
        userInfo.session_id,
        async sessionID => {
          const result = await fetchLogout(sessionID);
          return !result.error;
        },
        resetStore
      );
    } finally {
      endLogoutLoading();
    }
    if (!revoked) {
      window.$message?.warning('本地登录状态已清除，但服务端会话撤销失败，请联系管理员处理活跃会话。');
    }
  }

  return {
    token,
    mfaChallenge,
    userInfo,
    isStaticSuper,
    isLogin,
    loginLoading,
    logoutLoading,
    resetStore,
    logout,
    login,
    verifyMFA,
    cancelMFA,
    initUserInfo
  };
});
