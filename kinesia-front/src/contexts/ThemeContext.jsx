import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const ES_DARK = '(prefers-color-scheme: dark)';

function temaInicial() {
  try {
    if (typeof window !== 'undefined' && window.matchMedia?.(ES_DARK)?.matches) return 'dark';
  } catch { /* sin matchMedia disponible */
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

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
