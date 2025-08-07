import { invoke } from '@tauri-apps/api/core';

export const getTasks = async () => {
  try {
    const tasks = await invoke('get_tasks');
    return tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};
