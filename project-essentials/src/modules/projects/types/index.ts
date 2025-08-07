import { ItemTimestamps } from '../../common/types';
import { SlackIntegration } from '../../slack/types';

export type ProjectStatus = 'active' | 'archived' | 'shelf';

export type CheckInSentiment = 'on_track' | 'needs_attention' | 'at_risk' | 'off_track';

export type ProjectDropZone = 'active' | 'nextUp' | 'shelf';

export enum ProjectWeightCategory {
  Light = "Light",
  Medium = "Medium",
  Heavy = "Heavy",
  Overweight = "Overweight",
}

export interface ProjectWeightBreakdown {
  tasks: number;
  events: number;
  documents: number;
  stalePoints: number;
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
  aiAnalysis?: any;
  slackChannelUrl?: string;
  slackIntegration?: SlackIntegration;
}

export interface ProjectCheckIn {
  id: string;
  projectId: string;
  timestamp: string;
  text: string;
  sentiment?: CheckInSentiment;
  user?: string;
  blockers?: string[]; // JSON serialized array 
  achievements?: string[]; // JSON serialized array
  nextSteps?: string[]; // JSON serialized array
}

export interface DraggedProjectInfo {
  id: string;
  sourceStatus: ProjectStatus;
  sourceIsNextUp: boolean;
  sourceZone: ProjectDropZone;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  timestamp: string;
  message: string;
  user?: string;
}

export interface EventItem extends ItemTimestamps {
  id: string;
  projectId: string;
  name: string;
  date: string;
  description?: string;
}

export interface DocumentItem extends ItemTimestamps {
  id: string;
  projectId: string;
  name: string;
  type: 'doc' | 'file' | 'link' | 'ai_kickoff';
  url?: string;
  content?: string;
}