import { useTranslation } from "react-i18next";
import { useCallback } from "react";

const localeMap: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  nl: "nl-NL",
};

export function useLocaleDate() {
  const { i18n } = useTranslation();
  const locale = localeMap[i18n.language] || "fr-FR";

  const formatDate = useCallback(
    (date: string | Date) => new Date(date).toLocaleDateString(locale),
    [locale]
  );

  return { formatDate, locale };
}
