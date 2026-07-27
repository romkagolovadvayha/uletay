import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const appJson = JSON.parse(
  readFileSync(path.join(projectRoot, 'app.json'), 'utf8'),
);
const expectedPackage = appJson.expo?.android?.package;
const configuredPath =
  process.env.GOOGLE_SERVICES_FILE || './google-services.json';
const absolutePath = path.resolve(projectRoot, configuredPath);

function fail(message) {
  console.error(`Android Push: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(absolutePath)) {
  fail(
    `не найден ${configuredPath}. Скачайте google-services.json для пакета ` +
      `${expectedPackage} из Firebase Console и поместите файл в корень проекта.`,
  );
} else {
  try {
    const firebase = JSON.parse(readFileSync(absolutePath, 'utf8'));
    const clients = Array.isArray(firebase.client) ? firebase.client : [];
    const matchingClient = clients.find(
      (client) =>
        client?.client_info?.android_client_info?.package_name ===
        expectedPackage,
    );

    if (!firebase.project_info?.project_id) {
      fail('в google-services.json отсутствует project_info.project_id.');
    } else if (!matchingClient) {
      fail(
        `google-services.json не содержит Android-клиент для ${expectedPackage}.`,
      );
    } else if (!matchingClient.client_info?.mobilesdk_app_id) {
      fail('в google-services.json отсутствует mobilesdk_app_id.');
    } else {
      console.log(
        `Android Push config: OK (${expectedPackage}, Firebase ${firebase.project_info.project_id})`,
      );
    }
  } catch (error) {
    fail(
      `не удалось прочитать google-services.json: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
