import { invoke } from '../utils/tauri';

export interface CustomPrompt {
  id: string;
  prompt_key: string;
  prompt_name: string;
  prompt_category: string;
  default_prompt: string;
  custom_prompt: string | null;
  prompt_description: string;
  input_variables: string | null; // JSON array
  output_format: string;
  is_active: boolean;
  is_system_prompt: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  usage_count: number;
  user_rating: number | null;
  performance_notes: string | null;
}

export interface UpdatePromptRequest {
  custom_prompt?: string | null;
  user_rating?: number | null;
  performance_notes?: string | null;
}

export interface PromptCategory {
  category: string;
  name: string;
  description: string;
  prompts: CustomPrompt[];
}

export class PromptManagementService {
  private static initialized = false;
  
  /**
   * Initialize the prompt management system
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('🔧 Initializing prompt management system...');
      await invoke('initialize_default_prompts');
      console.log('✅ Prompt management system initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize default prompts:', error);
      // Don't throw - this might be expected in some environments
    }
  }
  
  /**
   * Get all prompts organized by category
   */
  static async getAllPrompts(): Promise<CustomPrompt[]> {
    await this.initialize();
    
    try {
      const result = await invoke<CustomPrompt[]>('get_all_prompts');
      return result;
    } catch (error) {
      console.error('Failed to get all prompts:', error);
      throw new Error(`Failed to get prompts: ${error}`);
    }
  }

  /**
   * Get prompts organized by category
   */
  static async getPromptsByCategory(): Promise<PromptCategory[]> {
    const prompts = await this.getAllPrompts();
    
    const categoryMap = new Map<string, CustomPrompt[]>();
    
    prompts.forEach(prompt => {
      if (!categoryMap.has(prompt.prompt_category)) {
        categoryMap.set(prompt.prompt_category, []);
      }
      categoryMap.get(prompt.prompt_category)!.push(prompt);
    });

    const categories: PromptCategory[] = [];
    
    categoryMap.forEach((prompts, category) => {
      categories.push({
        category,
        name: this.getCategoryDisplayName(category),
        description: this.getCategoryDescription(category),
        prompts: prompts.sort((a, b) => a.prompt_name.localeCompare(b.prompt_name))
      });
    });

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get a specific prompt by its key
   */
  static async getPromptByKey(promptKey: string): Promise<CustomPrompt | null> {
    try {
      const result = await invoke<CustomPrompt | null>('get_prompt_by_key', { promptKey });
      return result;
    } catch (error) {
      console.error('Failed to get prompt by key:', error);
      throw new Error(`Failed to get prompt: ${error}`);
    }
  }

  /**
   * Update a prompt with custom content or user feedback
   */
  static async updatePrompt(promptId: string, request: UpdatePromptRequest): Promise<CustomPrompt> {
    try {
      const result = await invoke<CustomPrompt>('update_prompt', { promptId, request });
      return result;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      throw new Error(`Failed to update prompt: ${error}`);
    }
  }

  /**
   * Get the effective prompt (custom if available, otherwise default)
   */
  static async getEffectivePrompt(promptKey: string): Promise<string> {
    try {
      const result = await invoke<string>('get_effective_prompt', { promptKey });
      return result;
    } catch (error) {
      console.error('Failed to get effective prompt:', error);
      throw new Error(`Failed to get effective prompt: ${error}`);
    }
  }

  /**
   * Initialize default prompts (usually called on app startup)
   */
  static async initializeDefaultPrompts(): Promise<void> {
    try {
      await invoke<void>('initialize_default_prompts');
    } catch (error) {
      console.error('Failed to initialize default prompts:', error);
      throw new Error(`Failed to initialize prompts: ${error}`);
    }
  }

  /**
   * Record usage analytics for a prompt
   */
  static async recordPromptUsage(
    promptKey: string, 
    success: boolean, 
    executionTimeMs: number, 
    tokenCount?: number
  ): Promise<void> {
    try {
      await invoke<void>('record_prompt_usage', { 
        promptKey, 
        success, 
        executionTimeMs, 
        tokenCount 
      });
    } catch (error) {
      console.error('Failed to record prompt usage:', error);
      // Don't throw here as this is analytics and shouldn't break the main flow
    }
  }

  /**
   * Reset a prompt to its default content
   */
  static async resetPromptToDefault(promptId: string): Promise<CustomPrompt> {
    return this.updatePrompt(promptId, { custom_prompt: null });
  }

  /**
   * Rate a prompt's effectiveness
   */
  static async ratePrompt(promptId: string, rating: number, notes?: string): Promise<CustomPrompt> {
    return this.updatePrompt(promptId, { 
      user_rating: rating, 
      performance_notes: notes 
    });
  }

  /**
   * Parse input variables from JSON string
   */
  static parseInputVariables(inputVariablesJson: string | null): string[] {
    if (!inputVariablesJson) return [];
    
    try {
      return JSON.parse(inputVariablesJson);
    } catch (error) {
      console.warn('Failed to parse input variables:', error);
      return [];
    }
  }

  /**
   * Get user-friendly category display names
   */
  private static getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      'task_analysis': 'Task Analysis',
      'slack_analysis': 'Slack Analysis',
      'project_analysis': 'Project Analysis',
      'meta_analysis': 'Meta Analysis',
      'project_description': 'Project Descriptions',
      'event_detection': 'Event Detection',
      'intelligence': 'Project Intelligence'
    };
    
    return categoryNames[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get category descriptions
   */
  private static getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'task_analysis': 'Prompts for analyzing messages and extracting actionable tasks',
      'slack_analysis': 'Prompts for analyzing Slack conversations and team communication',
      'project_analysis': 'Prompts for comprehensive project health and intelligence analysis',
      'meta_analysis': 'Prompts for improving other prompts based on usage patterns',
      'project_description': 'Prompts for generating professional project descriptions',
      'event_detection': 'Prompts for detecting events, deadlines, and milestones',
      'intelligence': 'Prompts for advanced project insights and recommendations'
    };
    
    return descriptions[category] || 'Custom prompts for specialized analysis';
  }

  /**
   * Format prompt content for display with syntax highlighting hints
   */
  static formatPromptForDisplay(prompt: string): string {
    // Add basic formatting hints for better readability
    return prompt
      .replace(/\{([^}]+)\}/g, '<span class="variable">{$1}</span>')
      .replace(/^(INSTRUCTIONS?|REQUIREMENTS?|TASK|EXAMPLES?|RESPONSE FORMAT):/gm, '<strong>$1:</strong>')
      .replace(/^\d+\./gm, '<strong>$&</strong>');
  }

  /**
   * Validate prompt content
   */
  static validatePrompt(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!content.trim()) {
      errors.push('Prompt content cannot be empty');
    }
    
    if (content.length < 50) {
      errors.push('Prompt content seems too short (minimum 50 characters)');
    }
    
    if (content.length > 5000) {
      errors.push('Prompt content is too long (maximum 5000 characters)');
    }
    
    // Check for balanced braces (variable placeholders)
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced variable placeholders ({ })');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}