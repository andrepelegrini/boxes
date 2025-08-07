// src/hooks/useEventState.ts
import { useState, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';
import { ActivityLogActions } from './useActivityLogState';

export interface EventItem {
  id: string;
  name: string;
  description?: string;
  date: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  location?: string;
  attendees?: string[];
  type: string;
}

export interface EventActions {
  addEvent: (eventData: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>) => EventItem;
  updateEvent: (eventItem: EventItem) => void;
  deleteEvent: (eventId: string) => void;
  getEventsByProjectId: (projectId: string) => EventItem[];
}

export const useEventState = (
  addActivityLog: ActivityLogActions['addActivityLog']
): [EventItem[], EventActions] => {
  const [events, setEvents] = useState<EventItem[]>(() => loadFromLocalStorage<EventItem[]>('events_v2', []));

  useEffect(() => saveToLocalStorage('events_v2', events), [events]);

  const addEvent = useCallback((eventData: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>): EventItem => {
    const now = new Date().toISOString();
    const newEvent: EventItem = { ...eventData, id: Date.now().toString() + Math.random().toString(36).substring(2,7), createdAt: now, updatedAt: now };
    setEvents(prev => [newEvent, ...prev]);
    addActivityLog({
      type: 'event',
      action: 'add',
      details: "Evento \"" + newEvent.name + "\" adicionado à Caixa.",
      projectId: eventData.projectId
    });
    return newEvent;
  }, [addActivityLog, setEvents]);

  const updateEvent = useCallback((updatedEvent: EventItem) => {
    const now = new Date().toISOString();
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? {...updatedEvent, updatedAt: now} : e));
    addActivityLog({
      type: 'event',
      action: 'update',
      details: "Evento \"" + updatedEvent.name + "\" atualizado na Caixa.",
      projectId: updatedEvent.projectId
    });
  }, [addActivityLog, setEvents]);

  const deleteEvent = useCallback((eventId: string) => {
    const eventItem = events.find(e => e.id === eventId);
    if (eventItem) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      addActivityLog({
        type: 'event',
        action: 'delete',
        details: "Evento \"" + eventItem.name + "\" excluído da Caixa.",
        projectId: eventItem.projectId
      });
    }
  }, [events, addActivityLog, setEvents]);

  const getEventsByProjectId = useCallback((projectId: string) => events.filter(e => e.projectId === projectId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [events]);

  return [events, { addEvent, updateEvent, deleteEvent, getEventsByProjectId }];
};