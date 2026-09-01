declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      access_token: string;
      refresh_token: string;
      expires_at: string;
      session_id: string;
    }

    interface UserInfo {
      subject: string;
      roles: string[];
      buttons: string[];
    }

    interface ChangePasswordResult {
      changed: boolean;
      revoked_sessions: number;
    }
  }
}
