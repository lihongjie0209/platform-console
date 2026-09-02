export interface ConsoleBuildInfo {
  version: string;
  gitCommit: string;
  buildTime: string;
}

export const consoleBuildInfo: Readonly<ConsoleBuildInfo> = Object.freeze({
  version: typeof APP_VERSION === 'undefined' ? 'dev' : APP_VERSION,
  gitCommit: typeof GIT_COMMIT === 'undefined' ? 'unknown' : GIT_COMMIT,
  buildTime: typeof BUILD_TIME === 'undefined' ? '' : BUILD_TIME
});

export function formatConsoleBuild(info: ConsoleBuildInfo) {
  const commit = info.gitCommit === 'unknown' ? info.gitCommit : info.gitCommit.slice(0, 12);
  return `v${info.version} (${commit})`;
}
