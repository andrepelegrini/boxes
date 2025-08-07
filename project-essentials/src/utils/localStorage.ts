// src/utils/localStorage.ts

export const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  const storedValue = localStorage.getItem(key);
  if (storedValue) {
    try {
      const parsed = JSON.parse(storedValue);
      // Handle cases where a stringified number might be parsed from old storage
      if (typeof defaultValue === 'number' && typeof parsed === 'string') return Number(parsed) as unknown as T;
      if (typeof defaultValue === 'number' && typeof parsed === 'number') return parsed as unknown as T;
      return parsed;
    } catch (error) {
      console.error("Erro ao parsear localStorage chave \"" + key + "\":", error);
      localStorage.removeItem(key); // Clear corrupted item
      return defaultValue;
    }
  }
  return defaultValue;
};

export const saveToLocalStorage = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Erro ao salvar no localStorage chave \"" + key + "\":", error);
  }
};
