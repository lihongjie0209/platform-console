/* eslint-disable no-underscore-dangle */

const requiredServices = [
  'identity',
  'tenant',
  'authorization',
  'application'
] as const satisfies readonly PlatformService[];

export function parseRuntimeConfig(value: unknown): PlatformRuntimeConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('platform runtime configuration is required');
  }
  const config = value as PlatformRuntimeConfig;
  if (!['development', 'testing', 'staging', 'production'].includes(config.environment)) {
    throw new Error('platform runtime configuration has an invalid environment');
  }
  if (!config.services || typeof config.services !== 'object') {
    throw new Error('platform runtime configuration requires services');
  }
  for (const service of requiredServices) {
    const baseURL = config.services[service];
    if (!baseURL) {
      throw new Error(`platform runtime configuration requires ${service} service URL`);
    }
    const parsed = new URL(baseURL);
    if (config.environment === 'production' && parsed.protocol !== 'https:') {
      throw new Error(`production ${service} service URL must use HTTPS`);
    }
  }
  return config;
}

export function getPlatformConfig() {
  return parseRuntimeConfig(window.__PLATFORM_CONFIG__);
}

export function serviceBaseURL(service: PlatformService) {
  const platformConfig = getPlatformConfig();
  const baseURL = platformConfig.services[service];
  if (!baseURL) {
    throw new Error(`service ${service} is not enabled for ${platformConfig.environment}`);
  }
  return baseURL;
}
