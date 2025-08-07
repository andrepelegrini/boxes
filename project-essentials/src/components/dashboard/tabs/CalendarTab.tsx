import React, { useMemo, useState } from 'react';
import { FiCalendar, FiPlus, FiClock, FiExternalLink, FiMapPin, FiUsers, FiList } from 'react-icons/fi';
import { Project, EventItem } from '../../../types/app';
import { ProjectTimeline } from '../widgets/ProjectTimeline';
import { useAppContext } from '../../../contexts/SimplifiedRootProvider';
import CreateEventModal from '../../modal/CreateEventModal';
import { CalendarView } from '../../calendar/CalendarView';

interface CalendarTabProps {
  project: Project;
  events: EventItem[];
  onScheduleMeeting: () => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  project,
  events,
  onScheduleMeeting,
}) => {
  const { addEvent, addProjectCheckIn, setCurrentEditingProjectForEvent, showCreateEventModal, setShowCreateEventModal } = useAppContext();
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showAllEventsModal, setShowAllEventsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const timelineData = useMemo(() => {
    const today = new Date();
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const upcomingEvents = events
      .filter(event => new Date(event.date) > today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pastEvents = events
      .filter(event => new Date(event.date) <= today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return {
      thisWeek: upcomingEvents.filter(event => new Date(event.date) <= thisWeek),
      nextWeek: upcomingEvents.filter(event => new Date(event.date) > thisWeek && new Date(event.date) <= nextWeek),
      later: upcomingEvents.filter(event => new Date(event.date) > nextWeek),
      past: pastEvents,
      totalUpcoming: upcomingEvents.length
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

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'border-red-300 bg-red-50 text-red-800';
      case 'soon':
        return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-300 bg-blue-50 text-blue-800';
    }
  };

  const EventCard = ({ event, showDate = true }: { event: EventItem; showDate?: boolean }) => {
    const urgency = getEventUrgency(event.date);
    
    return (
      <div 
        className={`p-4 rounded-nubank-lg border ${getUrgencyStyles(urgency)} hover:shadow-sm transition-all duration-300 group cursor-pointer`}
        onClick={() => handleEventClick(event)}
      >
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-current group-hover:text-nubank-purple-700 transition-colors">
                {event.name}
              </h4>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEventLink(event);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-current hover:text-nubank-purple-700"
              >
                <FiExternalLink className="w-4 h-4" />
              </button>
            </div>
            {showDate && (
              <p className="text-sm text-current mt-1 opacity-80">
                {formatEventDate(event.date)}
              </p>
            )}
            {event.description && (
              <p className="text-sm text-current mt-2 opacity-70 line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-current opacity-60">
              {event.location && (
                <div className="flex items-center gap-1">
                  <FiMapPin className="w-3 h-3" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.attendees && (
                <div className="flex items-center gap-1">
                  <FiUsers className="w-3 h-3" />
                  <span>{event.attendees.length} attendees</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Main Timeline Panel */}
      <div className="col-span-2 space-y-6">
        {/* Timeline Overview */}
        <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
          <div className="p-6 border-b border-nubank-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-nubank-gray-800 flex items-center">
                  <FiCalendar className="w-5 h-5 mr-3 text-nubank-blue-600" />
                  Project Timeline
                </h2>
                <div className="flex gap-1 bg-nubank-gray-100 rounded-nubank-lg p-1">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-1 text-sm rounded-nubank transition-colors flex items-center gap-2 ${
                      viewMode === 'timeline'
                        ? 'bg-white text-nubank-gray-800 shadow-sm'
                        : 'text-nubank-gray-600 hover:text-nubank-gray-800'
                    }`}
                  >
                    <FiList className="w-4 h-4" />
                    Timeline
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1 text-sm rounded-nubank transition-colors flex items-center gap-2 ${
                      viewMode === 'calendar'
                        ? 'bg-white text-nubank-gray-800 shadow-sm'
                        : 'text-nubank-gray-600 hover:text-nubank-gray-800'
                    }`}
                  >
                    <FiCalendar className="w-4 h-4" />
                    Calendar
                  </button>
                </div>
              </div>
              <button
                onClick={onScheduleMeeting}
                className="bg-nubank-blue-600 hover:bg-nubank-blue-700 text-white px-4 py-2 rounded-nubank-lg font-medium transition-colors flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Schedule Event
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {viewMode === 'timeline' ? (
              <ProjectTimeline
                project={project}
                events={events}
                onScheduleMeeting={onScheduleMeeting}
              />
            ) : (
              <CalendarView
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </div>

        {/* Upcoming Events Detail - Only show in timeline mode */}
        {viewMode === 'timeline' && (
        <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
          <div className="p-6 border-b border-nubank-gray-200">
            <h3 className="text-lg font-semibold text-nubank-gray-800 flex items-center">
              <FiClock className="w-5 h-5 mr-3 text-nubank-purple-600" />
              Upcoming Events
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* This Week */}
            {timelineData.thisWeek.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-nubank-gray-700 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  This Week ({timelineData.thisWeek.length})
                </h4>
                <div className="space-y-3">
                  {timelineData.thisWeek.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Next Week */}
            {timelineData.nextWeek.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-nubank-gray-700 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                  Next Week ({timelineData.nextWeek.length})
                </h4>
                <div className="space-y-3">
                  {timelineData.nextWeek.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Later */}
            {timelineData.later.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-nubank-gray-700 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                  Later ({timelineData.later.length})
                </h4>
                <div className="space-y-3">
                  {timelineData.later.slice(0, 3).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                  {timelineData.later.length > 3 && (
                    <div className="text-center py-4">
                      <button 
                        onClick={handleViewMoreEvents}
                        className="text-sm text-nubank-blue-600 hover:text-nubank-blue-700 font-medium"
                      >
                        View {timelineData.later.length - 3} more events
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {timelineData.totalUpcoming === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-nubank-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCalendar className="w-8 h-8 text-nubank-blue-600" />
                </div>
                <h4 className="font-medium text-nubank-gray-600 mb-2">No upcoming events</h4>
                <p className="text-sm text-nubank-gray-500 mb-6">
                  Schedule meetings and milestones to keep your project on track
                </p>
                <button
                  onClick={onScheduleMeeting}
                  className="bg-nubank-blue-600 hover:bg-nubank-blue-700 text-white px-6 py-3 rounded-nubank-lg font-medium transition-colors"
                >
                  Schedule First Event
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Calendar Overview */}
        <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
          <div className="p-6 border-b border-nubank-gray-200">
            <h3 className="text-lg font-semibold text-nubank-gray-800">Calendar Overview</h3>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-nubank-blue-600">{timelineData.thisWeek.length}</div>
                <div className="text-xs text-nubank-gray-600">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-nubank-purple-600">{timelineData.totalUpcoming}</div>
                <div className="text-xs text-nubank-gray-600">Upcoming</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-nubank-gray-600">Total Events</span>
                <span className="font-medium">{events.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-nubank-gray-600">Past Events</span>
                <span className="font-medium text-nubank-gray-500">{timelineData.past.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Past Events */}
        {timelineData.past.length > 0 && (
          <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
            <div className="p-6 border-b border-nubank-gray-200">
              <h3 className="text-lg font-semibold text-nubank-gray-800">Recent History</h3>
            </div>
            
            <div className="p-6 space-y-3">
              {timelineData.past.map((event) => (
                <div key={event.id} className="p-3 bg-nubank-gray-50 rounded-nubank hover:bg-nubank-gray-100 transition-colors">
                  <h4 className="font-medium text-nubank-gray-800 text-sm">{event.name}</h4>
                  <p className="text-xs text-nubank-gray-500 mt-1">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-nubank-blue-50 to-nubank-purple-50 rounded-nubank-lg border border-nubank-blue-200 p-6">
          <h3 className="text-lg font-semibold text-nubank-gray-800 mb-4">Quick Actions</h3>
          
          <div className="space-y-3">
            <button
              onClick={handleScheduleMeeting}
              className="w-full text-left p-3 bg-white/80 hover:bg-white rounded-nubank transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-nubank-blue-100 rounded-nubank flex items-center justify-center">
                <FiCalendar className="w-4 h-4 text-nubank-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-nubank-gray-800">Schedule Meeting</h4>
                <p className="text-xs text-nubank-gray-500">Plan team sync</p>
              </div>
            </button>
            
            <button 
              onClick={handleSetMilestone}
              className="w-full text-left p-3 bg-white/80 hover:bg-white rounded-nubank transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-nubank-purple-100 rounded-nubank flex items-center justify-center">
                <FiMapPin className="w-4 h-4 text-nubank-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-nubank-gray-800">Set Milestone</h4>
                <p className="text-xs text-nubank-gray-500">Mark important date</p>
              </div>
            </button>
            
            <button 
              onClick={handleTeamCheckIn}
              className="w-full text-left p-3 bg-white/80 hover:bg-white rounded-nubank transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-nubank-green-100 rounded-nubank flex items-center justify-center">
                <FiUsers className="w-4 h-4 text-nubank-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-nubank-gray-800">Team Check-in</h4>
                <p className="text-xs text-nubank-gray-500">Regular standup</p>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        projectId={project.id}
      />
      
      {/* Milestone Modal - Simple version using event system */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Set Milestone</h3>
            <form onSubmit={handleMilestoneSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Milestone Name</label>
                  <input
                    type="text"
                    id="milestoneName"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Feature Complete, Beta Release"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Date</label>
                  <input
                    type="datetime-local"
                    id="milestoneDate"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    id="milestoneDescription"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Describe this milestone..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-nubank-purple-600 text-white rounded-md hover:bg-nubank-purple-700"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Team Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Team Check-in</h3>
            <form onSubmit={handleCheckInSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Check-in Type</label>
                  <select
                    id="checkInType"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="daily">Daily Standup</option>
                    <option value="weekly">Weekly Review</option>
                    <option value="milestone">Milestone Review</option>
                    <option value="retrospective">Retrospective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Progress Summary</label>
                  <textarea
                    id="progressSummary"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="What has been accomplished since last check-in?"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Next Steps</label>
                  <textarea
                    id="nextSteps"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="What are the next priorities?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Blockers</label>
                  <textarea
                    id="blockers"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Any issues or blockers to address?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-nubank-green-600 text-white rounded-md hover:bg-nubank-green-700"
                >
                  Save Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{selectedEvent.name}</h3>
              <button
                onClick={() => setShowEventDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Date & Time</label>
                <p className="text-sm">{formatEventDate(selectedEvent.date)}</p>
              </div>
              {selectedEvent.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">Location</label>
                  <p className="text-sm">{selectedEvent.location}</p>
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">Description</label>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-600">Attendees</label>
                  <p className="text-sm">{selectedEvent.attendees.join(', ')}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-600">Type</label>
                <p className="text-sm capitalize">{selectedEvent.type}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEventDetailsModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              {selectedEvent.location && selectedEvent.location.startsWith('http') && (
                <button
                  onClick={() => window.open(selectedEvent.location, '_blank')}
                  className="px-4 py-2 bg-nubank-blue-600 text-white rounded-md hover:bg-nubank-blue-700 flex items-center gap-2"
                >
                  <FiExternalLink className="w-4 h-4" />
                  Join
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* All Events Modal */}
      {showAllEventsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Project Events</h3>
              <button
                onClick={() => setShowAllEventsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {events.length > 0 ? (
                <>
                  {/* Upcoming Events */}
                  {timelineData.thisWeek.length + timelineData.nextWeek.length + timelineData.later.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-700 mb-2">Upcoming Events</h4>
                      <div className="space-y-2">
                        {[...timelineData.thisWeek, ...timelineData.nextWeek, ...timelineData.later].map((event) => (
                          <div
                            key={event.id}
                            className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowAllEventsModal(false);
                              setShowEventDetailsModal(true);
                            }}
                          >
                            <h5 className="font-medium">{event.name}</h5>
                            <p className="text-sm text-gray-600">{formatEventDate(event.date)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Past Events */}
                  {timelineData.past.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-700 mb-2">Past Events</h4>
                      <div className="space-y-2">
                        {timelineData.past.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer opacity-75"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowAllEventsModal(false);
                              setShowEventDetailsModal(true);
                            }}
                          >
                            <h5 className="font-medium">{event.name}</h5>
                            <p className="text-sm text-gray-600">{formatEventDate(event.date)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No events scheduled for this project</p>
                  <button
                    onClick={() => {
                      setShowAllEventsModal(false);
                      onScheduleMeeting();
                    }}
                    className="mt-4 px-4 py-2 bg-nubank-blue-600 text-white rounded-md hover:bg-nubank-blue-700"
                  >
                    Schedule First Event
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAllEventsModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Handler functions
  function handleScheduleMeeting() {
    setCurrentEditingProjectForEvent(project.id);
    setShowCreateEventModal(true);
  }

  function handleSetMilestone() {
    setShowMilestoneModal(true);
  }

  function handleTeamCheckIn() {
    setShowCheckInModal(true);
  }

  function handleEventClick(event: EventItem) {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  }

  function handleOpenEventLink(event: EventItem) {
    // Handle external links for events
    if (event.location && event.location.startsWith('http')) {
      window.open(event.location, '_blank');
    } else if (event.description && event.description.includes('http')) {
      // Extract URL from description if present
      const urlMatch = event.description.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        window.open(urlMatch[0], '_blank');
      }
    } else {
      // Open event details modal
      setSelectedEvent(event);
      setShowEventDetailsModal(true);
    }
  }

  function handleViewMoreEvents() {
    setShowAllEventsModal(true);
  }

  function handleMilestoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    
    const milestoneData: EventItem = {
      id: `milestone_${project.id}_${Date.now()}`,
      name: (form.querySelector('#milestoneName') as HTMLInputElement).value,
      date: (form.querySelector('#milestoneDate') as HTMLInputElement).value,
      description: (form.querySelector('#milestoneDescription') as HTMLTextAreaElement).value,
      type: 'milestone',
      projectId: project.id,
      location: '',
      attendees: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'scheduled',
      priority: 'medium',
      isAllDay: false,
      reminders: [],
      recurrence: 'none',
    };

    addEvent(milestoneData);
    setShowMilestoneModal(false);
  }

  function handleCheckInSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    
    const progressSummary = (form.querySelector('#progressSummary') as HTMLTextAreaElement).value;
    const nextSteps = (form.querySelector('#nextSteps') as HTMLTextAreaElement).value;
    const blockers = (form.querySelector('#blockers') as HTMLTextAreaElement).value;
    
    const checkInData = {
      projectId: project.id,
      type: (form.querySelector('#checkInType') as HTMLSelectElement).value,
      text: `Progress: ${progressSummary}\n\nNext Steps: ${nextSteps}\n\nBlockers: ${blockers}`,
      progressSummary,
      nextSteps,
      blockers,
      mood: 'neutral' as const,
      workloadStatus: 'manageable' as const
    };

    addProjectCheckIn(checkInData.projectId, checkInData);
    setShowCheckInModal(false);
  }
};