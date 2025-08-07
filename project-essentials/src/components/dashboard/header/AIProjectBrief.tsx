import React, { useState, useMemo } from 'react';
import { FiChevronDown, FiChevronUp, FiZap, FiMic, FiFileText, FiEdit3 } from 'react-icons/fi';
import { Project, Task, EventItem, DocumentItem } from '../../../types/app';

interface AIProjectBriefProps {
  project: Project;
  tasks: Task[];
  events: EventItem[];
  documents: DocumentItem[];
  onUpdateProject?: (project: Project) => void;
}

export const AIProjectBrief: React.FC<AIProjectBriefProps> = ({
  project,
  tasks,
  events,
  documents,
  onUpdateProject,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(project.description);

  const briefContent = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const upcomingEvents = events.filter(e => new Date(e.date) > new Date()).length;
    const recentDocuments = documents.filter(d => {
      const daysSinceUpdate = (Date.now() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 7;
    }).length;
    
    // Context data information
    const contextInfo = project.contextData ? {
      hasCustomText: !!project.contextData.customText,
      hasAudio: !!project.contextData.audioBlob,
      fileCount: project.contextData.selectedFiles?.length || 0,
      hasAIPlan: !!project.contextData.generatedPlan
    } : null;
    
    const brief = `This project is ${progressPercentage}% complete with ${totalTasks - completedTasks} active tasks remaining.${contextInfo ? ` Rich project context includes ${contextInfo.hasAudio ? 'audio explanation, ' : ''}${contextInfo.fileCount > 0 ? `${contextInfo.fileCount} files, ` : ''}${contextInfo.hasAIPlan ? 'AI-generated plan, ' : ''}and additional context.` : ''}`;
    
    const detail = `Recent activity shows ${completedTasks > 0 ? 'strong momentum' : 'initial phase planning'} with ${recentDocuments} documents updated this week. ${upcomingEvents} upcoming milestones require attention. ${project.slackIntegration?.connected ? 'Team collaboration through Slack is active and providing real-time updates.' : 'Consider connecting Slack for enhanced team coordination.'}`;
    
    // AI Analysis from project data if available
    const aiInsight = project.aiAnalysis?.feedback || 
      `Based on current progress, this project ${progressPercentage > 75 ? 'is on track for successful completion' : progressPercentage > 50 ? 'shows good momentum but may need attention on blocked items' : 'requires focused effort to maintain timeline'}.`;

    return { brief, detail, aiInsight, contextInfo };
  }, [project, tasks, events, documents]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl p-8 shadow-2xl border border-purple-700/20 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-y-1 transform pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-purple-400/20 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-indigo-400/20 to-transparent rounded-full blur-xl pointer-events-none" />
      
      <div className="relative flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex-shrink-0 shadow-lg shadow-yellow-500/25">
          <FiZap className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              AI Project Brief
            </h3>
            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-white/90 leading-relaxed text-base font-medium">
                {briefContent.brief}
                {isExpanded && (
                  <>
                    <div className="block mt-3 text-white/80">{briefContent.detail}</div>
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        <span className="text-sm font-semibold text-blue-200 uppercase tracking-wide">AI Insight</span>
                      </div>
                      <div className="text-white/90 text-sm italic leading-relaxed">{briefContent.aiInsight}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Expanded Content */}
            {isExpanded && (
              <div className="mt-6 pt-6 border-t border-white/20 space-y-6">
                
                {/* Project Description Section */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-bold text-white">Project Description</h4>
                    {!isEditingDescription && onUpdateProject && (
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                      >
                        <FiEdit3 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:border-white/50 focus:ring-2 focus:ring-white/20 transition-all resize-none font-medium"
                        rows={4}
                        placeholder="Describe the project..."
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            if (onUpdateProject) {
                              onUpdateProject({
                                ...project,
                                description: editedDescription,
                                updatedAt: new Date().toISOString()
                              });
                            }
                            setIsEditingDescription(false);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-green-500/25"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditedDescription(project.description);
                            setIsEditingDescription(false);
                          }}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/90 bg-white/10 backdrop-blur-sm rounded-xl p-4 font-medium leading-relaxed border border-white/20">
                      {project.description || 'No description provided.'}
                    </p>
                  )}
                </div>

                {/* Context Data Display */}
                {briefContent.contextInfo && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                    <h4 className="text-base font-bold text-white mb-4">Project Context</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {briefContent.contextInfo.hasCustomText && (
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-4 backdrop-blur-sm hover:scale-105 transition-all duration-200">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                              <FiFileText className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-blue-200">Additional Context</span>
                          </div>
                          <p className="text-sm text-white/90 leading-relaxed">
                            {project.contextData?.customText?.substring(0, 80)}...
                          </p>
                        </div>
                      )}
                      
                      {briefContent.contextInfo.hasAudio && (
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-4 backdrop-blur-sm hover:scale-105 transition-all duration-200">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                              <FiMic className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-purple-200">Audio Explanation</span>
                          </div>
                          <p className="text-sm text-white/90">Audio recording available</p>
                        </div>
                      )}
                      
                      {briefContent.contextInfo.fileCount > 0 && (
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4 backdrop-blur-sm hover:scale-105 transition-all duration-200">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                              <FiFileText className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-green-200">Attached Files</span>
                          </div>
                          <p className="text-sm text-white/90">
                            {briefContent.contextInfo.fileCount} file(s) attached
                          </p>
                        </div>
                      )}
                      
                      {briefContent.contextInfo.hasAIPlan && (
                        <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-400/30 rounded-xl p-4 backdrop-blur-sm hover:scale-105 transition-all duration-200">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center">
                              <FiZap className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-orange-200">AI Generated Plan</span>
                          </div>
                          <p className="text-sm text-white/90">AI planning data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all duration-200 hover:scale-105 group border border-white/30 backdrop-blur-sm"
            >
              {isExpanded ? (
                <>
                  <FiChevronUp className="w-5 h-5 group-hover:transform group-hover:-translate-y-1 transition-transform" />
                  Show less
                </>
              ) : (
                <>
                  <FiChevronDown className="w-5 h-5 group-hover:transform group-hover:translate-y-1 transition-transform" />
                  Show detailed analysis
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};