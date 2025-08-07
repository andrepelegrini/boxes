import React, { useState, useCallback, useEffect } from 'react';
import { FiPlus, FiX, FiType, FiList, FiCode, FiMinus, FiMove } from 'react-icons/fi';
import { useAppContext } from '../contexts/SimplifiedRootProvider';

// Define types inline since the file doesn't exist
export type TaskBlockType = 'text' | 'heading' | 'list' | 'code' | 'quote' | 'divider';

export interface TaskBlock {
  id: string;
  type: TaskBlockType;
  content: any;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskContent {
  blocks: TaskBlock[];
  version: number;
  lastEditedAt: string;
  lastEditedBy: string;
}

interface TaskContentEditorProps {
  content?: TaskContent;
  onContentChange?: (content: TaskContent) => void;
  readOnly?: boolean;
}

export const TaskContentEditor: React.FC<TaskContentEditorProps> = ({
  content,
  onContentChange,
  readOnly = false
}) => {
  const { currentUser } = useAppContext();
  const [blocks, setBlocks] = useState<TaskBlock[]>(content?.blocks || []);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  // Initialize with a text block if no content exists
  useEffect(() => {
    if (!content || content.blocks.length === 0) {
      const initialBlock: TaskBlock = {
        id: `block-${Date.now()}`,
        type: 'text',
        content: '',
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setBlocks([initialBlock]);
    } else {
      setBlocks(content.blocks.sort((a: TaskBlock, b: TaskBlock) => a.order - b.order));
    }
  }, [content]);

  // Emit changes to parent
  const emitContentChange = useCallback((newBlocks: TaskBlock[]) => {
    if (!onContentChange) return;

    const updatedContent: TaskContent = {
      blocks: newBlocks,
      version: (content?.version || 0) + 1,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: currentUser?.email || currentUser?.name || 'Unknown User'
    };

    onContentChange(updatedContent);
  }, [content?.version, onContentChange, currentUser]);

  // Update blocks and emit changes
  const updateBlocks = useCallback((newBlocks: TaskBlock[]) => {
    // Reorder blocks
    const orderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      order: index,
      updatedAt: new Date().toISOString()
    }));

    setBlocks(orderedBlocks);
    emitContentChange(orderedBlocks);
  }, [emitContentChange]);

  // Add new block
  const addBlock = useCallback((type: TaskBlockType, afterIndex?: number) => {
    const newBlock: TaskBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: getDefaultContent(type),
      order: afterIndex !== undefined ? afterIndex + 1 : blocks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newBlocks = [...blocks];
    if (afterIndex !== undefined) {
      newBlocks.splice(afterIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Update block content
  const updateBlockContent = useCallback((blockId: string, content: any) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId
        ? { ...block, content, updatedAt: new Date().toISOString() }
        : block
    );
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Delete block
  const deleteBlock = useCallback((blockId: string) => {
    if (blocks.length === 1) return; // Don't delete the last block
    
    const newBlocks = blocks.filter(block => block.id !== blockId);
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      return;
    }

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedBlockId(null);
      return;
    }

    const newBlocks = [...blocks];
    const draggedBlock = newBlocks.splice(draggedIndex, 1)[0];
    newBlocks.splice(targetIndex, 0, draggedBlock);

    updateBlocks(newBlocks);
    setDraggedBlockId(null);
  }, [draggedBlockId, blocks, updateBlocks]);

  // Get default content for block type
  const getDefaultContent = (type: TaskBlockType): any => {
    switch (type) {
      case 'text':
        return '';
      case 'heading':
        return { level: 2, text: '' };
      case 'list':
        return { items: [''], ordered: false };
      case 'code':
        return { code: '', language: 'javascript' };
      case 'quote':
        return '';
      case 'divider':
        return null;
      default:
        return '';
    }
  };

  // Render block add menu
  const renderBlockMenu = (afterIndex?: number) => {
    if (readOnly) return null;

    const blockTypes = [
      { type: 'text' as TaskBlockType, icon: FiType, label: 'Text' },
      { type: 'heading' as TaskBlockType, icon: FiType, label: 'Heading' },
      { type: 'list' as TaskBlockType, icon: FiList, label: 'List' },
      { type: 'code' as TaskBlockType, icon: FiCode, label: 'Code' },
      { type: 'quote' as TaskBlockType, icon: FiMinus, label: 'Quote' },
      { type: 'divider' as TaskBlockType, icon: FiMinus, label: 'Divider' }
    ];

    return (
      <div className="flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1 bg-surface border border-border rounded-lg p-1 shadow-sm">
          {blockTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => addBlock(type, afterIndex)}
              className="p-2 text-textAccent hover:text-textOnSurface hover:bg-background rounded transition-colors"
              title={`Add ${label}`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render individual block
  const renderBlock = (block: TaskBlock, index: number) => {
    const isBeingDragged = draggedBlockId === block.id;

    return (
      <div
        key={block.id}
        className={`group relative ${isBeingDragged ? 'opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, block.id)}
      >
        <div className="flex items-start space-x-2">
          {/* Drag Handle */}
          {!readOnly && (
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              className="flex-shrink-0 p-1 text-textAccent/40 hover:text-textAccent opacity-0 group-hover:opacity-100 transition-all cursor-grab mt-2"
              title="Drag to reorder"
            >
              <FiMove size={14} />
            </button>
          )}

          {/* Block Content */}
          <div className="flex-1 min-w-0">
            {renderBlockContent(block)}
          </div>

          {/* Delete Button */}
          {!readOnly && blocks.length > 1 && (
            <button
              onClick={() => deleteBlock(block.id)}
              className="flex-shrink-0 p-1 text-textAccent/40 hover:text-danger-DEFAULT opacity-0 group-hover:opacity-100 transition-all mt-2"
              title="Delete block"
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        {/* Add Block Menu */}
        {!readOnly && renderBlockMenu(index)}
      </div>
    );
  };

  // Render block content based on type
  const renderBlockContent = (block: TaskBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="my-2">
            <textarea
              value={block.content}
              onChange={(e) => updateBlockContent(block.id, e.target.value)}
              placeholder="Type something..."
              className="w-full bg-transparent border-none outline-none text-textOnSurface placeholder-textAccent resize-none"
              rows={1}
            />
          </div>
        );

      case 'heading':
        return (
          <div className="my-4">
            {readOnly ? (
              <h2 className="text-xl font-bold text-textOnSurface">
                {block.content.text || 'Untitled'}
              </h2>
            ) : (
              <input
                type="text"
                value={block.content.text || ''}
                onChange={(e) => updateBlockContent(block.id, { ...block.content, text: e.target.value })}
                placeholder="Heading..."
                className="w-full text-xl font-bold bg-transparent border-none outline-none text-textOnSurface placeholder-textAccent"
              />
            )}
          </div>
        );

      case 'list':
        return (
          <div className="my-2">
            {readOnly ? (
              <ul className="space-y-1">
                {block.content.items?.map((item: string, i: number) => (
                  <li key={i} className="text-textOnSurface">
                    • {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                {block.content.items?.map((item: string, i: number) => (
                  <div key={i} className="flex items-center space-x-2">
                    <span className="text-textAccent">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...block.content.items];
                        newItems[i] = e.target.value;
                        updateBlockContent(block.id, { ...block.content, items: newItems });
                      }}
                      placeholder="List item..."
                      className="flex-1 bg-transparent border-none outline-none text-textOnSurface placeholder-textAccent"
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newItems = [...(block.content.items || []), ''];
                    updateBlockContent(block.id, { ...block.content, items: newItems });
                  }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  + Add item
                </button>
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <div className="my-2">
            {readOnly ? (
              <pre className="bg-background border border-border rounded p-3 text-sm overflow-x-auto">
                <code>{block.content.code || ''}</code>
              </pre>
            ) : (
              <div className="bg-background border border-border rounded">
                <div className="px-3 py-2 border-b border-border">
                  <select
                    value={block.content.language || 'javascript'}
                    onChange={(e) => updateBlockContent(block.id, { ...block.content, language: e.target.value })}
                    className="text-sm bg-transparent border-none outline-none text-textAccent"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="css">CSS</option>
                    <option value="html">HTML</option>
                    <option value="bash">Bash</option>
                  </select>
                </div>
                <textarea
                  value={block.content.code || ''}
                  onChange={(e) => updateBlockContent(block.id, { ...block.content, code: e.target.value })}
                  placeholder="Enter code..."
                  className="w-full p-3 bg-transparent border-none outline-none font-mono text-sm resize-none"
                  rows={6}
                />
              </div>
            )}
          </div>
        );

      case 'quote':
        return (
          <div className="my-4">
            <div className="border-l-4 border-primary pl-4">
              {readOnly ? (
                <p className="text-textOnSurface italic">{block.content || 'Empty quote'}</p>
              ) : (
                <textarea
                  value={block.content || ''}
                  onChange={(e) => updateBlockContent(block.id, e.target.value)}
                  placeholder="Quote..."
                  className="w-full bg-transparent border-none outline-none text-textOnSurface placeholder-textAccent italic resize-none"
                  rows={2}
                />
              )}
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="my-6">
            <hr className="border-border" />
          </div>
        );

      default:
        return <div className="my-2 text-textAccent">Unknown block type: {block.type}</div>;
    }
  };

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => renderBlock(block, index))}
      
      {/* Final add block button */}
      {!readOnly && (
        <div className="py-4 text-center">
          <button
            onClick={() => addBlock('text')}
            className="inline-flex items-center space-x-2 px-4 py-2 text-textAccent hover:text-textOnSurface hover:bg-surface rounded transition-colors"
          >
            <FiPlus size={16} />
            <span>Add block</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskContentEditor;