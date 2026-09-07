import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { createPrivateKey, sign } from 'node:crypto';

const API_ORIGIN = 'https://public-api.rustore.ru';
const PACKAGE_NAME = 'ru.uletay.app';
const DEFAULT_WHATS_NEW =
  'Исправили аварийное закрытие на Android 15, включили оптимизацию release-сборки и добавили поддержку уведомлений RuStore.';
const DEFAULT_MODERATOR_NOTE =
  '1.0.11 (code 28): исправлен вылет Android 15 из-за Reanimated; используется cubicBezier. Добавлены RuStore Push SDK 6.9.1 и R8/shrinkResources. targetSdk 36. Вход не нужен.';

function getArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function requireArgument(name) {
  const value = getArgument(name);
  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }
  return value;
}

async function readCredentials() {
  const keyId = (
    await readFile(resolve('credentials/rustore-api-key-id.txt'), 'utf8')
  ).trim();
  const privateKeyBase64 = (
    await readFile(resolve('credentials/rustore-api-private-key.base64'), 'utf8')
  ).trim();

  if (!/^\d+$/.test(keyId)) {
    throw new Error('RuStore keyId must contain digits only');
  }

  return {
    keyId,
    privateKey: createPrivateKey({
      key: Buffer.from(privateKeyBase64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    }),
  };
}

async function getPublicToken(credentials) {
  const timestamp = new Date().toISOString();
  const signature = sign(
    'RSA-SHA512',
    Buffer.from(credentials.keyId + timestamp, 'utf8'),
    credentials.privateKey,
  ).toString('base64');
  const response = await fetch(`${API_ORIGIN}/public/auth/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      keyId: credentials.keyId,
      timestamp,
      signature,
    }),
  });
  const result = await response.json();

  if (!response.ok || result.code !== 'OK' || !result.body?.jwe) {
    throw new Error(
      `RuStore authorization failed (${response.status}): ${result.message || result.code}`,
    );
  }

  return result.body.jwe;
}

async function apiRequest(publicToken, pathname, init = {}) {
  const response = await fetch(`${API_ORIGIN}${pathname}`, {
    ...init,
    headers: {
      'Public-Token': publicToken,
      ...init.headers,
    },
  });
  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    result = { code: response.ok ? 'OK' : 'error', message: text };
  }

  if (!response.ok || result.code !== 'OK') {
    throw new Error(
      `RuStore request failed (${response.status} ${pathname}): ${result.message || result.code}`,
    );
  }

  return result;
}

async function main() {
  const apkPath = resolve(requireArgument('apk'));
  const whatsNew = getArgument('whats-new', DEFAULT_WHATS_NEW);
  const moderatorNote = getArgument('moderator-note', DEFAULT_MODERATOR_NOTE);
  const apkStat = await stat(apkPath);

  if (!apkStat.isFile() || !apkPath.toLowerCase().endsWith('.apk')) {
    throw new Error('--apk must point to an APK file');
  }

  const credentials = await readCredentials();
  const publicToken = await getPublicToken(credentials);
  const versionsPath = `/public/v1/application/${PACKAGE_NAME}/version`;
  const versionsBefore = await apiRequest(publicToken, versionsPath);
  const existingDraft = versionsBefore.body?.content?.find(
    (version) => version.versionStatus === 'DRAFT',
  );

  if (existingDraft) {
    throw new Error(
      `RuStore already has draft version ${existingDraft.versionName} (${existingDraft.versionId})`,
    );
  }

  const draft = await apiRequest(publicToken, versionsPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      appName: 'Улетай',
      appType: 'MAIN',
      whatsNew,
      moderInfo: moderatorNote,
      publishType: 'INSTANTLY',
      partialValue: 100,
    }),
  });
  const versionId = draft.body;

  if (!Number.isInteger(versionId)) {
    throw new Error(`RuStore returned an invalid versionId: ${versionId}`);
  }

  const apkData = await readFile(apkPath);
  const form = new FormData();
  form.append(
    'file',
    new Blob([apkData], { type: 'application/vnd.android.package-archive' }),
    basename(apkPath),
  );
  await apiRequest(
    publicToken,
    `/public/v1/application/${PACKAGE_NAME}/version/${versionId}/apk?servicesType=Unknown&isMainApk=true`,
    { method: 'POST', body: form },
  );
  await apiRequest(
    publicToken,
    `/public/v1/application/${PACKAGE_NAME}/version/${versionId}/commit?priorityUpdate=0`,
    { method: 'POST' },
  );

  const versionsAfter = await apiRequest(publicToken, versionsPath);
  const submittedVersion = versionsAfter.body?.content?.find(
    (version) => version.versionId === versionId,
  );

  console.log(
    JSON.stringify(
      {
        versionId,
        versionName: submittedVersion?.versionName,
        versionCode: submittedVersion?.versionCode,
        status: submittedVersion?.versionStatus,
        publishType: submittedVersion?.publishType,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
