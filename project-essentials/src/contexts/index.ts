// Consolidated context exports - all major refactoring complete
export { SimplifiedRootProvider, useAppContext, useAppTasks, useAppUI, useAppAI, useAppSlack, useAppUser } from './SimplifiedRootProvider';
export { useProjectContext } from './ProjectContext';
export { useUIContext } from './UIContext';

export { useTaskContext } from './TaskContext';
export { useAIContext } from './AIContext';
export { useSlackGlobal as useSlack, SlackGlobalProvider as SlackProvider } from './SlackGlobalContext';
