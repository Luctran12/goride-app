export type Language = 'en' | 'vi';

export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Recursive dictionary shape – leaves are strings, branches are nested objects.
 */
export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};
