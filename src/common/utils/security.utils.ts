/**
 * XSS 방지를 위한 유틸리티 함수들
 */

/**
 * HTML 엔티티 이스케이프
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
}

/**
 * 위험한 HTML 태그 제거
 */
export function sanitizeHtml(html: string): string {
  // 위험한 태그들 제거
  const dangerousTags = /<(script|iframe|object|embed|link|style|base|form)[^>]*>.*?<\/\1>|<(script|iframe|object|embed|link|style|base|form)[^>]*>/gi;
  let sanitized = html.replace(dangerousTags, '');

  // 위험한 속성들 제거
  const dangerousAttrs = /\s*(on\w+|javascript:|data:text\/html)\s*=/gi;
  sanitized = sanitized.replace(dangerousAttrs, '');

  return sanitized;
}

/**
 * URL 검증
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // 허용된 프로토콜만 허용
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

/**
 * 파일명 sanitize
 */
export function sanitizeFilename(filename: string): string {
  // 위험한 문자 제거
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .substring(0, 255);
}

/**
 * SQL Injection 방지용 문자열 이스케이프
 */
export function escapeSql(value: string): string {
  return value.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%':
        return '\\' + char;
      default:
        return char;
    }
  });
}
