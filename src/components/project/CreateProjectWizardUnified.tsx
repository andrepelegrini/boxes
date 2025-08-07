import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../../modules/common/components/Modal';
import { useAppContext } from '../../contexts/SimplifiedRootProvider';
import { 
  FiArrowRight, FiArrowLeft, FiMic, FiUploadCloud, FiTrash2, FiPauseCircle, FiCheckCircle, 
  FiX, FiSave, FiSlack, FiZap
} from 'react-icons/fi';
import { useToast } from '../ui/Toast';
import { useHumanizedText } from '../../constants/humanizedText';
import { useSlack } from '../../contexts';
// import ProjectSetupAIService, { ProjectSetupInputs, GeneratedProjectPlan } from '../../services/ProjectSetupAIService';
interface ProjectSetupInputs {
  projectName: string;
  projectDescription: string;
  context?: string;
  slackChannels?: string[];
}
interface GeneratedProjectPlan {
  suggestedMilestones: any[];
  suggestedTasks: any[];
  suggestedChannels: ChannelOption[];
  aiFeatures: AIFeature[];
  summary: string;
}
interface ChannelOption {
  channel_id: string;
  channel_name: string;
  reasoning: string;
  relevance_score: number;
}
interface AIFeature {
  type: string;
  description: string;
  reasoning: string;
}
// Define types inline since the file doesn't exist
type WizardMode = 'simple' | 'guided' | 'advanced';
type WizardStep = 'basics' | 'details' | 'context' | 'slack' | 'ai-analysis' | 'review';

interface WizardConfig {
  mode: WizardMode;
  steps: WizardStep[];
  enableSlack: boolean;
  enableAI: boolean;
  enableAdvancedFeatures: boolean;
}

interface WizardProgress {
  current: number;
  total: number;
  percentage: number;
  stepName: string;
}

interface ProjectSetupData {
  // Core project data
  name: string;
  description: string;
  strategicGoal: string;
  
  // Context/AI inputs
  customText: string;
  linksText: string;
  selectedFiles: File[];
  audioBlob: Blob | null;
  
  // Slack integration
  slackChannelId: string;
  slackChannelName: string;
  slackEnabled: boolean;
  
  // AI analysis results
  generatedPlan: GeneratedProjectPlan | null;
  isAnalyzing: boolean;
  
  // User selections from AI analysis
  selectedProperties: {
    stakeholders: string[];
    tasks: string[];
    milestones: string[];
    dependencies: string[];
    keyPoints: string[];
  };
}

interface CreateProjectWizardUnifiedProps {
  mode?: WizardMode;
  initialStep?: WizardStep;
  onComplete?: (projectId: string) => void;
  onCancel?: () => void;
}

const CreateProjectWizardUnified: React.FC<CreateProjectWizardUnifiedProps> = ({
  mode = 'guided',
  initialStep,
  onComplete,
  onCancel
}) => {
  const { addProject, showCreateProjectModal, setShowCreateProjectModal, triggerAIAnalysis, isAIAvailable, geminiApiKey } = useAppContext();
  const { showFriendlyError, showSuccess, ToastContainer } = useToast();
  const { ACTIONS } = useHumanizedText();
  const slackContext = useSlack();
  
  // Create AI service instance stub
  const aiService = useMemo(() => ({
    generateProjectPlan: async (_inputs: ProjectSetupInputs): Promise<GeneratedProjectPlan> => {
      return {
        suggestedMilestones: [],
        suggestedTasks: [],
        suggestedChannels: [],
        aiFeatures: [],
        summary: ''
      };
    }
  }), [geminiApiKey]);
  
  // Wizard configuration based on mode
  const wizardConfig: WizardConfig = useMemo(() => {
    switch (mode) {
      case 'simple':
        return {
          mode: 'simple',
          steps: ['basics'],
          enableSlack: false,
          enableAI: false,
          enableAdvancedFeatures: false
        };
      case 'advanced':
        return {
          mode: 'advanced',
          steps: ['basics', 'context', 'slack', 'ai-analysis', 'review'],
          enableSlack: true,
          enableAI: true,
          enableAdvancedFeatures: true
        };
      case 'guided':
      default:
        return {
          mode: 'guided',
          steps: ['basics', 'details', 'slack'],
          enableSlack: true,
          enableAI: isAIAvailable(),
          enableAdvancedFeatures: false
        };
    }
  }, [mode, isAIAvailable]);

  // State management
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep || wizardConfig.steps[0]);
  const [canProceed, setCanProceed] = useState(false);
  const [projectData, setProjectData] = useState<ProjectSetupData>({
    name: '',
    description: '',
    strategicGoal: '',
    customText: '',
    linksText: '',
    selectedFiles: [],
    audioBlob: null,
    slackChannelId: '',
    slackChannelName: '',
    slackEnabled: false,
    generatedPlan: null,
    isAnalyzing: false,
    selectedProperties: {
      stakeholders: [],
      tasks: [],
      milestones: [],
      dependencies: [],
      keyPoints: []
    }
  });

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const aiAvailable = isAIAvailable();

  // Progress calculation
  const progress: WizardProgress = useMemo(() => {
    const currentIndex = wizardConfig.steps.indexOf(currentStep);
    const stepNames: Record<WizardStep, string> = {
      basics: 'Project Basics',
      details: 'Project Details',
      context: 'Context & Files',
      slack: 'Slack Integration',
      'ai-analysis': 'AI Analysis',
      review: 'Review & Finalize'
    };

    return {
      current: currentIndex + 1,
      total: wizardConfig.steps.length,
      percentage: Math.round(((currentIndex + 1) / wizardConfig.steps.length) * 100),
      stepName: stepNames[currentStep] || 'Unknown Step'
    };
  }, [currentStep, wizardConfig.steps]);

  // Audio recording functions - define before use in useEffect
  const resetAudioRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (showCreateProjectModal) {
      setProjectData({
        name: '',
        description: '',
        strategicGoal: '',
        customText: '',
        linksText: '',
        selectedFiles: [],
        audioBlob: null,
        slackChannelId: '',
        slackChannelName: '',
        slackEnabled: false,
        generatedPlan: null,
        isAnalyzing: false,
        selectedProperties: {
          stakeholders: [],
          tasks: [],
          milestones: [],
          dependencies: [],
          keyPoints: []
        }
      });
      setCurrentStep(wizardConfig.steps[0]);
      resetAudioRecording();
    }
    
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [showCreateProjectModal, wizardConfig.steps, resetAudioRecording]);

  // Validation for each step
  const validateStep = useCallback((step: WizardStep, data: ProjectSetupData): boolean => {
    switch (step) {
      case 'basics':
        return data.name.trim().length > 0;
      case 'details':
        return data.name.trim().length > 0 && data.strategicGoal.trim().length > 0;
      case 'context':
        return data.customText.trim().length > 0 || data.selectedFiles.length > 0 || data.audioBlob !== null;
      case 'slack':
        return !wizardConfig.enableSlack || !data.slackEnabled || data.slackChannelId !== '';
      case 'ai-analysis':
        return data.generatedPlan !== null;
      case 'review':
        return true; // Review step is always valid
      default:
        return false;
    }
  }, [wizardConfig.enableSlack]);

  // Update canProceed when data changes
  useEffect(() => {
    setCanProceed(validateStep(currentStep, projectData));
  }, [currentStep, projectData, validateStep]);

  // Load channels when entering Slack step - TODO: Implement when Slack context is properly defined
  useEffect(() => {
    if (currentStep === 'slack' && projectData.slackEnabled) {
      // TODO: Load Slack channels when SlackGlobalContext is implemented
      console.log('TODO: Load Slack channels');
    }
  }, [currentStep, projectData.slackEnabled]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setProjectData(prev => ({ ...prev, audioBlob }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      showFriendlyError('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const removeAudio = () => {
    setProjectData(prev => ({ ...prev, audioBlob: null }));
    resetAudioRecording();
  };

  // File handling
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setProjectData(prev => ({ ...prev, selectedFiles: [...prev.selectedFiles, ...files] }));
  };

  const removeFile = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.filter((_, i) => i !== index)
    }));
  };

  // Navigation
  const goToNextStep = () => {
    const currentIndex = wizardConfig.steps.indexOf(currentStep);
    if (currentIndex < wizardConfig.steps.length - 1) {
      setCurrentStep(wizardConfig.steps[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = wizardConfig.steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(wizardConfig.steps[currentIndex - 1]);
    }
  };

  // AI Analysis
  const triggerAIAnalysisStep = async () => {
    if (!aiAvailable) {
      showFriendlyError('AI não está disponível. Configure o Gemini API key nas configurações.');
      return;
    }

    setProjectData(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const inputs: ProjectSetupInputs = {
        name: projectData.name,
        description: projectData.description,
        strategicGoal: projectData.strategicGoal,
        customText: projectData.customText,
        linksText: projectData.linksText,
        audioBlob: projectData.audioBlob,
        slackChannelName: projectData.slackEnabled ? projectData.slackChannelName : undefined
      };

      const plan = await aiService.generateProjectPlan(inputs);
      setProjectData(prev => ({ 
        ...prev, 
        generatedPlan: plan,
        isAnalyzing: false 
      }));
      
      showSuccess('Análise AI concluída com sucesso!');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      showFriendlyError('Falha na análise AI. Tente novamente.');
      setProjectData(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  // Project creation
  const createProject = async () => {
    try {
      const project = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        strategicGoal: projectData.strategicGoal.trim(),
        status: 'shelf' as const,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        createdAt: new Date().toISOString(),
        isNextUp: false
      };

      const newProject = await addProject(project);
      
      if (newProject) {
        // Connect to Slack if enabled
        if (wizardConfig.enableSlack && projectData.slackEnabled && projectData.slackChannelId) {
          try {
            await slackContext.actions.connectChannel(projectData.slackChannelId);
          } catch (error) {
            console.warn('Failed to connect Slack channel:', error);
          }
        }

        // Trigger AI analysis if we have context data
        if (aiAvailable && (projectData.customText || projectData.selectedFiles.length > 0 || projectData.audioBlob)) {
          try {
            await triggerAIAnalysis(newProject.id, {
              files: projectData.selectedFiles,
              customText: projectData.customText,
              links: projectData.linksText.split('\n').filter(link => link.trim()),
            });
          } catch (error) {
            console.warn('Failed to trigger AI analysis:', error);
          }
        }

        setShowCreateProjectModal(false);
        showSuccess(`${ACTIONS.create.success} ${project.name}!`);
        
        if (onComplete) {
          onComplete(newProject.id);
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      showFriendlyError('Erro ao criar projeto. Tente novamente.');
    }
  };

  // Handle modal close
  const handleClose = () => {
    setShowCreateProjectModal(false);
    resetAudioRecording();
    if (onCancel) {
      onCancel();
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-nubank-gray-700 mb-2">
                Nome do Projeto *
              </label>
              <input
                id="project-name"
                type="text"
                value={projectData.name}
                onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-nubank-gray-300 rounded-nubank-lg focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent"
                placeholder="Digite o nome do seu projeto..."
                autoFocus
              />
            </div>

            {mode !== 'simple' && (
              <div>
                <label htmlFor="project-description" className="block text-sm font-medium text-nubank-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  id="project-description"
                  value={projectData.description}
                  onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-nubank-gray-300 rounded-nubank-lg focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent"
                  placeholder="Descreva o objetivo do projeto..."
                  rows={3}
                />
              </div>
            )}
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="strategic-goal" className="block text-sm font-medium text-nubank-gray-700 mb-2">
                Objetivo Estratégico
              </label>
              <textarea
                id="strategic-goal"
                value={projectData.strategicGoal}
                onChange={(e) => setProjectData(prev => ({ ...prev, strategicGoal: e.target.value }))}
                className="w-full px-4 py-3 border border-nubank-gray-300 rounded-nubank-lg focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent"
                placeholder="Qual o impacto esperado deste projeto?"
                rows={4}
              />
            </div>
          </div>
        );

      case 'context':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
                Contexto Adicional
              </label>
              <textarea
                value={projectData.customText}
                onChange={(e) => setProjectData(prev => ({ ...prev, customText: e.target.value }))}
                className="w-full px-4 py-3 border border-nubank-gray-300 rounded-nubank-lg focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent"
                placeholder="Adicione mais detalhes, requisitos ou contexto..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
                Links Relevantes
              </label>
              <textarea
                value={projectData.linksText}
                onChange={(e) => setProjectData(prev => ({ ...prev, linksText: e.target.value }))}
                className="w-full px-4 py-3 border border-nubank-gray-300 rounded-nubank-lg focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent"
                placeholder="Cole links relevantes (um por linha)..."
                rows={3}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
                Arquivos
              </label>
              <div className="border-2 border-dashed border-nubank-gray-300 rounded-nubank-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FiUploadCloud className="w-8 h-8 text-nubank-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-nubank-gray-600">Clique para adicionar arquivos</p>
                </label>
              </div>
              
              {projectData.selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {projectData.selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-nubank-gray-50 rounded">
                      <span className="text-sm text-nubank-gray-700">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-nubank-gray-400 hover:text-red-500"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Recording */}
            <div>
              <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
                Gravação de Áudio
              </label>
              <div className="flex items-center gap-3">
                {!isRecording && !projectData.audioBlob && (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-nubank hover:bg-red-600"
                  >
                    <FiMic className="w-4 h-4" />
                    Gravar
                  </button>
                )}
                
                {isRecording && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-nubank hover:bg-red-700"
                    >
                      <FiPauseCircle className="w-4 h-4" />
                      Parar ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')})
                    </button>
                  </div>
                )}
                
                {projectData.audioBlob && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <FiCheckCircle className="w-4 h-4" />
                      <span className="text-sm">Áudio gravado</span>
                    </div>
                    <button
                      onClick={removeAudio}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'slack':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-nubank-gray-900">Integração Slack</h3>
                <p className="text-sm text-nubank-gray-600">Conecte um canal do Slack para colaboração em equipe</p>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={projectData.slackEnabled}
                  onChange={(e) => setProjectData(prev => ({ ...prev, slackEnabled: e.target.checked }))}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  projectData.slackEnabled ? 'bg-nubank-purple-600' : 'bg-nubank-gray-300'
                }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    projectData.slackEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>

            {projectData.slackEnabled && (
              <div className="p-4 border border-nubank-gray-200 rounded-nubank-lg">
                <p className="text-sm text-nubank-gray-600 mb-4">
                  Selecione um canal do Slack para este projeto. Isso habilitará análise de mensagens com IA e sugestões de tarefas.
                </p>
                
                {/* TODO: Implement Slack integration when SlackGlobalContext is properly defined */}
                <div className="text-center py-8">
                  <div className="text-nubank-gray-500 mb-4">
                    <div className="text-4xl mb-4">🚧</div>
                    <h3 className="text-lg font-medium mb-2">Integração Slack em desenvolvimento</h3>
                    <p className="text-sm">A integração com Slack será implementada em breve.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'ai-analysis':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FiZap className="w-12 h-12 text-nubank-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-nubank-gray-900 mb-2">Análise com IA</h3>
              <p className="text-sm text-nubank-gray-600 mb-6">
                Nossa IA irá analisar as informações do projeto e gerar sugestões inteligentes.
              </p>
            </div>

            {!projectData.generatedPlan && !projectData.isAnalyzing && (
              <button
                onClick={triggerAIAnalysisStep}
                className="w-full py-3 bg-gradient-to-r from-nubank-purple-600 to-nubank-pink-600 text-white rounded-nubank-lg hover:from-nubank-purple-700 hover:to-nubank-pink-700 transition-all duration-200"
              >
                Iniciar Análise IA
              </button>
            )}

            {projectData.isAnalyzing && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-nubank-purple-200 border-t-nubank-purple-600 rounded-full mx-auto mb-4"></div>
                <p className="text-nubank-gray-600">Analisando projeto com IA...</p>
              </div>
            )}

            {projectData.generatedPlan && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-nubank-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Análise Concluída</span>
                  </div>
                  <p className="text-sm text-green-700">
                    A IA analisou seu projeto e gerou sugestões detalhadas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-nubank-gray-50 rounded-nubank">
                    <div className="text-sm font-medium text-nubank-gray-700 mb-1">Stakeholders</div>
                    <div className="text-lg font-bold text-nubank-gray-900">
                      {projectData.generatedPlan.stakeholders?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-nubank-gray-50 rounded-nubank">
                    <div className="text-sm font-medium text-nubank-gray-700 mb-1">Tarefas</div>
                    <div className="text-lg font-bold text-nubank-gray-900">
                      {projectData.generatedPlan.tasks?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-nubank-gray-50 rounded-nubank">
                    <div className="text-sm font-medium text-nubank-gray-700 mb-1">Marcos</div>
                    <div className="text-lg font-bold text-nubank-gray-900">
                      {projectData.generatedPlan.milestones?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-nubank-gray-50 rounded-nubank">
                    <div className="text-sm font-medium text-nubank-gray-700 mb-1">Dependências</div>
                    <div className="text-lg font-bold text-nubank-gray-900">
                      {projectData.generatedPlan.dependencies?.length || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-nubank-gray-900 mb-4">Revisão Final</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-nubank-gray-50 rounded-nubank-lg">
                  <div className="font-medium text-nubank-gray-900 mb-1">{projectData.name}</div>
                  <div className="text-sm text-nubank-gray-600">{projectData.description}</div>
                </div>

                {projectData.strategicGoal && (
                  <div className="p-4 border border-nubank-gray-200 rounded-nubank-lg">
                    <div className="text-sm font-medium text-nubank-gray-700 mb-1">Objetivo Estratégico</div>
                    <div className="text-sm text-nubank-gray-600">{projectData.strategicGoal}</div>
                  </div>
                )}

                {projectData.slackEnabled && (
                  <div className="p-4 border border-nubank-gray-200 rounded-nubank-lg">
                    <div className="text-sm font-medium text-nubank-gray-700 mb-1">Slack Integration</div>
                    <div className="text-sm text-nubank-gray-600">
                      Canal: #{projectData.slackChannelName || 'Não selecionado'}
                    </div>
                  </div>
                )}

                {(projectData.customText || projectData.selectedFiles.length > 0 || projectData.audioBlob) && (
                  <div className="p-4 border border-nubank-gray-200 rounded-nubank-lg">
                    <div className="text-sm font-medium text-nubank-gray-700 mb-2">Contexto Adicional</div>
                    <div className="space-y-1 text-sm text-nubank-gray-600">
                      {projectData.customText && <div>✓ Texto personalizado</div>}
                      {projectData.selectedFiles.length > 0 && <div>✓ {projectData.selectedFiles.length} arquivo(s)</div>}
                      {projectData.audioBlob && <div>✓ Gravação de áudio</div>}
                    </div>
                  </div>
                )}

                {projectData.generatedPlan && (
                  <div className="p-4 border border-nubank-purple-200 rounded-nubank-lg bg-nubank-purple-50">
                    <div className="text-sm font-medium text-nubank-purple-800 mb-2">Análise IA Incluída</div>
                    <div className="space-y-1 text-sm text-nubank-purple-700">
                      <div>✓ Sugestões de stakeholders e tarefas</div>
                      <div>✓ Marcos e dependências identificados</div>
                      <div>✓ Insights estratégicos gerados</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not found</div>;
    }
  };

  // Render navigation buttons
  const renderNavigationButtons = () => {
    const isFirstStep = wizardConfig.steps.indexOf(currentStep) === 0;
    const isLastStep = wizardConfig.steps.indexOf(currentStep) === wizardConfig.steps.length - 1;

    return (
      <div className="flex items-center justify-between pt-6 border-t border-nubank-gray-200">
        <button
          onClick={isFirstStep ? handleClose : goToPreviousStep}
          className="flex items-center gap-2 px-4 py-2 text-nubank-gray-600 hover:text-nubank-gray-800 transition-colors"
        >
          {isFirstStep ? (
            <>
              <FiX className="w-4 h-4" />
              Cancelar
            </>
          ) : (
            <>
              <FiArrowLeft className="w-4 h-4" />
              Voltar
            </>
          )}
        </button>

        <button
          onClick={isLastStep ? createProject : goToNextStep}
          disabled={!canProceed || projectData.isAnalyzing}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-nubank-purple-600 to-nubank-pink-600 text-white rounded-nubank-lg hover:from-nubank-purple-700 hover:to-nubank-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLastStep ? (
            <>
              <FiSave className="w-4 h-4" />
              Criar Projeto
            </>
          ) : (
            <>
              {wizardConfig.mode === 'advanced' && currentStep === 'context' ? 'Continuar para IA' : 'Próximo'}
              <FiArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      <Modal isOpen={showCreateProjectModal} onClose={handleClose} className="max-w-2xl">
        <div className="p-6 space-y-6">
          {/* Header with progress */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-nubank-gray-900">
                {wizardConfig.mode === 'simple' ? 'Novo Projeto' : 'Assistente de Projeto'}
              </h2>
              <div className="text-sm text-nubank-gray-500">
                {progress.current} de {progress.total}
              </div>
            </div>

            {wizardConfig.mode !== 'simple' && (
              <>
                <div className="w-full bg-nubank-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-nubank-gray-600">{progress.stepName}</p>
              </>
            )}
          </div>

          {/* Step content */}
          <div className="space-y-6">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          {renderNavigationButtons()}
        </div>
      </Modal>
      
      <ToastContainer />
    </>
  );
};

export default CreateProjectWizardUnified;