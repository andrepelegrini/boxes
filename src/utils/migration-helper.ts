import { Project } from '../../types';

/**
 * Simple utility to manually migrate projects from localStorage to database
 * This can be called from the browser console if needed
 */
export async function migrateProjectsFromLocalStorage(): Promise<void> {
  try {
    // Check both old and new localStorage keys
    const projectsJson = localStorage.getItem('projects_v2') || localStorage.getItem('projects');
    
    if (!projectsJson) {
      console.log('No projects found in localStorage');
      return;
    }

    const projects: Project[] = JSON.parse(projectsJson);
    console.log(`Found ${projects.length} projects in localStorage`);

    const { ProjectService } = await import('./database');
    
    for (const project of projects) {
      try {
        // Check if project already exists in database
        const existing = await ProjectService.getById(project.id);
        if (!existing) {
          await ProjectService.create(project);
          console.log(`✅ Migrated project: ${project.name}`);
        } else {
          console.log(`⏭️ Project already exists: ${project.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate project ${project.name}:`, error);
      }
    }

    console.log('🎉 Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Make it available globally for debugging
(window as any).migrateProjects = migrateProjectsFromLocalStorage;