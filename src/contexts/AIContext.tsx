import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface AIContextType {
  isAIAvailable?: () => boolean;
  getProjectIntelligence?: (projectId: string) => Promise<any>;
  triggerAIAnalysis?: (projectId: string) => Promise<void>;
  geminiApiKey?: string;
  updateGeminiApiKey?: (key: string) => Promise<boolean>;
  isAIEnabled?: boolean;
  testGeminiConnection?: () => Promise<boolean>;
}

const AIContext = createContext<AIContextType | null>(null);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });

  const updateGeminiApiKey = async (key: string): Promise<boolean> => {
    try {
      if (!key.trim()) {
        return false;
      }
      
      // Save to localStorage
      localStorage.setItem('gemini_api_key', key.trim());
      setGeminiApiKey(key.trim());
      return true;
    } catch (error) {
      console.error('Error saving Gemini API key:', error);
      return false;
    }
  };

  const contextValue: AIContextType = {
    isAIAvailable: () => false,
    getProjectIntelligence: () => Promise.resolve(null),
    triggerAIAnalysis: () => Promise.resolve(),
    geminiApiKey,
    updateGeminiApiKey,
    isAIEnabled: !!geminiApiKey,
    testGeminiConnection: () => Promise.resolve(false),
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
};

export const useAIContext = () => {
  const context = useContext(AIContext);
  return context;
};

export default AIContext;