import React, { useState, useEffect } from 'react';
import { 
  FiCode, 
  FiEdit3, 
  FiSave, 
  FiX, 
  FiRotateCcw, 
  FiStar, 
  FiClock, 
  FiActivity,
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiCheck
} from 'react-icons/fi';
import { CustomPrompt, PromptCategory, PromptManagementService, UpdatePromptRequest } from '../../services/PromptManagementService';
import { Modal } from '../../modules/common/components/Modal';

interface PromptManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptManagementPanel: React.FC<PromptManagementPanelProps> = ({
  isOpen,
  onClose
}) => {
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [customContent, setCustomContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [performanceNotes, setPerformanceNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [copiedToClipboard, setCopiedToClipboard] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const promptCategories = await PromptManagementService.getPromptsByCategory();
      setCategories(promptCategories);
      
      // Expand first category by default
      if (promptCategories.length > 0) {
        setExpandedCategories(new Set([promptCategories[0].category]));
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = (prompt: CustomPrompt) => {
    setSelectedPrompt(prompt);
    setEditingPrompt(null);
    setCustomContent(prompt.custom_prompt || prompt.default_prompt);
    setRating(prompt.user_rating);
    setPerformanceNotes(prompt.performance_notes || '');
  };

  const handleEditPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setCustomContent(prompt.custom_prompt || prompt.default_prompt);
    setRating(prompt.user_rating);
    setPerformanceNotes(prompt.performance_notes || '');
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt) return;

    try {
      setSaving(true);
      
      const updateRequest: UpdatePromptRequest = {
        custom_prompt: customContent !== editingPrompt.default_prompt ? customContent : null,
        user_rating: rating,
        performance_notes: performanceNotes || null
      };

      const updatedPrompt = await PromptManagementService.updatePrompt(editingPrompt.id, updateRequest);
      
      // Update the prompt in the categories list
      setCategories(prev => prev.map(category => ({
        ...category,
        prompts: category.prompts.map(p => p.id === updatedPrompt.id ? updatedPrompt : p)
      })));

      setSelectedPrompt(updatedPrompt);
      setEditingPrompt(null);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async (prompt: CustomPrompt) => {
    if (!confirm('Are you sure you want to reset this prompt to its default content? Your custom changes will be lost.')) {
      return;
    }

    try {
      setSaving(true);
      const updatedPrompt = await PromptManagementService.resetPromptToDefault(prompt.id);
      
      // Update the prompt in the categories list
      setCategories(prev => prev.map(category => ({
        ...category,
        prompts: category.prompts.map(p => p.id === updatedPrompt.id ? updatedPrompt : p)
      })));

      if (selectedPrompt?.id === prompt.id) {
        setSelectedPrompt(updatedPrompt);
        setCustomContent(updatedPrompt.default_prompt);
      }
      if (editingPrompt?.id === prompt.id) {
        setEditingPrompt(updatedPrompt);
        setCustomContent(updatedPrompt.default_prompt);
      }
    } catch (error) {
      console.error('Failed to reset prompt:', error);
      alert('Failed to reset prompt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToClipboard = async (content: string, promptKey: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedToClipboard(promptKey);
      setTimeout(() => setCopiedToClipboard(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getFilteredCategories = () => {
    let filtered = categories;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(cat => cat.category === filterCategory);
    }

    if (searchTerm) {
      filtered = filtered.map(category => ({
        ...category,
        prompts: category.prompts.filter(prompt => 
          prompt.prompt_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prompt.prompt_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prompt.prompt_key.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.prompts.length > 0);
    }

    return filtered;
  };

  const renderStarRating = (currentRating: number | null, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onRate?.(star)}
            className={`w-4 h-4 ${
              star <= (currentRating || 0) 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${onRate ? 'hover:text-yellow-400 cursor-pointer' : ''}`}
            disabled={!onRate}
          >
            <FiStar fill={star <= (currentRating || 0) ? 'currentColor' : 'none'} />
          </button>
        ))}
        {currentRating && (
          <span className="text-xs text-gray-500 ml-1">({currentRating}/5)</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="LLM Prompt Management" size="xl">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nubank-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading prompts...</span>
        </div>
      </Modal>
    );
  }

  const filteredCategories = getFilteredCategories();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="LLM Prompt Management" size="xl">
      <div className="flex h-[80vh]">
        {/* Left Sidebar - Prompt List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.category} value={category.category}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt Categories List */}
          <div className="flex-1 overflow-y-auto">
            {filteredCategories.map(category => (
              <div key={category.category} className="border-b border-gray-100">
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">{category.name}</h3>
                    <p className="text-xs text-gray-500">{category.prompts.length} prompts</p>
                  </div>
                  {expandedCategories.has(category.category) ? (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {expandedCategories.has(category.category) && (
                  <div className="bg-gray-50">
                    {category.prompts.map(prompt => (
                      <div
                        key={prompt.id}
                        className={`px-6 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
                          selectedPrompt?.id === prompt.id ? 'bg-nubank-purple-50 border-l-4 border-l-nubank-purple-500' : ''
                        }`}
                        onClick={() => handleSelectPrompt(prompt)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-800">{prompt.prompt_name}</h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prompt.prompt_description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              {renderStarRating(prompt.user_rating)}
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <FiActivity className="w-3 h-3" />
                                {prompt.usage_count} uses
                              </div>
                              {prompt.custom_prompt && (
                                <span className="text-xs bg-nubank-purple-100 text-nubank-purple-700 px-2 py-1 rounded">
                                  Customized
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Prompt Details */}
        <div className="flex-1 flex flex-col">
          {selectedPrompt ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{selectedPrompt.prompt_name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedPrompt.prompt_description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {selectedPrompt.prompt_key}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <FiClock className="w-3 h-3" />
                        {selectedPrompt.last_used_at 
                          ? `Last used ${new Date(selectedPrompt.last_used_at).toLocaleDateString()}`
                          : 'Never used'
                        }
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <FiActivity className="w-3 h-3" />
                        {selectedPrompt.usage_count} total uses
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyToClipboard(
                        selectedPrompt.custom_prompt || selectedPrompt.default_prompt,
                        selectedPrompt.prompt_key
                      )}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy prompt"
                    >
                      {copiedToClipboard === selectedPrompt.prompt_key ? (
                        <FiCheck className="w-4 h-4 text-green-500" />
                      ) : (
                        <FiCopy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditPrompt(selectedPrompt)}
                      className="p-2 text-gray-400 hover:text-nubank-purple-600 transition-colors"
                      title="Edit prompt"
                    >
                      <FiEdit3 className="w-4 h-4" />
                    </button>
                    {selectedPrompt.custom_prompt && (
                      <button
                        onClick={() => handleResetToDefault(selectedPrompt)}
                        className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                        title="Reset to default"
                      >
                        <FiRotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {editingPrompt?.id === selectedPrompt.id ? (
                  /* Edit Mode */
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prompt Content
                      </label>
                      <textarea
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                        className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
                        placeholder="Enter your custom prompt content..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Effectiveness Rating
                        </label>
                        {renderStarRating(rating, setRating)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Performance Notes
                        </label>
                        <textarea
                          value={performanceNotes}
                          onChange={(e) => setPerformanceNotes(e.target.value)}
                          className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
                          placeholder="Notes about prompt performance..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSavePrompt}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-nubank-purple-600 text-white rounded-lg hover:bg-nubank-purple-700 transition-colors disabled:opacity-50"
                      >
                        <FiSave className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingPrompt(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-800">
                          {selectedPrompt.custom_prompt ? 'Custom Prompt' : 'Default Prompt'}
                        </h3>
                        {selectedPrompt.custom_prompt && (
                          <span className="text-sm bg-nubank-purple-100 text-nubank-purple-700 px-3 py-1 rounded-full">
                            Customized
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                        {selectedPrompt.custom_prompt || selectedPrompt.default_prompt}
                      </div>
                    </div>

                    {selectedPrompt.custom_prompt && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Original Default Prompt</h3>
                        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-x-auto opacity-60">
                          {selectedPrompt.default_prompt}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Input Variables</h4>
                        <div className="space-y-1">
                          {PromptManagementService.parseInputVariables(selectedPrompt.input_variables).map(variable => (
                            <code key={variable} className="block text-xs bg-gray-100 px-2 py-1 rounded">
                              {'{' + variable + '}'}
                            </code>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Output Format</h4>
                        <p className="text-sm text-gray-600">{selectedPrompt.output_format}</p>
                      </div>
                    </div>

                    {(selectedPrompt.user_rating || selectedPrompt.performance_notes) && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-3">User Feedback</h4>
                        <div className="bg-blue-50 rounded-lg p-4">
                          {selectedPrompt.user_rating && (
                            <div className="mb-2">
                              <span className="text-sm text-gray-600">Rating: </span>
                              {renderStarRating(selectedPrompt.user_rating)}
                            </div>
                          )}
                          {selectedPrompt.performance_notes && (
                            <div>
                              <span className="text-sm text-gray-600">Notes: </span>
                              <p className="text-sm text-gray-700 mt-1">{selectedPrompt.performance_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No Prompt Selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FiCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500">Select a prompt to view details</h3>
                <p className="text-gray-400 mt-2">Choose a prompt from the left panel to view and edit its content.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};