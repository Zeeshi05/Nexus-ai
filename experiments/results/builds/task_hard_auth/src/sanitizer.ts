export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  // Strip script tags
  let sanitized = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '');

  // Strip on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Strip javascript: URI schemes
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Escape HTML special characters
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return sanitized.replace(/[&<>"']/g, (m) => map[m]);
}

export function containsSQLInjection(input: string): boolean {
  if (typeof input !== 'string') return false;

  const sqlPattern = /\b(SELECT|DROP|INSERT|UPDATE|DELETE|UNION|EXEC|EXECUTE)\b|--|;|\/\*/gi;
  return sqlPattern.test(input);
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };

  for (const key in result) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) continue;

    const value = result[key];

    if (typeof value === 'string') {
      (result as any)[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      (result as any)[key] = value.map((item) => {
        if (typeof item === 'string') return sanitizeString(item);
        if (item !== null && typeof item === 'object') return sanitizeObject(item);
        return item;
      });
    } else if (value !== null && typeof value === 'object') {
      (result as any)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }

  return result;
}