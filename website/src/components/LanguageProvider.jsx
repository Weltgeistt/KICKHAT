"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, DEFAULT_LANG, LANGS } from "@/i18n";

const LangContext = createContext(null);

// "a.b.c" yolunu sözlükten çözer
function resolve(dict, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), dict);
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("kickhat_lang") : null;
    if (saved && LANGS.includes(saved)) setLangState(saved);
  }, []);

  function setLang(next) {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    localStorage.setItem("kickhat_lang", next);
    document.documentElement.lang = next;
  }

  function t(path) {
    const val = resolve(dictionaries[lang], path) ?? resolve(dictionaries[DEFAULT_LANG], path);
    return val !== undefined ? val : path;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang, LanguageProvider içinde kullanılmalı");
  return ctx;
}
