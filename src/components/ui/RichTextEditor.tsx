import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiBold, FiItalic, FiList, FiType, FiCode, FiLink, FiEye, FiEdit3 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RichTextEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = '',
  onContentChange,
  placeholder = 'Start typing...',
  className = '',
  autoSave = true,
  autoSaveDelay = 1000
}) => {
  const [content, setContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize content when prop changes
  useEffect(() => {
    if (initialContent !== content) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !onContentChange) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (content !== initialContent) {
        onContentChange(content);
      }
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, onContentChange, autoSave, autoSaveDelay, initialContent]);

  // Handle content changes
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  // Format text functions
  const insertText = useCallback((before: string, after: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    
    const newContent = 
      content.slice(0, start) + 
      before + 
      selectedText + 
      after + 
      content.slice(end);
    
    setContent(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  }, [content]);

  const formatBold = useCallback(() => insertText('**', '**'), [insertText]);
  const formatItalic = useCallback(() => insertText('*', '*'), [insertText]);
  const formatCode = useCallback(() => insertText('`', '`'), [insertText]);
  const formatHeading = useCallback(() => insertText('## '), [insertText]);
  const formatList = useCallback(() => insertText('- '), [insertText]);
  const formatLink = useCallback(() => insertText('[', '](url)'), [insertText]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatBold();
          break;
        case 'i':
          e.preventDefault();
          formatItalic();
          break;
        case 'k':
          e.preventDefault();
          formatLink();
          break;
        case 'Enter':
          e.preventDefault();
          setIsPreview(!isPreview);
          break;
      }
    }
  }, [formatBold, formatItalic, formatLink, isPreview]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Click to edit functionality
  const handlePreviewClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      setIsPreview(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isEditing]);

  const handleBlur = useCallback(() => {
    // Delay to allow toolbar clicks
    setTimeout(() => {
      if (!document.activeElement?.closest('.rich-text-toolbar')) {
        setIsEditing(false);
        if (content.trim()) {
          setIsPreview(true);
        }
      }
    }, 100);
  }, [content]);

  const showToolbar = isEditing || content.trim() === '';
  const showPreview = isPreview && content.trim() && !isEditing;

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="rich-text-toolbar flex items-center space-x-1 p-2 bg-background border border-border rounded-t-lg border-b-0">
          <button
            onClick={formatBold}
            className="p-2 text-textAccent hover:text-textOnSurface hover:bg-surface rounded transition-colors"
            title="Bold (Cmd+B)"
          >
            <FiBold size={14} />
          </button>
          <button
            onClick={formatItalic}
            className="p-2 text-textAccent hover:text-textOnSurface hover:bg-surface rounded transition-colors"
            title="Italic (Cmd+I)"
          >
            <FiItalic size={14} />
          </button>
          <button
            onClick={formatCode}
            className="p-2 text-textAccent hover:text-textOnSurface hover:bg-surface rounded transition-colors"
            title="Code"
          >
            <FiCode size={14} />
          </button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <button
            onClick={formatHeading}
            className="p-2 text-textAccent hover:text-textOnSurface hover:bg-surface rounded transition-colors"
            title="Heading"
          >
            <FiType size={14} />
          </button>
          <button
            onClick={formatList}
            className="p-2 text-textAccent hover:text-textOnSurface hover:bg-surface rounded transition-colors"
            title="List"
          >
            <FiList size={14} />
          </button>
          <button
            onClick={formatLink}
            className="p-2 text-textAccent hover:text-textOnSurface hover:bg-surface rounded transition-colors"
            title="Link (Cmd+K)"
          >
            <FiLink size={14} />
          </button>
          
          <div className="flex-1" />
          
          {content.trim() && (
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`p-2 rounded transition-colors ${
                isPreview 
                  ? 'text-primary bg-primary/10' 
                  : 'text-textAccent hover:text-textOnSurface hover:bg-surface'
              }`}
              title={`${isPreview ? 'Edit' : 'Preview'} (Cmd+Enter)`}
            >
              {isPreview ? <FiEdit3 size={14} /> : <FiEye size={14} />}
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="relative">
        {showPreview ? (
          /* Preview Mode */
          <div
            onClick={handlePreviewClick}
            className={`prose prose-sm max-w-none p-4 bg-background border border-border rounded-lg cursor-text hover:bg-surface/50 transition-colors ${
              showToolbar ? 'rounded-t-none' : ''
            }`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {!isEditing && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiEdit3 size={14} className="text-textAccent" />
              </div>
            )}
          </div>
        ) : (
          /* Edit Mode */
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => setIsEditing(true)}
            placeholder={placeholder}
            className={`w-full p-4 bg-background border border-border rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
              showToolbar ? 'rounded-t-none border-t-0' : ''
            }`}
            style={{ minHeight: '120px' }}
          />
        )}
      </div>

      {/* Help Text */}
      {showToolbar && content.trim() === '' && (
        <div className="text-xs text-textAccent p-2 border-l border-r border-b border-border rounded-b-lg bg-background/50">
          <div className="flex flex-wrap gap-4">
            <span><kbd className="px-1 py-0.5 bg-surface rounded text-xs">Cmd+B</kbd> Bold</span>
            <span><kbd className="px-1 py-0.5 bg-surface rounded text-xs">Cmd+I</kbd> Italic</span>
            <span><kbd className="px-1 py-0.5 bg-surface rounded text-xs">Cmd+K</kbd> Link</span>
            <span><kbd className="px-1 py-0.5 bg-surface rounded text-xs">Cmd+Enter</kbd> Preview</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;