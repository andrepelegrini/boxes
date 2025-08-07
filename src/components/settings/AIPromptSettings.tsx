import React, { useState } from 'react';
import { FiSettings, FiCode, FiZap, FiInfo } from 'react-icons/fi';
import { PromptManagementPanel } from '../prompts/PromptManagementPanel';
import { usePromptManagement } from '../../hooks/usePromptManagement';

export const AIPromptSettings: React.FC = () => {
  const [showPromptManager, setShowPromptManager] = useState(false);
  const { state, actions } = usePromptManagement();

  const handleInitializeDefaults = async () => {
    try {
      await actions.initializeDefaults();
      alert('Default prompts initialized successfully!');
    } catch (error) {
      alert('Failed to initialize default prompts. Please try again.');
    }
  };

  const handleOpenPromptManager = () => {
    setShowPromptManager(true);
  };

  const promptStats = {
    totalPrompts: state.prompts.length,
    customizedPrompts: state.prompts.filter(p => p.custom_prompt).length,
    categoriesCount: state.categories.length,
    totalUsage: state.prompts.reduce((sum, p) => sum + p.usage_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <FiCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">AI Prompt Management</h2>
            <p className="text-sm text-gray-600">Customize and manage LLM prompts used throughout the application</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiInfo className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">About Prompt Management</h3>
              <p className="text-sm text-blue-700 mt-1">
                This feature allows you to view and customize the AI prompts used for task analysis, 
                project descriptions, Slack analysis, and more. You can modify prompts to better suit 
                your team's specific needs and terminology.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiCode className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-800">{promptStats.totalPrompts}</p>
              <p className="text-xs text-gray-500">Total Prompts</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiSettings className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-800">{promptStats.customizedPrompts}</p>
              <p className="text-xs text-gray-500">Customized</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <FiZap className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-800">{promptStats.categoriesCount}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <FiZap className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-800">{promptStats.totalUsage.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Usage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Manage Prompts</h4>
              <p className="text-sm text-gray-600">View, edit, and customize AI prompts used throughout the application</p>
            </div>
            <button
              onClick={handleOpenPromptManager}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Open Prompt Manager
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Initialize Default Prompts</h4>
              <p className="text-sm text-gray-600">Reset or initialize the default prompt library (useful for first-time setup)</p>
            </div>
            <button
              onClick={handleInitializeDefaults}
              disabled={state.loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {state.loading ? 'Initializing...' : 'Initialize Defaults'}
            </button>
          </div>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Prompt Categories</h3>
        
        {state.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Loading prompts...</span>
          </div>
        ) : state.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Error loading prompts: {state.error}</p>
            <button
              onClick={actions.loadPrompts}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.categories.map(category => (
              <div key={category.category} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">{category.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{category.prompts.length} prompts</span>
                  <span className="text-purple-600">
                    {category.prompts.filter(p => p.custom_prompt).length} customized
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
        <h3 className="text-lg font-semibold text-purple-800 mb-4">Tips for Customizing Prompts</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">1</div>
            <p className="text-sm text-purple-700">
              <strong>Keep core structure:</strong> Maintain the essential instructions and output format requirements when customizing prompts.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
            <p className="text-sm text-purple-700">
              <strong>Test thoroughly:</strong> Rate and provide feedback on customized prompts to track their effectiveness over time.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">3</div>
            <p className="text-sm text-purple-700">
              <strong>Use domain-specific language:</strong> Incorporate your team's terminology and specific business context for better results.
            </p>
          </div>
        </div>
      </div>

      {/* Prompt Management Panel */}
      <PromptManagementPanel
        isOpen={showPromptManager}
        onClose={() => setShowPromptManager(false)}
      />
    </div>
  );
};