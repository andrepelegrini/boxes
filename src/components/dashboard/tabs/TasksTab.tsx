import React, { useState, useMemo, useCallback } from 'react';
import { 
  FiAlertTriangle, 
  FiCheckCircle, FiPlus, FiSearch, FiWifi, FiWifiOff, FiSmartphone
} from 'react-icons/fi';
import { Project, Task } from '../../../types/app';
import { useAppContext } from '../../../contexts/SimplifiedRootProvider';
import { useWhatsApp } from '../../../contexts/WhatsAppContext';
import { KanbanBoard } from '../../kanban/KanbanBoard';

interface TasksTabProps {
  project: Project;
  tasks: Task[];
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string | null) => void;
  onAddTask?: () => void;
  onEditTask?: (task: Task) => void;
  onOpenGlobalTriage?: () => void;
  globalSuggestionsCount?: number;
}

type FilterType = 'all' | 'blocked' | 'overdue' | 'in-progress';
type SortType = 'priority' | 'dueDate' | 'created' | 'updated';

export const TasksTab: React.FC<TasksTabProps> = ({
  project,
  tasks,
  onTaskSelect,
  onAddTask,
  onOpenGlobalTriage,
  globalSuggestionsCount = 0,
}) => {
  const { 
    updateTask, 
    deleteTask, 
  } = useAppContext();

  const { 
    connectionState, 
    isConnected, 
    isConnecting, 
    isMonitoring,
    qrCode,
    connect, 
    disconnect, 
    startMonitoring,
    error: whatsAppError 
  } = useWhatsApp();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('priority');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showWhatsAppQR, setShowWhatsAppQR] = useState(false);


  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'blocked':
        filtered = filtered.filter(t => t.isBlocked);
        break;
      case 'overdue':
        filtered = filtered.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
        break;
      case 'in-progress':
        filtered = filtered.filter(t => !t.completed);
        break;
      default:
        // 'all' - no filter
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority || ''] || 0) - (priorityOrder[a.priority || ''] || 0);
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, filterType, sortBy, searchTerm]);

  const handleTaskClick = (task: Task) => {
    if (onTaskSelect) {
      onTaskSelect(task.id);
    }
  };

  const handleBulkAction = async (action: 'complete' | 'delete' | 'priority') => {
    if (selectedTasks.size === 0) return;
    
    try {
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) continue;

        switch (action) {
          case 'complete':
            await updateTask(task.id, { completed: true, status: 'concluidas' as const });
            break;
          case 'delete':
            await deleteTask(taskId);
            break;
          case 'priority':
            // Could implement priority change modal
            break;
        }
      }
      setSelectedTasks(new Set());
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleKanbanTaskUpdate = useCallback((updatedTask: Task) => {
    updateTask(updatedTask.id, updatedTask);
  }, [updateTask]);

  const handleKanbanTaskDelete = useCallback((taskId: string) => {
    deleteTask(taskId);
  }, [deleteTask]);

  const handleWhatsAppConnect = async () => {
    try {
      const result = await connect();
      // Check if QR code is available after connection attempt
      if (qrCode || connectionState.qr_code) {
        setShowWhatsAppQR(true);
      }
    } catch (error) {
      console.error('Failed to connect WhatsApp:', error);
    }
  };

  const handleOpenWhatsAppConnection = async () => {
    try {
      await connect();
      // Always show QR modal for direct QR code access
      setShowWhatsAppQR(true);
    } catch (error) {
      console.error('Failed to open WhatsApp connection:', error);
    }
  };

  const handleWhatsAppDisconnect = async () => {
    try {
      await disconnect();
      setShowWhatsAppQR(false);
    } catch (error) {
      console.error('Failed to disconnect WhatsApp:', error);
    }
  };

  const getWhatsAppStatusColor = () => {
    if (isConnected) return 'text-green-600';
    if (isConnecting) return 'text-yellow-600';
    if (typeof connectionState.status === 'object' && 'Error' in connectionState.status) return 'text-red-600';
    return 'text-gray-600';
  };

  const getWhatsAppStatusIcon = () => {
    if (isConnected || isMonitoring) return <FiWifi className="w-4 h-4" />;
    return <FiWifiOff className="w-4 h-4" />;
  };

  const getWhatsAppStatusText = () => {
    if (isMonitoring) return 'Monitoring';
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (typeof connectionState.status === 'object' && 'Error' in connectionState.status) {
      return `Error: ${connectionState.status.Error}`;
    }
    return 'Disconnected';
  };






  return (
    <div className="space-y-6">

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['kanban', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  console.log(`🔄 [TASKS_TAB] User toggled view mode to: ${mode}`);
                  setViewMode(mode);
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'kanban' && '📋'}
                {mode === 'list' && '📝'}
                <span className="ml-1 capitalize">{mode}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => {
                console.log(`🔍 [TASKS_TAB] User searched tasks: ${e.target.value}`);
                setSearchTerm(e.target.value);
              }}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* WhatsApp Connection Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
            <FiSmartphone className="w-4 h-4 text-gray-600" />
            <div className="flex items-center gap-2">
              {getWhatsAppStatusIcon()}
              <span className={`text-sm font-medium ${getWhatsAppStatusColor()}`}>
                {getWhatsAppStatusText()}
              </span>
              {!isConnected && !isConnecting && !whatsAppError && (
                <>
                  <button
                    onClick={handleWhatsAppConnect}
                    className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Connect
                  </button>
                  <button
                    onClick={handleOpenWhatsAppConnection}
                    className="ml-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    QR Code
                  </button>
                </>
              )}
              {(isConnected || isMonitoring) && (
                <button
                  onClick={handleWhatsAppDisconnect}
                  className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Disconnect
                </button>
              )}
              {isConnected && !isMonitoring && (
                <button
                  onClick={startMonitoring}
                  className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Start Monitoring
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <select
            value={filterType}
            onChange={(e) => {
              console.log(`📊 [TASKS_TAB] User changed filter to: ${e.target.value}`);
              setFilterType(e.target.value as FilterType);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tasks</option>
            <option value="blocked">Blocked</option>
            <option value="overdue">Overdue</option>
            <option value="in-progress">In Progress</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              console.log(`🔄 [TASKS_TAB] User changed sort to: ${e.target.value}`);
              setSortBy(e.target.value as SortType);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
          </select>

          {/* Bulk Actions */}
          {selectedTasks.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedTasks.size} selected</span>
              <button
                onClick={() => handleBulkAction('complete')}
                className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Complete
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}

          
          <button
            onClick={onAddTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 h-full">
        {viewMode === 'kanban' && (
          <KanbanBoard
            tasks={filteredAndSortedTasks}
            onUpdateTask={handleKanbanTaskUpdate}
            onDeleteTask={handleKanbanTaskDelete}
            projectId={project.id}
            searchTerm={searchTerm}
            filterBy={filterType}
            sortBy={sortBy}
            {...(onOpenGlobalTriage && { onOpenGlobalTriage })}
            globalSuggestionsCount={globalSuggestionsCount}
          />
        )}


        {viewMode === 'list' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredAndSortedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSelected = new Set(selectedTasks);
                          if (e.target.checked) {
                            newSelected.add(task.id);
                          } else {
                            newSelected.delete(task.id);
                          }
                          setSelectedTasks(newSelected);
                        }}
                        className="rounded"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{task.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-xs text-gray-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.isBlocked && <FiAlertTriangle className="w-4 h-4 text-red-500" />}
                      {task.completed && <FiCheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp QR Code Modal */}
      {showWhatsAppQR && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Scan QR Code with WhatsApp</h3>
              <div className="mb-4">
                <img src={qrCode} alt="WhatsApp QR Code" className="mx-auto" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, and scan this QR code.
              </p>
              <button
                onClick={() => setShowWhatsAppQR(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};