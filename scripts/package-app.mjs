#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const target = (process.argv[2] || '').toLowerCase();
const validTargets = new Set(['win', 'mac', 'android', 'ios']);

if (!validTargets.has(target)) {
  console.error('Usage: node scripts/package-app.mjs <win|mac|android|ios>');
  process.exit(1);
}

const ROOT = process.cwd();
const RELEASE_DIR = path.join(ROOT, 'release');
const ELECTRON_APP_DIR = path.join(ROOT, 'dist-electron-app');
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

function run(cmd, cwd = ROOT) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

function hasNodePackage(pkgName) {
  return fs.existsSync(path.join(ROOT, 'node_modules', ...pkgName.split('/')));
}

function ensurePackages(pkgs) {
  const missing = pkgs.filter((pkgSpec) => {
    const atIndex = pkgSpec.lastIndexOf('@');
    const name = atIndex > 0 ? pkgSpec.slice(0, atIndex) : pkgSpec;
    return !hasNodePackage(name);
  });
  if (missing.length > 0) {
    console.log(`Installing packaging tools (--no-save): ${missing.join(', ')}`);
    run(`npm install --no-save --no-audit --no-fund --legacy-peer-deps ${missing.join(' ')}`);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getAppVersion() {
  try {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (rootPkg.version && rootPkg.version !== '0.0.0') return rootPkg.version;
  } catch {
    // fallback below
  }
  return '2.1.0';
}

function prepareElectronAppDir() {
  fs.rmSync(ELECTRON_APP_DIR, { recursive: true, force: true });
  fs.mkdirSync(ELECTRON_APP_DIR, { recursive: true });

  const distDest = path.join(ELECTRON_APP_DIR, 'dist');
  fs.cpSync(path.join(ROOT, 'dist'), distDest, { recursive: true });

  // Exclude chat upload screenshots from desktop bundle to keep installer lightweight
  const uploadScreenshotsDir = path.join(distDest, 'assets', 'aistudio');
  if (fs.existsSync(uploadScreenshotsDir)) {
    fs.rmSync(uploadScreenshotsDir, { recursive: true, force: true });
  }

  fs.copyFileSync(path.join(ROOT, 'electron', 'main.cjs'), path.join(ELECTRON_APP_DIR, 'main.cjs'));
  fs.copyFileSync(path.join(ROOT, 'public', 'pwa-512x512.png'), path.join(ELECTRON_APP_DIR, 'icon.png'));

  const appPkg = {
    name: 'newprotec-vina-hrm',
    version: getAppVersion(),
    description: 'Hệ thống quản lý nhân sự & sản xuất Newprotec Vina HRM',
    author: 'Newprotec Vina',
    main: 'main.cjs',
  };
  fs.writeFileSync(path.join(ELECTRON_APP_DIR, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf8');
  return appPkg;
}

async function generateDesktopIcons() {
  const png2iconsMod = await import('png2icons');
  const png2icons = png2iconsMod.default || png2iconsMod;
  const pngBuffer = fs.readFileSync(path.join(ELECTRON_APP_DIR, 'icon.png'));

  const icoBuffer = png2icons.createICO(pngBuffer, png2icons.BICUBIC2, 0, false, true);
  if (icoBuffer) {
    fs.writeFileSync(path.join(ELECTRON_APP_DIR, 'icon.ico'), icoBuffer);
  }

  const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BICUBIC2, 0);
  if (icnsBuffer) {
    fs.writeFileSync(path.join(ELECTRON_APP_DIR, 'icon.icns'), icnsBuffer);
  }
}

function findMakensis() {
  const candidates = [
    'makensis',
    'C:\\Program Files (x86)\\NSIS\\makensis.exe',
    'C:\\Program Files\\NSIS\\makensis.exe',
  ];
  for (const bin of candidates) {
    try {
      if (bin.includes('\\') && !fs.existsSync(bin)) continue;
      execSync(`"${bin}" /VERSION`, { stdio: 'ignore' });
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

function patchAndroidProject() {
  const manifestPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    const perms = [
      'android.permission.CAMERA',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ];
    for (const perm of perms) {
      if (!manifest.includes(perm)) {
        manifest = manifest.replace(
          '<application',
          `    <uses-permission android:name="${perm}" />\n\n    <application`
        );
      }
    }
    fs.writeFileSync(manifestPath, manifest, 'utf8');
  }

  const iconSrc = path.join(ROOT, 'public', 'pwa-512x512.png');
  const resDir = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(iconSrc) && fs.existsSync(resDir)) {
    for (const entry of fs.readdirSync(resDir)) {
      if (entry.startsWith('mipmap-')) {
        const mipmapDir = path.join(resDir, entry);
        for (const iconName of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
          const dest = path.join(mipmapDir, iconName);
          if (fs.existsSync(dest)) {
            fs.copyFileSync(iconSrc, dest);
          }
        }
      }
    }
  }
}

function patchIosProject() {
  const plistPath = path.join(ROOT, 'ios', 'App', 'App', 'Info.plist');
  if (fs.existsSync(plistPath)) {
    let plist = fs.readFileSync(plistPath, 'utf8');
    const entries = [
      ['NSCameraUsageDescription', 'Newprotec Vina HRM cần quyền Camera để quét mã QR chấm công và xác thực khuôn mặt.'],
      ['NSMicrophoneUsageDescription', 'Newprotec Vina HRM có thể sử dụng micro khi quay hoặc quét thiết bị.'],
      ['NSPhotoLibraryAddUsageDescription', 'Lưu ảnh thẻ nhân viên và tài liệu chấm công.'],
    ];
    for (const [key, value] of entries) {
      if (!plist.includes(`<key>${key}</key>`)) {
        plist = plist.replace(
          '</dict>',
          `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>`
        );
      }
    }
    fs.writeFileSync(plistPath, plist, 'utf8');
  }

  const iconSrc = path.join(ROOT, 'public', 'pwa-512x512.png');
  const iosIconDest = path.join(
    ROOT,
    'ios',
    'App',
    'App',
    'Assets.xcassets',
    'AppIcon.appiconset',
    'AppIcon-512@2x.png'
  );
  if (IS_MAC && fs.existsSync(iconSrc) && fs.existsSync(path.dirname(iosIconDest))) {
    try {
      run(`sips -z 1024 1024 "${iconSrc}" --out "${iosIconDest}"`);
    } catch {
      if (fs.existsSync(iosIconDest)) {
        fs.copyFileSync(iconSrc, iosIconDest);
      }
    }
  }
}

console.log(`\n=== Packaging Newprotec Vina HRM for target: ${target.toUpperCase()} ===`);
ensureDir(RELEASE_DIR);

// 1. Build fresh Web/PWA bundle (works identically on browser + packaged shell)
run('npm run build');

if (target === 'win' || target === 'mac') {
  ensurePackages(['electron', '@electron/packager', 'png2icons']);
  const appPkg = prepareElectronAppDir();
  await generateDesktopIcons();

  const electronPkg = require(path.join(ROOT, 'node_modules', 'electron', 'package.json'));
  const packagerMod = await import('@electron/packager');
  const packager = packagerMod.packager || packagerMod.default || packagerMod;

  if (target === 'win') {
    const icoPath = path.join(ELECTRON_APP_DIR, 'icon.ico');
    const commonOpts = {
      dir: ELECTRON_APP_DIR,
      out: RELEASE_DIR,
      name: 'Newprotec Vina HRM',
      appVersion: appPkg.version,
      platform: 'win32',
      arch: 'x64',
      electronVersion: electronPkg.version,
      asar: true,
      overwrite: true,
      quiet: false,
    };

    let appPaths;
    try {
      appPaths = await packager({
        ...commonOpts,
        icon: fs.existsSync(icoPath) ? icoPath : undefined,
        win32metadata: {
          CompanyName: 'Newprotec Vina',
          ProductName: 'Newprotec Vina HRM',
          FileDescription: 'Newprotec Vina HRM Desktop Application',
        },
      });
    } catch (err) {
      console.warn('Packaging with win32metadata/icon failed, retrying clean win32 package:', err?.message || err);
      appPaths = await packager(commonOpts);
    }

    const winAppDir = appPaths[0];
    console.log('Packaged Windows app at:', winAppDir);

    const makensis = findMakensis();
    if (makensis) {
      const nsiFile = path.join(ROOT, 'electron', 'installer.nsi');
      const setupOut = path.join(RELEASE_DIR, `Newprotec-Vina-HRM-Setup-${appPkg.version}-win-x64.exe`);
      const iconFlag = fs.existsSync(icoPath) ? `/DICON_FILE="${icoPath}"` : '';
      run(`"${makensis}" /DAPP_VERSION="${appPkg.version}" /DSOURCE_DIR="${winAppDir}" /DOUT_FILE="${setupOut}" ${iconFlag} "${nsiFile}"`);
      console.log('Windows Setup Installer created at:', setupOut);
    } else {
      console.log('NSIS (makensis) not found; portable Windows application folder is ready in:', winAppDir);
    }
  } else {
    const icnsPath = path.join(ELECTRON_APP_DIR, 'icon.icns');
    const appPaths = await packager({
      dir: ELECTRON_APP_DIR,
      out: RELEASE_DIR,
      name: 'Newprotec Vina HRM',
      appVersion: appPkg.version,
      appBundleId: 'com.newprotecvina.hrm',
      appCategoryType: 'public.app-category.business',
      platform: 'darwin',
      arch: ['arm64', 'x64'],
      electronVersion: electronPkg.version,
      asar: true,
      overwrite: true,
      icon: fs.existsSync(icnsPath) ? icnsPath : undefined,
      quiet: false,
    });

    for (const outDir of appPaths) {
      const archLabel = outDir.includes('arm64') ? 'arm64' : 'x64';
      const appBundles = fs.readdirSync(outDir).filter((f) => f.endsWith('.app'));
      if (appBundles.length === 0) continue;
      const appBundlePath = path.join(outDir, appBundles[0]);

      if (IS_MAC) {
        try {
          run(`codesign --force --deep --sign - "${appBundlePath}"`);
        } catch (err) {
          console.warn(`Ad-hoc codesign skipped for ${archLabel}:`, err?.message || err);
        }

        const zipOut = path.join(RELEASE_DIR, `Newprotec-Vina-HRM-${appPkg.version}-mac-${archLabel}.zip`);
        if (fs.existsSync(zipOut)) fs.unlinkSync(zipOut);
        run(`ditto -c -k --sequesterRsrc --keepParent "${appBundlePath}" "${zipOut}"`);

        const dmgStage = path.join(RELEASE_DIR, `dmg-stage-${archLabel}`);
        fs.rmSync(dmgStage, { recursive: true, force: true });
        fs.mkdirSync(dmgStage, { recursive: true });
        run(`cp -R "${appBundlePath}" "${path.join(dmgStage, appBundles[0])}"`);
        run(`ln -s /Applications "${path.join(dmgStage, 'Applications')}"`);

        const dmgOut = path.join(RELEASE_DIR, `Newprotec-Vina-HRM-${appPkg.version}-mac-${archLabel}.dmg`);
        if (fs.existsSync(dmgOut)) fs.unlinkSync(dmgOut);
        try {
          run(`hdiutil create -volname "Newprotec Vina HRM" -srcfolder "${dmgStage}" -ov -format UDZO "${dmgOut}"`);
        } catch (err) {
          console.warn(`DMG creation skipped for ${archLabel} (.zip is still available):`, err?.message || err);
        } finally {
          fs.rmSync(dmgStage, { recursive: true, force: true });
        }
      }
    }
  }
  console.log(`\nDone! Check output files in: ${RELEASE_DIR}`);
} else if (target === 'android') {
  ensurePackages(['@capacitor/core@7', '@capacitor/cli@7', '@capacitor/android@7']);
  if (!fs.existsSync(path.join(ROOT, 'android'))) {
    run('npx cap add android');
  }
  patchAndroidProject();
  run('npx cap sync android');

  const androidDir = path.join(ROOT, 'android');
  const gradlew = IS_WIN ? 'gradlew.bat' : './gradlew';
  if (!IS_WIN && fs.existsSync(path.join(androidDir, 'gradlew'))) {
    fs.chmodSync(path.join(androidDir, 'gradlew'), 0o755);
  }
  run(`${gradlew} assembleDebug --no-daemon`, androidDir);

  const apkSrc = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (fs.existsSync(apkSrc)) {
    const apkOut = path.join(RELEASE_DIR, 'Newprotec-Vina-HRM-Android.apk');
    fs.copyFileSync(apkSrc, apkOut);
    console.log(`\nDone! Android APK created at: ${apkOut}`);
  } else {
    throw new Error('Gradle build completed, but APK was not found at expected debug output path.');
  }
} else if (target === 'ios') {
  ensurePackages(['@capacitor/core@7', '@capacitor/cli@7', '@capacitor/ios@7']);
  if (!fs.existsSync(path.join(ROOT, 'ios'))) {
    run('npx cap add ios');
  }
  patchIosProject();
  run('npx cap sync ios');

  if (!IS_MAC) {
    console.log('\niOS Xcode project synced into ./ios.');
    console.log('To generate an .ipa, open ./ios/App in macOS Xcode or run the GitHub Actions workflow.');
  } else {
    const iosAppDir = path.join(ROOT, 'ios', 'App');
    const archivePath = path.join(RELEASE_DIR, 'Newprotec-Vina-HRM-iOS.xcarchive');
    if (fs.existsSync(archivePath)) {
      fs.rmSync(archivePath, { recursive: true, force: true });
    }
    const workspaceArg = fs.existsSync(path.join(iosAppDir, 'App.xcworkspace'))
      ? '-workspace App.xcworkspace'
      : '-project App.xcodeproj';

    run(
      `xcodebuild ${workspaceArg} -scheme App -configuration Release -sdk iphoneos -destination "generic/platform=iOS" -archivePath "${archivePath}" archive CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""`,
      iosAppDir
    );

    const appBundle = path.join(archivePath, 'Products', 'Applications', 'App.app');
    if (fs.existsSync(appBundle)) {
      const payloadTmp = path.join(RELEASE_DIR, 'ios-payload-tmp');
      const payloadDir = path.join(payloadTmp, 'Payload');
      fs.rmSync(payloadTmp, { recursive: true, force: true });
      fs.mkdirSync(payloadDir, { recursive: true });
      run(`cp -R "${appBundle}" "${payloadDir}/App.app"`);
      const ipaOut = path.join(RELEASE_DIR, 'Newprotec-Vina-HRM-iOS-unsigned.ipa');
      if (fs.existsSync(ipaOut)) fs.unlinkSync(ipaOut);
      run(`zip -r -y "${ipaOut}" Payload`, payloadTmp);
      fs.rmSync(payloadTmp, { recursive: true, force: true });
      console.log(`\nDone! Unsigned iOS IPA created at: ${ipaOut}`);
    } else {
      throw new Error('Xcode archive completed, but App.app was not found inside xcarchive.');
    }
  }
}
