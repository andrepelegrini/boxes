import React, { useState, useRef, useEffect } from 'react';
import { FiMoreHorizontal } from 'react-icons/fi';

interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  buttonClassName?: string;
  menuClassName?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  items, 
  buttonClassName = '', 
  menuClassName = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`📝 [DROPDOWN] User ${isOpen ? 'closed' : 'opened'} dropdown menu`);
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: DropdownMenuItem) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!item.disabled) {
      console.log(`📝 [DROPDOWN] User clicked menu item: ${item.label}`);
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleButtonClick}
        className={`p-1.5 rounded hover:bg-nubank-gray-100 transition-all duration-200 ${buttonClassName}`}
        aria-label="Menu de opções"
        aria-expanded={isOpen}
      >
        <FiMoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div 
          className={`absolute right-0 mt-2 min-w-[180px] bg-white border border-nubank-gray-200 rounded-lg shadow-nubank-elevated z-50 overflow-hidden animate-nubank-fade-in ${menuClassName}`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={handleItemClick(item)}
              disabled={item.disabled}
              className={`
                w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors duration-200
                ${item.disabled 
                  ? 'opacity-50 cursor-not-allowed text-nubank-gray-400' 
                  : item.variant === 'danger'
                    ? 'text-nubank-pink-600 hover:bg-nubank-pink-50 hover:text-nubank-pink-700'
                    : 'text-nubank-gray-700 hover:bg-nubank-gray-50 hover:text-nubank-gray-900'
                }
              `}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;