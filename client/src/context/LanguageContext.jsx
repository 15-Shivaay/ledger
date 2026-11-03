import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import hiTranslations from '../locales/hi.json';

const translations = {
  en: enTranslations,
  hi: hiTranslations
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // English is the default language per requirements
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  const setLanguage = (newLang) => {
    if (newLang === 'en' || newLang === 'hi') {
      setLanguageState(newLang);
      localStorage.setItem('app_language', newLang);
      document.documentElement.lang = newLang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  /**
   * Translate a dotted path key (e.g. "modals.addCustomer.title")
   * with optional interpolation parameters: { count: 5, amount: "₹500" }
   */
  const t = (keyPath, params = {}) => {
    const keys = keyPath.split('.');
    let current = translations[language];
    let fallback = translations.en;

    for (const k of keys) {
      current = current ? current[k] : undefined;
      fallback = fallback ? fallback[k] : undefined;
    }

    let result = current !== undefined ? current : fallback !== undefined ? fallback : keyPath;

    if (typeof result === 'string') {
      Object.keys(params).forEach((placeholder) => {
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), params[placeholder]);
      });
    }

    return result;
  };

  const isHindi = language === 'hi';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isHindi }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

