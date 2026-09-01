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
      subject_type: string;
      session_id: string;
      tenant_id: string;
      membership_id: string;
      username: string;
      display_name: string;
      email: string;
      phone: string;
      status: string;
      roles: string[];
      buttons: string[];
    }

    interface ChangePasswordResult {
      changed: boolean;
      revoked_sessions: number;
    }

    interface LogoutResult {
      revoked: boolean;
    }

    interface Session {
      session_id: string;
      user_id: string;
      tenant_id: string;
      membership_id: string;
      status: string;
      expires_at: string;
      revoked_at?: string;
      revoke_reason?: string;
      last_used_at: string;
      version: number;
      created_at: string;
      updated_at: string;
    }

    interface SessionPage {
      items: Session[];
      total: number;
      page: number;
      page_size: number;
    }
  }
}
