import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { IconType } from 'react-icons';

interface ProjectSectionProps {
  title: string;
  Icon: IconType;
  items: any[];
  emptyMessage: string;
  showAddButton?: boolean;
  onAddItem?: () => void;
  renderItem: (item: any) => React.ReactNode;
  renderCustomContent?: () => React.ReactNode;
  maxHeight?: string;
}

export const ProjectSection: React.FC<ProjectSectionProps> = ({
  title,
  Icon,
  items,
  emptyMessage,
  showAddButton = false,
  onAddItem,
  renderItem,
  renderCustomContent,
  maxHeight = "max-h-80"
}) => {
  return (
    <section className="p-4 sm:p-6 bg-surface rounded-lg shadow-sm border border-border/30 transition-all duration-200 hover:shadow-md group">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-textOnSurface flex items-center">
          <Icon className="mr-3 text-primary group-hover:scale-110 transition-transform duration-200" size={20} />
          {title}
          <span className="text-sm text-textAccent ml-2 font-normal">({items.length})</span>
        </h2>
        {showAddButton && onAddItem && (
          <button 
            onClick={onAddItem} 
            className="flex items-center bg-primary text-textOnPrimary hover:bg-primary-dark font-medium py-2 px-3 rounded-lg shadow-sm transition-all duration-200 text-sm hover:shadow-md transform hover:scale-[1.02]"
          >
            <FiPlus className="mr-2" size={14} /> Adicionar
          </button>
        )}
      </div>

      {renderCustomContent ? (
        <div className="bg-background/30 rounded-lg p-4">
          {renderCustomContent()}
        </div>
      ) : items.length > 0 ? (
        <div className="bg-background/20 rounded-lg p-4">
          <ul className={`space-y-3 ${maxHeight} overflow-y-auto pr-2`}>
            {items.map(item => (
              <li key={item.id} className="bg-surface rounded-lg p-3 border border-border/30 transition-all duration-200 hover:shadow-sm hover:border-primary/20">
                {renderItem(item)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-8 px-4 bg-background/20 rounded-lg border border-dashed border-border">
          <Icon className="mx-auto mb-3 text-textAccent/60" size={28} />
          <p className="text-textAccent/70 text-sm mb-3">{emptyMessage}</p>
          {showAddButton && onAddItem && (
            <button 
              onClick={onAddItem}
              className="inline-flex items-center text-primary hover:text-primary-dark text-sm font-medium transition-colors hover:bg-primary/10 px-3 py-2 rounded-lg"
            >
              <FiPlus className="mr-1" size={14} /> Adicionar o primeiro item
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default ProjectSection;