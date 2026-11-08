import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const ThemeContext = createContext<{ tema: string; setTema: (t: string) => void; toggleTema: () => void } | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  return ctx;
}

const ES_DARK = '(prefers-color-scheme: dark)';

function temaInicial(): string {
  try {
    if (typeof window !== 'undefined' && window.matchMedia?.(ES_DARK)?.matches) return 'dark';
  } catch { /* sin matchMedia disponible */
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<string>(temaInicial);

  // Aplica el tema sobre el <html> (data-theme + color-scheme nativo)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tema;
    root.style.colorScheme = tema;
  }, [tema]);

  const toggleTema = useCallback(() => {
    setTema((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ tema, setTema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  );
}
