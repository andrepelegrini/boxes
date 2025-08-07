import React, { useMemo } from 'react';
import { FiCalendar, FiPlus, FiClock } from 'react-icons/fi';
import { Project, EventItem } from '../../../types/app';

interface ProjectTimelineProps {
  project: Project;
  events: EventItem[];
  onScheduleMeeting: () => void;
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  events,
  onScheduleMeeting,
}) => {
  const timelineData = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingEvents = events
      .filter(event => new Date(event.date) > today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);

    const thisWeek = upcomingEvents.filter(event => new Date(event.date) <= nextWeek);
    const laterEvents = upcomingEvents.filter(event => new Date(event.date) > nextWeek);

    return {
      thisWeek,
      laterEvents,
      hasEvents: upcomingEvents.length > 0
    };
  }, [events]);

  const formatEventDate = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    if (eventDate.toDateString() === today.toDateString()) {
      return `Today at ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    if (eventDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(eventDate);
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
      case 'urgent':
        return 'border-danger-DEFAULT bg-danger-DEFAULT/5 text-danger-DEFAULT';
      case 'soon':
        return 'border-warning-DEFAULT bg-warning-DEFAULT/5 text-warning-DEFAULT';
      default:
        return 'border-accent bg-accent/5 text-accent';
    }
  };

  if (!timelineData.hasEvents) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCalendar className="w-8 h-8 text-accent" />
        </div>
        
        <h4 className="font-medium text-textOnSurface mb-2">
          No upcoming events
        </h4>
        <p className="text-sm text-textAccent mb-6 max-w-sm mx-auto leading-relaxed">
          Keep your project on track by scheduling regular check-ins and milestones.
        </p>
        
        <button
          onClick={onScheduleMeeting}
          className="bg-accent text-white py-2 px-4 rounded-nubank font-medium hover:bg-accent/90 transition-colors flex items-center gap-2 mx-auto"
        >
          <FiPlus className="w-4 h-4" />
          Schedule First Event
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* This Week Section */}
      {timelineData.thisWeek.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-textOnSurface mb-3 flex items-center">
            <FiClock className="w-4 h-4 mr-2 text-accent" />
            This Week
          </h4>
          <div className="space-y-2">
            {timelineData.thisWeek.map((event) => {
              const urgency = getEventUrgency(event.date);
              return (
                <div
                  key={event.id}
                  className={`p-3 rounded-nubank border ${getUrgencyColor(urgency)} hover:shadow-sm transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-current mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <h5 className="font-medium text-sm text-textOnSurface">
                        {event.name}
                      </h5>
                      <p className="text-xs text-current mt-1">
                        {formatEventDate(event.date)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Later Events Section */}
      {timelineData.laterEvents.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-textOnSurface mb-3 flex items-center">
            <FiCalendar className="w-4 h-4 mr-2 text-primary" />
            Coming Up
          </h4>
          <div className="space-y-2">
            {timelineData.laterEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-nubank border border-border bg-nubank-gray-50 hover:bg-background hover:shadow-sm transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-textOnSurface">
                      {event.name}
                    </h5>
                    <p className="text-xs text-textAccent mt-1">
                      {formatEventDate(event.date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add */}
      <div className="border-t border-border pt-4">
        <button
          onClick={onScheduleMeeting}
          className="w-full text-sm text-accent hover:text-accent/80 transition-colors py-2 px-3 border border-accent/20 rounded-nubank hover:bg-accent/5 flex items-center justify-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          Add Event
        </button>
      </div>
    </div>
  );
};