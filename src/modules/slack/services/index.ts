// Main Slack service (simplified)
export { SlackService, slackService } from './SlackService';

// New simple connection service
export { SlackChannelConnection } from './SlackChannelConnection';

// Remaining V2 services (kept for specific functionality)
export { SlackAIAnalysisServiceV2 } from './SlackAIAnalysisServiceV2';
export { SlackAIResultsHandler } from './SlackAIResultsHandler';

// Supporting services
export { SlackRateLimiter, slackRateLimiter } from './SlackRateLimiter';
export { SlackChannelService } from './SlackChannelService';
export { SlackCredentialsService } from './SlackCredentialsService';

// Specialized services (kept for specific functionality)
export { SlackTaskDiscoveryService, slackTaskDiscoveryService } from './SlackTaskDiscoveryService';
export { SlackTaskDiscoveryScheduler, slackTaskDiscoveryScheduler } from './SlackTaskDiscoveryScheduler';
export type { 
  TaskSuggestion, 
} from './SlackTaskDiscoveryService';
export type { SchedulerConfig } from './SlackTaskDiscoveryScheduler';