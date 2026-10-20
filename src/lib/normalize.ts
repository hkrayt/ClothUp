/**
 * Normalizes text for forgiving search in English and Arabic:
 * case, Latin accents, Arabic diacritics/tatweel and common letter variants
 * (أ إ آ → ا, ة → ه, ى → ي, ؤ → و, ئ → ي), apostrophes and hyphens.
 */
export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Tashkeel, combining hamza/madda (left over from NFD of أ إ آ), superscript alef, tatweel
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/^ال/, '')
    .replace(/\sال/g, ' ')
    .replace(/['`’‘\-_/.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
