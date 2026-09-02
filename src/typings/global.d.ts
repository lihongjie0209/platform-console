export {};

declare global {
  export interface Window {
    /** NProgress instance */
    NProgress?: import('nprogress').NProgress;
    /** MessageBox instance */
    $messageBox?: import('element-plus').IElMessageBox;
    /** Message instance */
    $message?: import('element-plus').Message;
    /** Notification instance */
    $notification?: import('element-plus').Notify;
  }

  /** Build time of the project */
  export const BUILD_TIME: string;
  /** Package version embedded in the frontend bundle */
  export const APP_VERSION: string;
  /** Source revision embedded in the frontend bundle */
  export const GIT_COMMIT: string;
}
