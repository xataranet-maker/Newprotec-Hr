#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const target = (process.argv[2] || '').toLowerCase();
const validTargets = new Set(['win', 'mac', 'android', 'ios']);

if (!validTargets.has(target)) {
  console.error('Usage: node scripts/package-app.mjs <win|mac|android|ios>');
  process.exit(1);
}

const ROOT = process.cwd();
const RELEASE_DIR = path.join(ROOT, 'release');
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
  ensurePackages(['electron@^35.0.0', 'electron-builder@^25.1.8']);
  const flag = target === 'win' ? '--win' : '--mac';
  run(`npx electron-builder ${flag} --config electron-builder.json`);
  console.log(`\nDone! Check output files in: ${RELEASE_DIR}`);
} else if (target === 'android') {
  ensurePackages(['@capacitor/core@^7.0.0', '@capacitor/cli@^7.0.0', '@capacitor/android@^7.0.0']);
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
  ensurePackages(['@capacitor/core@^7.0.0', '@capacitor/cli@^7.0.0', '@capacitor/ios@^7.0.0']);
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
