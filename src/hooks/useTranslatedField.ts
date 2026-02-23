import { useTranslation } from "react-i18next";

/**
 * Returns a getter function that picks the right translated field
 * for a DB record, falling back to the default (French) field.
 *
 * Usage:
 *   const tField = useTranslatedField();
 *   const name = tField(product, "name"); // picks name_en, name_nl, or name
 */
export const useTranslatedField = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return <T extends Record<string, any>>(record: T, field: string): string => {
    if (lang === "fr") return record[field] || "";
    const translatedKey = `${field}_${lang}`;
    return record[translatedKey] || record[field] || "";
  };
};
