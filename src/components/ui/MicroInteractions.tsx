import React, { useState, useEffect } from 'react';

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  message?: string;
}

interface MicroInteractionsProps {
  isEnabled?: boolean;
}

const MicroInteractions: React.FC<MicroInteractionsProps> = ({ isEnabled = true }) => {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // Listen for custom events to trigger micro-interactions
  useEffect(() => {
    if (!isEnabled) return;

    const handleProjectCreated = (_e: Event) => {
      triggerReaction('🎉', 'Nova caixa criada!', { x: window.innerWidth / 2, y: 200 });
    };

    const handleProjectCompleted = (_e: Event) => {
      triggerReaction('🏆', 'Projeto finalizado!', { x: window.innerWidth / 2, y: 200 });
    };

    const handleTaskCompleted = (_e: Event) => {
      const reactions = ['✅', '🎯', '💪', '⚡', '🌟'];
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      triggerReaction(randomReaction, undefined, { 
        x: Math.random() * (window.innerWidth - 200) + 100, 
        y: Math.random() * 200 + 150 
      });
    };

    const handleSuccessfulMove = (_e: Event) => {
      triggerReaction('✨', 'Movido com sucesso!', { 
        x: Math.random() * (window.innerWidth - 300) + 150, 
        y: Math.random() * 100 + 100 
      });
    };

    const handleMilestoneReached = (_e: Event) => {
      triggerReaction('🚀', 'Marco alcançado!', { x: window.innerWidth / 2, y: 150 });
    };

    // Attach event listeners
    window.addEventListener('projectCreated', handleProjectCreated as EventListener);
    window.addEventListener('projectCompleted', handleProjectCompleted as EventListener);
    window.addEventListener('taskCompleted', handleTaskCompleted as EventListener);
    window.addEventListener('successfulMove', handleSuccessfulMove as EventListener);
    window.addEventListener('milestoneReached', handleMilestoneReached as EventListener);

    return () => {
      window.removeEventListener('projectCreated', handleProjectCreated as EventListener);
      window.removeEventListener('projectCompleted', handleProjectCompleted as EventListener);
      window.removeEventListener('taskCompleted', handleTaskCompleted as EventListener);
      window.removeEventListener('successfulMove', handleSuccessfulMove as EventListener);
      window.removeEventListener('milestoneReached', handleMilestoneReached as EventListener);
    };
  }, [isEnabled]);

  const triggerReaction = (emoji: string, message?: string, position?: { x: number; y: number }) => {
    const id = `reaction-${Date.now()}-${Math.random()}`;
    const defaultPos = { 
      x: Math.random() * (window.innerWidth - 100) + 50, 
      y: Math.random() * 200 + 100 
    };
    
    const newReaction: FloatingReaction = {
      id,
      emoji,
      message: message || '',
      x: position?.x || defaultPos.x,
      y: position?.y || defaultPos.y
    };

    setReactions(prev => [...prev, newReaction]);

    // Remove after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  // Add interaction effects to common UI elements
  useEffect(() => {
    if (!isEnabled) return;

    const addHoverEffects = () => {
      // Add ripple effect to buttons
      const buttons = document.querySelectorAll('button:not([data-micro-enhanced])');
      buttons.forEach(button => {
        button.setAttribute('data-micro-enhanced', 'true');
        
        button.addEventListener('click', (_e) => {
          const ripple = document.createElement('span');
          ripple.className = 'absolute inset-0 rounded-inherit animate-ping bg-white/30 pointer-events-none z-10';
          ripple.style.animationDuration = '0.6s';
          
          if ((button as HTMLElement).style.position !== 'absolute' && (button as HTMLElement).style.position !== 'relative') {
            (button as HTMLElement).style.position = 'relative';
          }
          
          button.appendChild(ripple);
          
          setTimeout(() => {
            ripple.remove();
          }, 600);
        });
      });

      // Add subtle glow to interactive cards
      const cards = document.querySelectorAll('[data-project-id]:not([data-micro-enhanced])');
      cards.forEach(card => {
        card.setAttribute('data-micro-enhanced', 'true');
        
        card.addEventListener('mouseenter', () => {
          (card as HTMLElement).style.boxShadow = '0 8px 32px rgba(138, 5, 190, 0.15), 0 0 0 1px rgba(138, 5, 190, 0.1)';
          (card as HTMLElement).style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        
        card.addEventListener('mouseleave', () => {
          (card as HTMLElement).style.boxShadow = '';
        });
      });
    };

    // Initial setup
    addHoverEffects();
    
    // Re-run when DOM changes (for new elements)
    const observer = new MutationObserver(() => {
      setTimeout(addHoverEffects, 100);
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <>
      {/* Floating reactions */}
      {reactions.map(reaction => (
        <div
          key={reaction.id}
          className="fixed z-60 pointer-events-none select-none"
          style={{ 
            left: reaction.x, 
            top: reaction.y,
            animation: 'nubank-float-up 3s ease-out forwards'
          }}
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="text-4xl animate-nubank-float">
              {reaction.emoji}
            </div>
            {reaction.message && (
              <div className="bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 text-white px-3 py-1 rounded-nubank text-sm font-semibold shadow-nubank-elevated whitespace-nowrap">
                {reaction.message}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Ambient particles for visual delight */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-nubank-purple-300 to-nubank-pink-300 rounded-full opacity-20 animate-nubank-float"
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 25}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${4 + i}s`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes nubank-float-up {
          0% {
            opacity: 1;
            transform: translateY(0px) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translateY(-20px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.8);
          }
        }
      `}</style>
    </>
  );
};

// Helper function to trigger reactions from anywhere in the app
export const triggerMicroInteraction = (type: 'project-created' | 'project-completed' | 'task-completed' | 'successful-move' | 'milestone-reached', data?: any) => {
  const event = new CustomEvent(type.replace('-', ''), { detail: data });
  window.dispatchEvent(event);
};

export default MicroInteractions;