export function safeJsonParse<T = any>(jsonString: string, defaultValue: T): T {
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

export function safeJsonParseNullable<T = any>(jsonString: string | null | undefined): T | null {
    if (jsonString === null || jsonString === undefined) {
        return null;
    }
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return null;
    }
}

export function safeJsonStringify(value: any, defaultValue = ''): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('Failed to stringify JSON:', error);
    return defaultValue;
  }
}
