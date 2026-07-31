/**
 * Safe JSON parsing utilities
 */

export function safeJsonParse<T = unknown>(jsonString: string, defaultValue: T): T {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return defaultValue;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return defaultValue;
  }
}

export function safeJsonParseNullable<T = unknown>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) {
    return defaultValue;
  }
  return safeJsonParse(jsonString, defaultValue);
}

export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('Failed to stringify JSON:', error);
    return '{}';
  }
}
