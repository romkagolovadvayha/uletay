import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSafePushPath } from './pushNavigation';

type RuStoreRemoteMessage = {
  data?: Record<string, string>;
  notification?: {
    clickAction?: string;
  };
};

type RuStoreTokenEvent = {
  token?: string;
};

type RemovableSubscription = { remove: () => void };
type RuStorePushModule = {
  default: {
    createPushEmitter: () => void;
    getToken: () => Promise<string>;
    deleteToken: () => Promise<boolean>;
    checkPushAvailability: () => Promise<boolean | string>;
    getInitialNotification: () => Promise<RuStoreRemoteMessage | null>;
  };
  eventEmitter: {
    addListener: (
      eventName: string,
      listener: (event: never) => void,
    ) => RemovableSubscription;
  };
  PushEvents: {
    ON_NEW_TOKEN: string;
    ON_OPENED: string;
  };
};

let modulePromise: Promise<RuStorePushModule> | null = null;
let emitterPromise: Promise<RuStorePushModule> | null = null;

export function isRuStorePushBuild(): boolean {
  return (
    Platform.OS === 'android' &&
    typeof Constants.expoConfig?.extra?.rustorePushProjectId === 'string' &&
    Constants.expoConfig.extra.rustorePushProjectId.length > 0
  );
}

function loadRuStorePushModule(): Promise<RuStorePushModule> {
  // The official Git dependency ships TypeScript sources without its declared lib output.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  modulePromise ??= Promise.resolve(require('react-native-rustore-push/src/index'));
  return modulePromise;
}

async function getRuStorePushEmitter(): Promise<RuStorePushModule> {
  emitterPromise ??= loadRuStorePushModule().then((module) => {
    module.default.createPushEmitter();
    return module;
  });
  return emitterPromise;
}

function pathFromClickAction(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'uletay:') {
      return null;
    }
    return getSafePushPath(`${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}

function getMessagePath(message: RuStoreRemoteMessage | null | undefined): string | null {
  return (
    getSafePushPath(message?.data?.url) ||
    pathFromClickAction(message?.notification?.clickAction)
  );
}

export async function getRuStorePushToken(): Promise<string> {
  if (!isRuStorePushBuild()) {
    throw new Error('RuStore Push не настроен для этой сборки');
  }
  const module = await getRuStorePushEmitter();
  const availability = await module.default.checkPushAvailability();
  if (availability !== true) {
    throw new Error(
      typeof availability === 'string'
        ? availability
        : 'RuStore Push недоступен на этом устройстве',
    );
  }
  return module.default.getToken();
}

export async function deleteRuStorePushToken(): Promise<void> {
  if (!isRuStorePushBuild()) {
    return;
  }
  const module = await loadRuStorePushModule();
  await module.default.deleteToken();
}

export function addRuStorePushTokenListener(
  listener: (token: string) => void,
): RemovableSubscription | null {
  if (!isRuStorePushBuild()) {
    return null;
  }

  let removed = false;
  let subscription: RemovableSubscription | null = null;
  void getRuStorePushEmitter().then((module) => {
    if (removed) {
      return;
    }
    subscription = module.eventEmitter.addListener(
      module.PushEvents.ON_NEW_TOKEN,
      ((event: RuStoreTokenEvent) => {
        const token = event?.token?.trim();
        if (token) {
          listener(token);
        }
      }) as (event: never) => void,
    );
  }).catch(() => undefined);

  return {
    remove() {
      removed = true;
      subscription?.remove();
    },
  };
}

export async function getInitialRuStorePushPath(): Promise<string | null> {
  if (!isRuStorePushBuild()) {
    return null;
  }
  try {
    const module = await getRuStorePushEmitter();
    const message = (await module.default.getInitialNotification()) as RuStoreRemoteMessage | null;
    return getMessagePath(message);
  } catch {
    return null;
  }
}

export function addRuStorePushOpenedListener(
  listener: (path: string) => void,
): RemovableSubscription | null {
  if (!isRuStorePushBuild()) {
    return null;
  }

  let removed = false;
  let subscription: RemovableSubscription | null = null;
  void getRuStorePushEmitter().then((module) => {
    if (removed) {
      return;
    }
    subscription = module.eventEmitter.addListener(
      module.PushEvents.ON_OPENED,
      ((message: RuStoreRemoteMessage) => {
        const path = getMessagePath(message);
        if (path) {
          listener(path);
        }
      }) as (event: never) => void,
    );
  }).catch(() => undefined);

  return {
    remove() {
      removed = true;
      subscription?.remove();
    },
  };
}
