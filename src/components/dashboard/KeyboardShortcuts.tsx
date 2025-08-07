import React, { useState, useEffect } from 'react';
import { FiHelpCircle, FiX, FiCommand } from 'react-icons/fi';

export const KeyboardShortcuts: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-nubank-purple-600 hover:bg-nubank-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50"
        title="Keyboard shortcuts (⌘/)"
      >
        <FiHelpCircle className="w-5 h-5" />
      </button>
    );
  }

  const shortcuts = [
    { key: '⌘ + 1', action: 'Dashboard' },
    { key: '⌘ + 2', action: 'Current Focus' },
    { key: '⌘ + 3', action: 'Intelligence' },
    { key: '⌘ + 4', action: 'Communication' },
    { key: '⌘ + 5', action: 'Timeline' },
    { key: '⌘ + 6', action: 'Resources' },
    { key: '⌘ + T', action: 'New Task' },
    { key: '⌘ + M', action: 'Schedule Meeting' },
    { key: '⌘ + /', action: 'Show shortcuts' },
    { key: 'Escape', action: 'Close modals' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-nubank-lg shadow-xl border border-nubank-gray-200 w-96 max-w-[90vw]">
        <div className="p-6 border-b border-nubank-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-nubank-gray-800 flex items-center gap-2">
              <FiCommand className="w-5 h-5 text-nubank-purple-600" />
              Keyboard Shortcuts
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-nubank-gray-500 hover:text-nubank-gray-700 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-nubank-gray-700">{shortcut.action}</span>
              <kbd className="px-2 py-1 bg-nubank-gray-100 text-nubank-gray-700 text-xs rounded border font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-nubank-gray-50 border-t border-nubank-gray-200 rounded-b-nubank-lg">
          <p className="text-xs text-nubank-gray-600 text-center">
            Press <kbd className="px-1 py-0.5 bg-white rounded text-xs">⌘ + /</kbd> anytime to toggle shortcuts
          </p>
        </div>
      </div>
    </div>
  );
};