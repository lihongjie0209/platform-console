type PlatformService =
  | 'identity'
  | 'tenant'
  | 'authorization'
  | 'application'
  | 'audit'
  | 'config'
  | 'notification'
  | 'file'
  | 'scheduler'
  | 'dictionary'
  | 'service-registry'
  | 'workflow'
  | 'search'
  | 'metering'
  | 'billing'
  | 'rule'
  | 'data-export'
  | 'import'
  | 'webhook'
  | 'swagger';

interface PlatformRuntimeConfig {
  environment: 'development' | 'testing' | 'staging' | 'production';
  services: Partial<Record<PlatformService, string>>;
}

interface Window {
  __PLATFORM_CONFIG__?: PlatformRuntimeConfig;
}
