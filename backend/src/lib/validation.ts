export class RequestValidationError extends Error {
  statusCode: number;
  errors?: Record<string, string>;

  constructor(message: string, statusCode = 400, errors?: Record<string, string>) {
    super(message);
    this.name = 'RequestValidationError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export function isRequestValidationError(error: unknown): error is RequestValidationError {
  return error instanceof RequestValidationError;
}

export function requireTrimmedString(value: unknown, fieldName: string) {
  const text = String(value || '').trim();
  if (!text) {
    throw new RequestValidationError(`${fieldName} is required`);
  }
  return text;
}

export function optionalTrimmedString(value: unknown, fallback = '') {
  return String(value || '').trim() || fallback;
}

export function optionalNullableTrimmedString(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

export function requireFiniteNumber(value: unknown, fieldName: string, options?: { min?: number; max?: number }) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new RequestValidationError(`${fieldName} must be a valid number`);
  }
  if (options?.min !== undefined && numberValue < options.min) {
    throw new RequestValidationError(`${fieldName} must be greater than or equal to ${options.min}`);
  }
  if (options?.max !== undefined && numberValue > options.max) {
    throw new RequestValidationError(`${fieldName} must be less than or equal to ${options.max}`);
  }
  return numberValue;
}

export function optionalFiniteNumber(value: unknown, fallback = 0, options?: { min?: number; max?: number }) {
  if (value === undefined || value === null || value === '') return fallback;
  return requireFiniteNumber(value, 'value', options);
}

export function requireStringArray(value: unknown, fieldName: string, options?: { minLength?: number }) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if ((options?.minLength || 0) > items.length) {
    throw new RequestValidationError(`${fieldName} is required`);
  }
  return items;
}

export function normalizeBoolean(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return Boolean(value);
}

export function assertCondition(condition: unknown, message: string, statusCode = 400) {
  if (!condition) {
    throw new RequestValidationError(message, statusCode);
  }
}
