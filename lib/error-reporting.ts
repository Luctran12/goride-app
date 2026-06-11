import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ErrorReportLevel = 'error' | 'warning' | 'info';

type ErrorReportInput = {
  source: string;
  error?: unknown;
  message?: string;
  level?: ErrorReportLevel;
  fatal?: boolean;
  metadata?: Record<string, unknown>;
};

type ErrorReportPayload = {
  app: {
    name?: string;
    version?: string;
    buildVersion?: string;
    platform: typeof Platform.OS;
  };
  event: {
    source: string;
    level: ErrorReportLevel;
    fatal: boolean;
    message: string;
    name?: string;
    stack?: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
  };
};

type ErrorUtilsLike = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

const ERROR_REPORTING_URL = process.env.EXPO_PUBLIC_ERROR_REPORTING_URL?.trim();
const MAX_METADATA_KEYS = 20;
const MAX_TEXT_LENGTH = 4000;

let globalHandlerInstalled = false;
let previousGlobalHandler: ((error: Error, isFatal?: boolean) => void) | undefined;

export function isRemoteErrorReportingEnabled() {
  return Boolean(ERROR_REPORTING_URL);
}

export function installGlobalErrorReporting() {
  if (globalHandlerInstalled) {
    return;
  }

  const errorUtils = getErrorUtils();

  if (!errorUtils?.setGlobalHandler) {
    globalHandlerInstalled = true;
    return;
  }

  previousGlobalHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void reportError({
      error,
      fatal: Boolean(isFatal),
      source: 'global-error-handler',
    });

    previousGlobalHandler?.(error, isFatal);
  });
  globalHandlerInstalled = true;
}

export async function reportError(input: ErrorReportInput) {
  if (!ERROR_REPORTING_URL) {
    return;
  }

  const payload = buildErrorReportPayload(input);

  try {
    await fetch(ERROR_REPORTING_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Reporting must never break the user flow or trigger nested reporting.
  }
}

function buildErrorReportPayload(input: ErrorReportInput): ErrorReportPayload {
  const normalizedError = normalizeError(input.error);
  const message = trimText(input.message ?? normalizedError.message ?? 'Unknown app error');
  const manifest = Constants.expoConfig;

  return {
    app: {
      name: manifest?.name,
      version: manifest?.version,
      buildVersion: Constants.nativeBuildVersion ?? Constants.nativeAppVersion ?? undefined,
      platform: Platform.OS,
    },
    event: {
      source: input.source,
      level: input.level ?? 'error',
      fatal: Boolean(input.fatal),
      message,
      name: normalizedError.name,
      stack: normalizedError.stack ? trimText(normalizedError.stack) : undefined,
      metadata: sanitizeMetadata(input.metadata),
      timestamp: new Date().toISOString(),
    },
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      name: 'Error',
      stack: undefined,
    };
  }

  return {
    message: undefined,
    name: undefined,
    stack: undefined,
  };
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return undefined;
  }

  return Object.entries(metadata)
    .slice(0, MAX_METADATA_KEYS)
    .reduce<Record<string, unknown>>((result, [key, value]) => {
      result[key] = sanitizeMetadataValue(value);
      return result;
    }, {});
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return trimText(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map(sanitizeMetadataValue);
  }

  if (typeof value === 'object' && value !== null) {
    return '[object]';
  }

  return undefined;
}

function trimText(value: string) {
  return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}...` : value;
}

function getErrorUtils() {
  return (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
}
