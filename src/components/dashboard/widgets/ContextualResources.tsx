import React, { useMemo, useCallback } from 'react';
import { FiTrendingUp } from 'react-icons/fi';
import { Project, DocumentItem } from '../../../types/app';
import { invoke } from '../../../utils/tauri';

interface ContextualResourcesProps {
  project: Project;
  documents: DocumentItem[];
  onUploadFiles: () => void;
}

export const ContextualResources: React.FC<ContextualResourcesProps> = ({
  project,
  documents,
  onUploadFiles,
}) => {
  const handleTakeAction = useCallback(async (suggestion: any) => {
    try {
      switch (suggestion.id) {
        case 'ai-kickoff':
          // Create AI kickoff document
          const kickoffDoc = await invoke('create_document', {
            projectId: project.id,
            documentData: {
              title: `${project.name} - AI Kickoff`,
              content: `# ${project.name} AI Kickoff\n\n## Project Overview\n${project.description || 'Project description to be added.'}\n\n## Goals\n- Define project objectives\n- Identify key stakeholders\n- Establish success metrics\n\n## Next Steps\n- [ ] Complete project planning\n- [ ] Set up initial tasks\n- [ ] Schedule kickoff meeting`,
              type: 'ai_kickoff'
            }
          });
          console.log('AI Kickoff document created:', kickoffDoc);
          break;

        case 'documentation':
          // Create general documentation
          const doc = await invoke('create_document', {
            projectId: project.id,
            documentData: {
              title: `${project.name} - Documentation`,
              content: `# ${project.name} Documentation\n\n## Overview\nProject documentation and important information.\n\n## Resources\n- Links to relevant materials\n- Reference documents\n- Contact information`,
              type: 'doc'
            }
          });
          console.log('Documentation created:', doc);
          break;

        case 'upload_resources':
          // Trigger file upload
          onUploadFiles();
          break;

        default:
          console.log('Taking action for suggestion:', suggestion);
          // Action handled by UI - no backend storage needed
      }
    } catch (error) {
      console.error('Failed to take action on resource suggestion:', error);
    }
  }, [project, onUploadFiles]);
  const resourcesAnalysis = useMemo(() => {
    const totalDocs = documents.length;
    const recentDocs = documents.filter(doc => {
      const daysSinceUpdate = (Date.now() - new Date(doc.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 7;
    }).length;
    
    const docTypes = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const aiKickoffDocs = docTypes.ai_kickoff || 0;
    const regularDocs = docTypes.doc || 0;
    const files = docTypes.file || 0;
    const links = docTypes.link || 0;

    return {
      totalDocs,
      recentDocs,
      aiKickoffDocs,
      regularDocs,
      files,
      links,
      hasAIKickoff: aiKickoffDocs > 0,
      isWellDocumented: totalDocs >= 3
    };
  }, [documents]);

  const suggestions = useMemo(() => {
    const tips = [];

    if (!resourcesAnalysis.hasAIKickoff) {
      tips.push({
        id: 'ai-kickoff',
        text: 'Generate an AI project kickoff document to align team understanding',
        priority: 'high',
        actionable: true
      });
    }

    if (resourcesAnalysis.totalDocs < 3) {
      tips.push({
        id: 'documentation',
        text: 'Add more documentation to improve project knowledge sharing',
        priority: 'medium',
        actionable: true
      });
    }

    if (resourcesAnalysis.recentDocs === 0 && resourcesAnalysis.totalDocs > 0) {
      tips.push({
        id: 'update-docs',
        text: 'Consider updating project documentation - nothing updated this week',
        priority: 'low',
        actionable: true
      });
    }

    return tips;
  }, [resourcesAnalysis]);

  return (
    <div className="bg-gradient-to-br from-nubank-blue-50 to-nubank-purple-50 rounded-nubank-lg border border-nubank-blue-200 shadow-nubank">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-nubank-blue-500 to-nubank-purple-500 rounded-full flex items-center justify-center">
            <FiTrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-nubank-gray-800">
            Project Intelligence
          </h3>
        </div>

        {/* Resource Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/80 rounded-nubank p-4 text-center">
            <div className="text-2xl font-bold text-nubank-blue-600 mb-1">
              {resourcesAnalysis.totalDocs}
            </div>
            <div className="text-sm text-nubank-gray-600">Total Resources</div>
          </div>
          
          <div className="bg-white/80 rounded-nubank p-4 text-center">
            <div className="text-2xl font-bold text-nubank-purple-600 mb-1">
              {resourcesAnalysis.recentDocs}
            </div>
            <div className="text-sm text-nubank-gray-600">Updated This Week</div>
          </div>
        </div>

        {/* Resource Breakdown */}
        {resourcesAnalysis.totalDocs > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-nubank-gray-700 mb-3">Resource Types</h4>
            <div className="space-y-2">
              {resourcesAnalysis.aiKickoffDocs > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-nubank-gray-600">
                    🤖 AI Kickoff Documents
                  </span>
                  <span className="font-medium text-nubank-orange-600">
                    {resourcesAnalysis.aiKickoffDocs}
                  </span>
                </div>
              )}
              
              {resourcesAnalysis.regularDocs > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-nubank-gray-600">
                    📄 Documents
                  </span>
                  <span className="font-medium text-accent">
                    {resourcesAnalysis.regularDocs}
                  </span>
                </div>
              )}
              
              {resourcesAnalysis.files > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-nubank-gray-600">
                    📎 Files
                  </span>
                  <span className="font-medium text-primary">
                    {resourcesAnalysis.files}
                  </span>
                </div>
              )}
              
              {resourcesAnalysis.links > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-nubank-gray-600">
                    🔗 Links
                  </span>
                  <span className="font-medium text-success-DEFAULT">
                    {resourcesAnalysis.links}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-nubank-gray-700 mb-3">Suggestions</h4>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-white/80 rounded-nubank p-3"
                >
                  <p className="text-sm text-nubank-gray-700 mb-2">
                    {suggestion.text}
                  </p>
                  <button 
                    onClick={() => handleTakeAction(suggestion)}
                    className="text-xs text-nubank-blue-600 hover:text-nubank-blue-700 font-medium transition-colors"
                  >
                    Take action
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Health Indicator */}
        <div className="bg-white/80 rounded-nubank p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              resourcesAnalysis.isWellDocumented ? 'bg-success-DEFAULT' : 
              resourcesAnalysis.totalDocs > 0 ? 'bg-warning-DEFAULT' : 'bg-danger-DEFAULT'
            }`} />
            <span className="text-sm font-medium text-nubank-gray-700">
              Documentation Health
            </span>
          </div>
          
          <p className="text-xs text-nubank-gray-600">
            {resourcesAnalysis.isWellDocumented ? 
              'Well documented project' : 
              resourcesAnalysis.totalDocs > 0 ? 
                'Needs more documentation' : 
                'No documentation yet'
            }
          </p>
        </div>
      </div>
    </div>
  );
};