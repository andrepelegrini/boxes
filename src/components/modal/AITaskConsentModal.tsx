import React, { useState } from 'react';
import { Modal } from '../../modules/common/components/Modal';
import { 
  FiInfo, 
  FiShield, 
  FiEye, 
  FiClock, 
  FiSettings,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { AITaskConsentSettings } from '../../hooks/useAITaskConsentState';

interface AITaskConsentModalProps {
  isOpen: boolean;
  onConsent: (settings: Partial<AITaskConsentSettings>) => void;
  onDecline: () => void;
  title?: string;
  description?: string;
}

/**
 * AITaskConsentModal - User consent interface for AI task generation features.
 * 
 * Provides clear information about what AI features will do and allows users
 * to grant granular permissions for different AI capabilities.
 */
export const AITaskConsentModal: React.FC<AITaskConsentModalProps> = ({
  isOpen,
  onConsent,
  onDecline,
  title = "AI Task Assistance Permissions",
  description = "To help you manage tasks more effectively, we'd like your permission to use AI analysis features."
}) => {
  const [allowAutomaticAnalysis, setAllowAutomaticAnalysis] = useState(false);
  const [allowBackgroundDiscovery, setAllowBackgroundDiscovery] = useState(false);

  const handleConsent = () => {
    onConsent({
      allowAutomaticAnalysis,
      allowBackgroundDiscovery,
    });
  };

  const handleDecline = () => {
    onDecline();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleDecline} title={title} size="lg">
      <div className="space-y-6">
        {/* Introduction */}
        <div className="text-textAccent text-sm leading-relaxed">
          {description}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiShield className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm">
              <div className="font-medium text-blue-900 mb-1">Your Privacy Matters</div>
              <div className="text-blue-700">
                All AI analysis happens locally. Your data stays on your device and is never sent to external AI services without your explicit action.
              </div>
            </div>
          </div>
        </div>

        {/* Permission Options */}
        <div className="space-y-4">
          <h3 className="font-medium text-textOnSurface">What would you like to enable?</h3>
          
          {/* Automatic Analysis Permission */}
          <div className="border border-border rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAutomaticAnalysis}
                onChange={(e) => setAllowAutomaticAnalysis(e.target.checked)}
                className="mt-1 rounded border-border"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FiEye className="text-green-600" size={16} />
                  <span className="font-medium text-textOnSurface">Smart Task Analysis</span>
                </div>
                <div className="text-sm text-textAccent mb-2">
                  Analyze your Slack messages to suggest relevant tasks when you explicitly request it.
                </div>
                <div className="text-xs text-textAccent">
                  • Only analyzes when you click "Analyze" or "Suggest Tasks"<br />
                  • Helps identify action items from your conversations<br />
                  • You review and approve all suggestions before tasks are created
                </div>
              </div>
            </label>
          </div>

          {/* Background Discovery Permission */}
          <div className="border border-border rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowBackgroundDiscovery}
                onChange={(e) => setAllowBackgroundDiscovery(e.target.checked)}
                className="mt-1 rounded border-border"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FiClock className="text-purple-600" size={16} />
                  <span className="font-medium text-textOnSurface">Background Task Discovery</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Optional</span>
                </div>
                <div className="text-sm text-textAccent mb-2">
                  Periodically scan your Slack messages for potential tasks and notify you of suggestions.
                </div>
                <div className="text-xs text-textAccent">
                  • Scans messages every hour for task opportunities<br />
                  • Creates suggestions you can review in a dedicated panel<br />
                  • You always have final approval before any tasks are created<br />
                  • Can be disabled anytime in settings
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* What won't happen */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiInfo className="text-gray-600 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">What We Won't Do</div>
              <div className="text-gray-700 space-y-1">
                <div>• Never automatically create tasks without your approval</div>
                <div>• Never modify or delete your existing tasks</div>
                <div>• Never share your data with external services</div>
                <div>• Never analyze private or sensitive conversations without permission</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <button
            onClick={handleDecline}
            className="flex items-center gap-2 px-4 py-2 text-textAccent hover:text-textOnSurface transition-colors"
          >
            <FiX size={16} />
            Not Right Now
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => onConsent({ allowAutomaticAnalysis: false, allowBackgroundDiscovery: false })}
              className="px-4 py-2 border border-border rounded-md text-textAccent hover:bg-secondary-light transition-colors"
            >
              Skip AI Features
            </button>
            <button
              onClick={handleConsent}
              disabled={!allowAutomaticAnalysis && !allowBackgroundDiscovery}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiCheck size={16} />
              {allowAutomaticAnalysis || allowBackgroundDiscovery ? 'Enable Selected Features' : 'Select at least one feature'}
            </button>
          </div>
        </div>

        {/* Settings Note */}
        <div className="text-xs text-textAccent text-center pt-2 border-t border-border">
          <FiSettings className="inline mr-1" size={12} />
          You can change these permissions anytime in Settings → AI Features
        </div>
      </div>
    </Modal>
  );
};