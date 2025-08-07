
export const MAX_ACTIVE_PROJECTS = 3; // DEFAULT value. User can override this in settings.


export const PROJECT_STATUS_ACTIVE = 'active';
export const PROJECT_STATUS_ARCHIVED = 'archived';
export const PROJECT_STATUS_SHELF = 'shelf';

export const TEAM_COMFORTABLE_WEIGHT_CAPACITY_ITEMS = 30; // DEFAULT value. User can override this in settings.
export const PROJECT_ITEM_WEIGHT_THRESHOLD_HEAVY = 20; 
export const PROJECT_ITEM_WEIGHT_THRESHOLD_MEDIUM = 10; 

export const STALE_ITEM_THRESHOLD_DAYS = 14;
export const STALE_ITEM_WEIGHT_POINTS = 1; 

export const MAX_NEXT_UP_PROJECTS = 2; // This remains a fixed constant for now.

// localStorage keys for user settings
export const USER_SETTINGS_MAX_ACTIVE_PROJECTS_KEY = 'user_max_active_projects';
export const USER_SETTINGS_TEAM_CAPACITY_KEY = 'user_team_capacity';
