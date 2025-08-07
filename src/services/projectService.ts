import { invoke } from '@tauri-apps/api/core';

export const getProjects = async () => {
  try {
    const projects = await invoke('get_projects');
    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};
