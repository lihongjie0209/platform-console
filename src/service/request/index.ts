import { platformRequest } from './platform';

export { platformRequest };

// Template-only route and system-management examples keep compiling while the
// platform menu is converted to application-service navigation.
export const request = platformRequest('identity');
