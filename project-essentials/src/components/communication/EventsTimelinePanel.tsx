import React, { useState, useMemo } from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiUser, 
  FiMessageSquare,
  FiPlus,
  FiAlertTriangle,
  FiTarget,
  FiUsers,
  FiFlag,
  FiZap
} from 'react-icons/fi';

export interface DetectedEvent {
  id: string;
  type: 'launch' | 'decision' | 'milestone' | 'meeting' | 'issue' | 'deadline';
  title: string;
  description: string;
  date: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  sourceMessage: {
    text: string;
    user: string;
    timestamp: string;
    channelName: string;
    channelId: string;
  };
  participants: string[];
  tags: string[];
  importance: 'low' | 'medium' | 'high';
  status: 'pending' | 'added' | 'dismissed';
  createdAt: string;
}

interface EventsTimelinePanelProps {
  events: DetectedEvent[];
  isLoading: boolean;
  onAddToCalendar: (eventId: string) => Promise<void>;
  onDismissEvent: (eventId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const EventsTimelinePanel: React.FC<EventsTimelinePanelProps> = ({
  events,
  isLoading,
  onAddToCalendar,
  onDismissEvent,
  onRefresh,
}) => {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const pendingEvents = events.filter(event => event.status === 'pending');

  const filteredEvents = useMemo(() => {
    let filtered = pendingEvents;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType);
    }

    // Filter by time range
    const now = new Date();
    const timeRangeMs = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity
    };

    if (timeRange !== 'all') {
      const cutoff = now.getTime() - timeRangeMs[timeRange];
      filtered = filtered.filter(event => 
        new Date(event.date).getTime() >= cutoff
      );
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [pendingEvents, filterType, timeRange]);

  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: DetectedEvent[] } = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.date);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    return groups;
  }, [filteredEvents]);

  const toggleSelection = (eventId: string) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEvents(newSelection);
  };

  const handleBulkAdd = async () => {
    for (const eventId of selectedEvents) {
      await onAddToCalendar(eventId);
    }
    setSelectedEvents(new Set());
  };

  const handleBulkDismiss = async () => {
    for (const eventId of selectedEvents) {
      await onDismissEvent(eventId);
    }
    setSelectedEvents(new Set());
  };

  if (pendingEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-textOnSurface mb-2">
          Nenhum evento detectado
        </h3>
        <p className="text-textAccent mb-4">
          Não há eventos pendentes detectados nas conversas do Slack.
        </p>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Verificando...' : 'Verificar Eventos'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-md">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-sm transition-colors ${
                viewMode === 'timeline' 
                  ? 'bg-primary text-white' 
                  : 'text-textAccent hover:text-textOnSurface'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm transition-colors ${
                viewMode === 'list' 
                  ? 'bg-primary text-white' 
                  : 'text-textAccent hover:text-textOnSurface'
              }`}
            >
              Lista
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border border-border rounded-md text-sm bg-surface"
          >
            <option value="all">Todos os tipos</option>
            <option value="launch">Lançamentos</option>
            <option value="decision">Decisões</option>
            <option value="milestone">Marcos</option>
            <option value="meeting">Reuniões</option>
            <option value="issue">Problemas</option>
            <option value="deadline">Prazos</option>
          </select>

          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border border-border rounded-md text-sm bg-surface"
          >
            <option value="today">Hoje</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mês</option>
            <option value="all">Todos</option>
          </select>
        </div>

        <div className="text-sm text-textAccent">
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEvents.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">
            {selectedEvents.size} evento{selectedEvents.size !== 1 ? 's' : ''} selecionado{selectedEvents.size !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkAdd}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              Adicionar ao Calendário
            </button>
            <button
              onClick={handleBulkDismiss}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
            >
              Dispensar
            </button>
            <button
              onClick={() => setSelectedEvents(new Set())}
              className="px-3 py-1 border border-blue-300 text-blue-700 text-sm rounded hover:bg-blue-100 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Events Display */}
      {viewMode === 'timeline' ? (
        <TimelineView
          groupedEvents={groupedEvents}
          selectedEvents={selectedEvents}
          onToggleSelect={toggleSelection}
          onAddToCalendar={onAddToCalendar}
          onDismissEvent={onDismissEvent}
        />
      ) : (
        <ListView
          events={filteredEvents}
          selectedEvents={selectedEvents}
          onToggleSelect={toggleSelection}
          onAddToCalendar={onAddToCalendar}
          onDismissEvent={onDismissEvent}
        />
      )}
    </div>
  );
};

// Timeline View Component
const TimelineView: React.FC<{
  groupedEvents: { [key: string]: DetectedEvent[] };
  selectedEvents: Set<string>;
  onToggleSelect: (eventId: string) => void;
  onAddToCalendar: (eventId: string) => void;
  onDismissEvent: (eventId: string) => void;
}> = ({ groupedEvents, selectedEvents, onToggleSelect, onAddToCalendar, onDismissEvent }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, events]) => (
          <div key={date} className="relative">
            {/* Date Header */}
            <div className="sticky top-0 bg-background z-10 pb-2">
              <h3 className="text-lg font-semibold text-textOnSurface flex items-center">
                <FiCalendar className="w-5 h-5 mr-2 text-primary" />
                {formatDate(date)}
                <span className="ml-2 text-sm font-normal text-textAccent">
                  ({events.length} evento{events.length !== 1 ? 's' : ''})
                </span>
              </h3>
            </div>

            {/* Timeline */}
            <div className="relative pl-8">
              {/* Timeline Line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

              {/* Events */}
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="relative">
                    {/* Timeline Dot */}
                    <div className="absolute -left-6 top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                    <EventCard
                      event={event}
                      isSelected={selectedEvents.has(event.id)}
                      onToggleSelect={() => onToggleSelect(event.id)}
                      onAddToCalendar={() => onAddToCalendar(event.id)}
                      onDismissEvent={() => onDismissEvent(event.id)}
                      showDate={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

// List View Component
const ListView: React.FC<{
  events: DetectedEvent[];
  selectedEvents: Set<string>;
  onToggleSelect: (eventId: string) => void;
  onAddToCalendar: (eventId: string) => void;
  onDismissEvent: (eventId: string) => void;
}> = ({ events, selectedEvents, onToggleSelect, onAddToCalendar, onDismissEvent }) => {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          isSelected={selectedEvents.has(event.id)}
          onToggleSelect={() => onToggleSelect(event.id)}
          onAddToCalendar={() => onAddToCalendar(event.id)}
          onDismissEvent={() => onDismissEvent(event.id)}
          showDate={true}
        />
      ))}
    </div>
  );
};

// Event Card Component
const EventCard: React.FC<{
  event: DetectedEvent;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAddToCalendar: () => void;
  onDismissEvent: () => void;
  showDate: boolean;
}> = ({ event, isSelected, onToggleSelect, onAddToCalendar, onDismissEvent, showDate }) => {
  const getEventTypeIcon = (type: DetectedEvent['type']) => {
    switch (type) {
      case 'launch':
        return <FiZap className="w-4 h-4 text-green-500" />;
      case 'decision':
        return <FiTarget className="w-4 h-4 text-blue-500" />;
      case 'milestone':
        return <FiFlag className="w-4 h-4 text-purple-500" />;
      case 'meeting':
        return <FiUsers className="w-4 h-4 text-orange-500" />;
      case 'issue':
        return <FiAlertTriangle className="w-4 h-4 text-red-500" />;
      case 'deadline':
        return <FiClock className="w-4 h-4 text-yellow-500" />;
      default:
        return <FiCalendar className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventTypeColor = (type: DetectedEvent['type']) => {
    switch (type) {
      case 'launch':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'decision':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'milestone':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'meeting':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'issue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'deadline':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImportanceColor = (importance: DetectedEvent['importance']) => {
    switch (importance) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      isSelected ? 'border-blue-300 bg-blue-50' : 'border-border bg-surface hover:bg-secondary-light'
    }`}>
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getEventTypeIcon(event.type)}
              <h4 className="font-medium text-textOnSurface">
                {event.title}
              </h4>
              <span className={`px-2 py-0.5 text-xs rounded border ${getEventTypeColor(event.type)}`}>
                {event.type}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getImportanceColor(event.importance)}`} />
              <span className="text-xs text-textAccent">
                {Math.round(event.confidence * 100)}%
              </span>
            </div>
          </div>
          
          <p className="text-sm text-textAccent mb-2">
            {event.description}
          </p>
          
          <div className="flex items-center text-xs text-textAccent mb-3 space-x-4">
            {showDate && (
              <div className="flex items-center space-x-1">
                <FiCalendar className="w-3 h-3" />
                <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <FiUser className="w-3 h-3" />
              <span>{event.sourceMessage.user}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FiMessageSquare className="w-3 h-3" />
              <span>#{event.sourceMessage.channelName}</span>
            </div>
          </div>
          
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="bg-secondary-light rounded p-2 mb-3">
            <p className="text-xs text-textAccent italic">
              "{event.sourceMessage.text}"
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onAddToCalendar}
              className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <FiPlus className="w-3 h-3 mr-1" />
              Adicionar ao Calendário
            </button>
            <button
              onClick={onDismissEvent}
              className="px-3 py-1 border border-border text-textAccent text-sm rounded hover:bg-secondary-light transition-colors"
            >
              Dispensar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsTimelinePanel;