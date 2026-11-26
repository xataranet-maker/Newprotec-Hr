export const INSTALLER_LINKS_STORAGE_KEY = 'app_installer_download_links';

export interface InstallerDownloadLinks {
  windowsUrl: string;
  androidUrl: string;
  macosUrl: string;
  iosUrl: string;
  releaseVersion?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export function sanitizeDownloadUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const proto = parsed.protocol.toLowerCase();
    if (proto !== 'https:' && proto !== 'http:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

export function getEnvDefaultInstallerLinks(): InstallerDownloadLinks {
  const version = String(import.meta.env.VITE_APP_RELEASE_VERSION || '').trim();
  return {
    windowsUrl: sanitizeDownloadUrl(import.meta.env.VITE_DOWNLOAD_WINDOWS_URL || ''),
    androidUrl: sanitizeDownloadUrl(import.meta.env.VITE_DOWNLOAD_ANDROID_URL || ''),
    macosUrl: sanitizeDownloadUrl(import.meta.env.VITE_DOWNLOAD_MACOS_URL || ''),
    iosUrl: sanitizeDownloadUrl(import.meta.env.VITE_DOWNLOAD_IOS_URL || ''),
    ...(version ? { releaseVersion: version } : {}),
  };
}

export function normalizeInstallerLinks(raw: unknown): InstallerDownloadLinks {
  const defaults = getEnvDefaultInstallerLinks();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  const windowsUrl =
    typeof obj.windowsUrl === 'string' ? sanitizeDownloadUrl(obj.windowsUrl) : defaults.windowsUrl;
  const androidUrl =
    typeof obj.androidUrl === 'string' ? sanitizeDownloadUrl(obj.androidUrl) : defaults.androidUrl;
  const macosUrl =
    typeof obj.macosUrl === 'string' ? sanitizeDownloadUrl(obj.macosUrl) : defaults.macosUrl;
  const iosUrl =
    typeof obj.iosUrl === 'string' ? sanitizeDownloadUrl(obj.iosUrl) : defaults.iosUrl;
  const releaseVersion =
    typeof obj.releaseVersion === 'string' && obj.releaseVersion.trim()
      ? obj.releaseVersion.trim().slice(0, 32)
      : defaults.releaseVersion;
  const updatedAt = typeof obj.updatedAt === 'string' && obj.updatedAt.trim() ? obj.updatedAt : undefined;
  const updatedBy = typeof obj.updatedBy === 'string' && obj.updatedBy.trim() ? obj.updatedBy : undefined;

  return {
    windowsUrl,
    androidUrl,
    macosUrl,
    iosUrl,
    ...(releaseVersion ? { releaseVersion } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(updatedBy ? { updatedBy } : {}),
  };
}

export function hasAnyInstallerLink(links?: InstallerDownloadLinks | null): boolean {
  if (!links) return false;
  return Boolean(
    sanitizeDownloadUrl(links.windowsUrl) ||
      sanitizeDownloadUrl(links.androidUrl) ||
      sanitizeDownloadUrl(links.macosUrl) ||
      sanitizeDownloadUrl(links.iosUrl)
  );
}

/**
 * Generates direct GitHub Releases latest download URLs matching
 * `.github/workflows/build-installers.yml` from either `owner/repo`
 * or `https://github.com/owner/repo`.
 */
export function buildGithubReleaseShortcutUrls(repoInput: string): InstallerDownloadLinks | null {
  const trimmed = (repoInput || '').trim();
  if (!trimmed) return null;

  let ownerRepo = '';
  const urlMatch = trimmed.match(/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i);
  if (urlMatch) {
    ownerRepo = urlMatch[1].replace(/\.git$/i, '');
  } else if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    ownerRepo = trimmed.replace(/\.git$/i, '');
  }

  if (!ownerRepo) return null;

  const base = `https://github.com/${ownerRepo}/releases/latest/download`;
  return {
    windowsUrl: `${base}/Newprotec-Vina-HRM-Windows-Installer.zip`,
    androidUrl: `${base}/Newprotec-Vina-HRM-Android-APK.zip`,
    macosUrl: `${base}/Newprotec-Vina-HRM-macOS-Installer.zip`,
    iosUrl: `${base}/Newprotec-Vina-HRM-iOS-Package.zip`,
  };
}
