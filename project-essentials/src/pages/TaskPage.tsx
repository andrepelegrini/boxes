import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiEdit3, 
  FiSave, 
  FiX, 
  FiCalendar, 
  FiUser, 
  FiFlag, 
  FiCheckCircle,
  FiAlertTriangle,
  FiTrash2
} from 'react-icons/fi';
import { useAppContext } from '../contexts/SimplifiedRootProvider';
import { Task } from '../../types';

export const TaskPage: React.FC = () => {
  const { taskId, projectId } = useParams<{ taskId: string; projectId?: string }>();
  const navigate = useNavigate();
  const { getTaskById, updateTask, deleteTask, getProjectById } = useAppContext();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId);
      if (foundTask) {
        setTask(foundTask);
        setTitle(foundTask.title);
        setDescription(foundTask.description || '');
        setPriority(foundTask.priority || 'medium');
        setDueDate(foundTask.dueDate || '');
        setAssignedTo(foundTask.assignedTo || '');
      }
    }
  }, [taskId, getTaskById]);

  const handleSave = () => {
    if (task) {
      const updatedTask = {
        ...task,
        title,
        description,
        priority,
        dueDate,
        assignedTo,
        lastModified: new Date().toISOString()
      };
      updateTask(updatedTask);
      setTask(updatedTask);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (task) {
      deleteTask(task.id);
      if (projectId) {
        navigate(`/project/${projectId}`);
      } else {
        navigate('/');
      }
    }
  };

  const toggleComplete = () => {
    if (task) {
      const updatedTask = {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : undefined,
        lastModified: new Date().toISOString()
      };
      updateTask(updatedTask);
      setTask(updatedTask);
    }
  };

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Task Not Found</h1>
          <p className="text-muted-foreground mb-4">The task you're looking for doesn't exist.</p>
          <Link 
            to="/" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const project = task.projectId ? getProjectById(task.projectId) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => projectId ? navigate(`/project/${projectId}`) : navigate('/')}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            {projectId ? 'Back to Project' : 'Back to Dashboard'}
          </button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleComplete}
                  className={`p-2 rounded-full transition-colors ${
                    task.completed 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <FiCheckCircle size={20} />
                </button>
                {isEditing ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl font-semibold bg-transparent border-b border-border focus:border-primary outline-none"
                  />
                ) : (
                  <h1 className={`text-2xl font-semibold ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </h1>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex items-center px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <FiSave className="mr-1" size={16} />
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <FiX className="mr-1" size={16} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <FiEdit3 className="mr-1" size={16} />
                    Edit
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="flex items-center px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  <FiTrash2 className="mr-1" size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Project Info */}
            {project && (
              <div className="flex items-center text-sm text-muted-foreground">
                <span>Project: </span>
                <Link 
                  to={`/project/${project.id}`}
                  className="ml-1 text-primary hover:underline"
                >
                  {project.name}
                </Link>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  placeholder="Add a description..."
                />
              ) : (
                <div className="text-muted-foreground">
                  {task.description || 'No description provided.'}
                </div>
              )}
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <FiFlag className="inline mr-1" size={16} />
                  Priority
                </label>
                {isEditing ? (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority || 'Medium'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <FiCalendar className="inline mr-1" size={16} />
                  Due Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                ) : (
                  <div className="text-muted-foreground">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <FiUser className="inline mr-1" size={16} />
                  Assigned To
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Assign to someone..."
                  />
                ) : (
                  <div className="text-muted-foreground">
                    {task.assignedTo || 'Unassigned'}
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
              <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
              {task.lastModified && (
                <div>Last modified: {new Date(task.lastModified).toLocaleString()}</div>
              )}
              {task.completedAt && (
                <div>Completed: {new Date(task.completedAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskPage;