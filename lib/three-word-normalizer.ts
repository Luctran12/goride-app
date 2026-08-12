/**
 * Normalizes spoken Vietnamese or English text into standard dot-separated 3-word format (w1.w2.w3).
 *
 * Examples:
 * - "hoa lá cây" -> "hoa.la.cay" (or preserves accents "hoa.lá.cây", lowercase)
 * - "hoa chấm lá chấm cây" -> "hoa.la.cay"
 * - "hoa, lá, cây" -> "hoa.la.cay"
 */
export function normalizeSpokenThreeWords(spokenText: string): string {
  if (!spokenText) {
    return '';
  }

  let text = spokenText.trim().toLowerCase();

  // Replace spoken punctuation words in Vietnamese & English with dot
  text = text.replace(/\b(dấu\s+chấm|chấm|dấu\s+phẩy|phẩy|gạch\s+ngang|dot|comma|dash)\b/gi, '.');

  // Replace physical punctuation marks and separators with dot
  text = text.replace(/[,;:\-_\/\\\s]+/g, '.');

  // Collapse multiple dots
  text = text.replace(/\.+/g, '.');

  // Trim leading & trailing dots
  text = text.replace(/^\.|\.$/g, '');

  // Split into parts and pick up to 3 non-empty words
  const parts = text.split('.').filter((part) => part.trim().length > 0);

  if (parts.length === 0) {
    return '';
  }

  // Join up to 3 words with dot
  return parts.slice(0, 3).join('.');
}
