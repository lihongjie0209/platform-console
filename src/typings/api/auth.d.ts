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

    interface LoginResult extends Partial<LoginToken> {
      mfa_required: boolean;
      mfa_challenge_token?: string;
      mfa_challenge_expires_at?: string;
    }

    interface MFAChallenge {
      token: string;
      expiresAt: string;
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
      client_ip: string;
      user_agent: string;
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

    interface MFAStatus {
      available: boolean;
      enabled: boolean;
      status: string;
      recovery_codes_remaining: number;
      version: number;
      enabled_at?: string;
    }

    interface MFASetup {
      secret: string;
      uri: string;
      version: number;
      expires_at: string;
    }

    interface MFAConfirmation {
      recovery_codes: string[];
      revoked_sessions: number;
      version: number;
    }

    interface MFARecoveryRotation {
      recovery_codes: string[];
      version: number;
    }

    interface MFADisableResult {
      disabled: boolean;
      revoked_sessions: number;
    }
  }
}
