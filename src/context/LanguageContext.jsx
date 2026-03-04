import { createContext, useState, useContext } from "react";
import { translations } from "../lib/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem("appLanguage");
    if (saved) return saved;
    return navigator.language?.startsWith("es") ? "es" : "en";
  });

  const switchLanguage = (lang) => {
    // Reset swipe tutorial for new language so user sees it in correct language
    localStorage.removeItem(`dayclose_swipe_tutorial_${language}`);
    setLanguage(lang);
    localStorage.setItem("appLanguage", lang);
  };

  const t = (key, replacements = {}) => {
    let translation = translations[language]?.[key] ?? key;
    Object.entries(replacements).forEach(([variable, value]) => {
      translation = translation.replaceAll(`{{${variable}}}`, value);
    });
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
