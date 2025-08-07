
export type ProjectStatus = 'active' | 'archived' | 'shelf';

export interface ProjectDescriptionSuggestion {
  id: string;
  projectId: string;
  projectName: string;
  channelName: string;
  currentDescription: string;
  suggestedDescription: string;
  suggestedNextSteps: string[];
  isFirstTime: boolean;
  isSignificantChange: boolean;
  changeReason: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ItemTimestamps {
  createdAt: string;
  updatedAt: string;
}

export type KanbanColumnId = 'sugestoes' | 'descobrindo' | 'realizando' | 'concluidas';

// Rich content types for Notion-like task pages
export type TaskBlockType = 'text' | 'heading' | 'list' | 'code' | 'image' | 'embed' | 'quote' | 'divider';

export interface TaskBlock {
  id: string;
  type: TaskBlockType;
  content: any;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskContent {
  blocks: TaskBlock[];
  version: number;
  lastEditedBy?: string;
  lastEditedAt: string;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface TaskRelation {
  id: string;
  type: 'blocks' | 'blockedBy' | 'related' | 'duplicate' | 'subtask';
  targetTaskId: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isResolved?: boolean;
}


export interface Task extends ItemTimestamps {
  id: string;
  projectId: string;
  title: string;
  name: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
  isBlocked?: boolean;
  // Kanban column status - takes precedence over completed boolean for kanban view
  status?: KanbanColumnId;
  // Enhanced fields for Notion-like functionality
  content?: TaskContent; // Rich content blocks
  attachments?: TaskAttachment[];
  relations?: TaskRelation[];
  comments?: TaskComment[];
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours?: number;
  actualHours?: number;
}

export interface DraggedTaskInfo {
  taskId: string;
  sourceColumnId: KanbanColumnId;
  // originalProjectId is not strictly needed if D&D is within a single project's Kanban
}

export interface EventItem extends ItemTimestamps {
  id: string;
  projectId: string;
  name: string;
  date: string;
  description?: string;
  location?: string;
  attendees?: string[];
  type: string;
}

export interface DocumentItem extends ItemTimestamps {
  id: string;
  projectId: string;
  name: string;
  type: 'doc' | 'file' | 'link' | 'aiKickoff'; // Added 'aiKickoff'
  url?: string;
  content?: string; // Used for 'doc' and 'ai_kickoff'
  description?: string; // Optional description
  size?: number; // File size in bytes
  body?: string; // Alternative content field
}

export interface ProjectWeightBreakdown {
  tasks: number;
  events: number;
  documents: number;
  stalePoints: number; // Extra points from stale items
}

// AI Related types
export interface AISuggestedTask {
  id: string; // Added for unique identification
  name: string;
  description?: string;
}

export interface AIAnalysisResults {
  kickOffDocumentContent?: string; // Markdown content
  kickOffSaved?: boolean; // Added to track if kick-off doc was saved
  suggestedTasks?: AISuggestedTask[];
  suggestedMetrics?: string[];
  expectedTimeline?: string;
  feedback?: string;
  lastAnalysisTimestamp?: string;
  status?: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
  // Enhanced AI analysis results
  summary?: string;
  recommendations?: string[];
  risks?: string[];
  opportunities?: string[];
  nextActions?: string[];
  confidence?: number;
  timestamp?: string;
}

// Slack Integration types
export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
}

export interface SlackMessage {
  id: string;
  channelId: string;
  text: string;
  user: string;
  timestamp: string;
  threadTimestamp?: string;
  reactions?: SlackReaction[];
  files?: SlackFile[];
  mentionsTask?: boolean; // If message mentions tasks/actions
}

export interface SlackReaction {
  name: string;
  users: string[];
  count: number;
}

export interface SlackFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size: number;
}

export interface SlackIntegration {
  channelId: string;
  channelName: string;
  connected: boolean;
  lastSyncAt?: string;
  syncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  authStatus: 'not_connected' | 'connected' | 'expired' | 'error';
}

export interface SlackSyncMetadata extends ItemTimestamps {
  id: string;
  projectId: string;
  channelId: string;
  channelName: string;
  lastSyncTimestamp?: string;
  lastMessageTimestamp?: string;
  isEnabled: boolean;
  syncIntervalMinutes?: number;
  syncStatus?: 'local' | 'synced' | 'conflict';
  lastSyncAt?: string;
  teamId?: string;
}

export interface SlackDerivedTask extends ItemTimestamps {
  id: string;
  projectId: string;
  slackChannelId: string;
  sourceMessageTs: string;
  sourceMessageText: string;
  suggestedTaskName: string;
  suggestedDescription: string;
  suggestedAssignee?: string;
  confidenceScore: number;
  status: 'suggested' | 'accepted' | 'rejected' | 'created';
  createdTaskId?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  syncStatus?: 'local' | 'synced' | 'conflict';
  lastSyncAt?: string;
  teamId?: string;
}

export interface SlackOAuthResponse {
  accessToken: string;
  teamId: string;
  teamName: string;
  userId: string;
  userEmail?: string;
  scope: string;
}

export interface SlackConnectionStatus {
  isConnected: boolean;
  teamName?: string;
  userEmail?: string;
  lastChecked?: string;
  error?: string;
}

export interface SlackMessageRecord extends ItemTimestamps {
  id: string;
  projectId: string;
  channelId: string;
  messageTs: string; // Slack timestamp (unique identifier)
  userId: string;
  userDisplayName?: string;
  messageText: string;
  messageType?: string;
  threadTs?: string; // If it's a reply, the parent thread timestamp
  replyCount?: number;
  reactions?: string; // JSON string of reactions
  attachments?: string; // JSON string of file attachments
  isDeleted?: boolean;
  isEdited?: boolean;
  originalMessageText?: string; // For edited messages
  messageTimestamp: string; // Human readable timestamp
  syncStatus?: 'local' | 'synced' | 'conflict';
  lastSyncAt?: string;
  teamId?: string;
}

export interface SlackBackgroundSyncJob extends ItemTimestamps {
  id: string;
  projectId: string;
  channelId: string;
  channelName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  syncType: 'full_history' | 'recent_only' | 'incremental';
  priority: number;
  messagesProcessed: number;
  totalMessagesEstimate?: number;
  lastProcessedCursor?: string;
  lastProcessedTimestamp?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Project extends ItemTimestamps {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  isNextUp?: boolean;
  archiveReason?: string;
  archivedAt?: string;
  strategicGoal?: string;
  lastReviewedAt?: string;
  aiAnalysis?: AIAnalysisResults; // Added AI analysis field
  slackChannelUrl?: string; // Added for Slack integration
  slackIntegration?: SlackIntegration; // Detailed Slack connection data
  // Enhanced project context data
  contextData?: {
    customText?: string; // Additional context provided by user
    linksText?: string; // Relevant links
    audioBlob?: Blob; // Audio explanation file
    selectedFiles?: File[]; // Context files
    generatedPlan?: any; // AI-generated project plan from wizard
    selectedProperties?: any; // User-selected elements from AI plan
  };
  // weightBreakdown will be calculated, not stored directly on project object in state
}



export enum ProjectWeightCategory {
  Light = "Light",
  Medium = "Medium",
  Heavy = "Heavy",
  Overweight = "Overweight", // For projects exceeding a certain threshold or team capacity impact
}

export interface ActivityLog {
  id: string;
  projectId: string;
  timestamp: string;
  message: string;
}

export type CheckInSentiment = 'on_track' | 'needs_attention' | 'at_risk' | 'off_track';

export interface ProjectCheckIn {
  id: string;
  projectId: string;
  timestamp: string;
  text: string;
  sentiment?: CheckInSentiment;
  blockers?: string; // JSON string in database
  achievements?: string; // JSON string in database  
  nextSteps?: string; // JSON string in database
}

export type ProjectDropZone = 'active' | 'nextUp' | 'shelf';

export interface DraggedProjectInfo {
  id: string;
  sourceStatus: ProjectStatus;
  sourceIsNextUp: boolean;
  sourceZone: ProjectDropZone;
}

export interface User {
  id: string;
  name: string;
  email: string;
  // Add any other user-related fields as needed
}
