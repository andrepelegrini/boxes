import React, { useState, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import { EventItem } from '../../types/app';

interface CalendarViewProps {
  events: EventItem[];
  onEventClick?: (event: EventItem) => void;
  view?: 'month' | 'week';
}

interface ViewToggleProps {
  currentView: 'month' | 'week';
  onViewChange: (view: 'month' | 'week') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onViewChange('month')}
        className={`px-3 py-1 text-sm rounded-nubank transition-colors ${
          currentView === 'month'
            ? 'bg-nubank-blue-600 text-white'
            : 'text-nubank-gray-600 hover:bg-nubank-gray-100'
        }`}
      >
        Month
      </button>
      <button
        onClick={() => onViewChange('week')}
        className={`px-3 py-1 text-sm rounded-nubank transition-colors ${
          currentView === 'week'
            ? 'bg-nubank-blue-600 text-white'
            : 'text-nubank-gray-600 hover:bg-nubank-gray-100'
        }`}
      >
        Week
      </button>
    </div>
  );
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onEventClick,
  view = 'month'
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week'>(view);

  const { calendarDays, monthLabel, weekDays } = useMemo(() => {
    const now = new Date(currentDate);
    const year = now.getFullYear();
    const month = now.getMonth();

    if (currentView === 'week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);

      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
      });

      const monthLabel = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
      }).format(now);

      return { calendarDays: weekDays, monthLabel, weekDays };
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const calendarDays: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      calendarDays.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const monthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(firstDay);

    return { calendarDays, monthLabel, weekDays: [] };
  }, [currentDate, currentView]);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getEventUrgency = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const hoursDiff = (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff <= 24) return 'urgent';
    if (hoursDiff <= 72) return 'soon';
    return 'upcoming';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500';
      case 'soon': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  if (currentView === 'week') {
    return (
      <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-nubank-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-nubank-gray-800">{monthLabel}</h3>
            <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-nubank-gray-100 rounded-nubank transition-colors"
            >
              <FiChevronLeft className="w-5 h-5 text-nubank-gray-600" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm text-nubank-blue-600 hover:bg-nubank-blue-50 rounded-nubank transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-nubank-gray-100 rounded-nubank transition-colors"
            >
              <FiChevronRight className="w-5 h-5 text-nubank-gray-600" />
            </button>
          </div>
        </div>

        {/* Week View */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-nubank-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1" style={{ minHeight: '400px' }}>
            {weekDays.map((date, index) => {
              const dayEvents = getEventsForDate(date);
              const todayClass = isToday(date) ? 'bg-nubank-blue-50 border-nubank-blue-200' : 'border-nubank-gray-100';
              
              return (
                <div
                  key={index}
                  className={`border-2 rounded-nubank p-2 ${todayClass} hover:bg-nubank-gray-50 transition-colors`}
                >
                  <div className={`text-sm font-medium mb-2 ${isToday(date) ? 'text-nubank-blue-700' : 'text-nubank-gray-700'}`}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const urgency = getEventUrgency(event.date);
                      return (
                        <div
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          className="text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-all"
                          style={{ backgroundColor: `${getUrgencyColor(urgency)}15` }}
                        >
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getUrgencyColor(urgency)}`} />
                            <span className="truncate font-medium">{event.name}</span>
                          </div>
                          {event.date && (
                            <div className="text-nubank-gray-500 mt-1">
                              <FiClock className="w-3 h-3 inline mr-1" />
                              {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-nubank-gray-500 text-center py-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-nubank-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-nubank-gray-800">{monthLabel}</h3>
          <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-nubank-gray-100 rounded-nubank transition-colors"
          >
            <FiChevronLeft className="w-5 h-5 text-nubank-gray-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm text-nubank-blue-600 hover:bg-nubank-blue-50 rounded-nubank transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-nubank-gray-100 rounded-nubank transition-colors"
          >
            <FiChevronRight className="w-5 h-5 text-nubank-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-nubank-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const todayClass = isToday(date) ? 'bg-nubank-blue-50 border-nubank-blue-200' : 'border-nubank-gray-100';
            const currentMonthClass = isCurrentMonth(date) ? 'text-nubank-gray-900' : 'text-nubank-gray-400';
            
            return (
              <div
                key={index}
                className={`min-h-[100px] border-2 rounded-nubank p-2 ${todayClass} hover:bg-nubank-gray-50 transition-colors`}
              >
                <div className={`text-sm font-medium mb-2 ${isToday(date) ? 'text-nubank-blue-700' : currentMonthClass}`}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => {
                    const urgency = getEventUrgency(event.date);
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-all"
                        style={{ backgroundColor: `${getUrgencyColor(urgency)}15` }}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getUrgencyColor(urgency)}`} />
                          <span className="truncate font-medium">{event.name}</span>
                        </div>
                        {event.date && (
                          <div className="text-nubank-gray-500 mt-1">
                            <FiClock className="w-3 h-3 inline mr-1" />
                            {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-nubank-gray-500 text-center py-1">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};