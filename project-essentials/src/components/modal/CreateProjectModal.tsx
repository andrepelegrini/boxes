
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../../modules/common/components/Modal';
import { useAppContext } from '../../contexts/SimplifiedRootProvider';
import { FiMic, FiUploadCloud, FiLink, FiFileText, FiTrash2, FiPauseCircle, FiCheckCircle, FiActivity, FiPlus } from 'react-icons/fi';
import { useToast } from '../ui/Toast';

const CreateProjectModal: React.FC = () => {
  const { addProject, showCreateProjectModal, setShowCreateProjectModal, triggerAIAnalysis, isAIAvailable } = useAppContext();
  const { showFriendlyError, ToastContainer } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategicGoal, setStrategicGoal] = useState('');

  // AI Input States
  const [customTextAI, setCustomTextAI] = useState('');
  const [linksTextAI, setLinksTextAI] = useState('');
  const [selectedFilesAI, setSelectedFilesAI] = useState<File[]>([]);
  const [audioBlobAI, setAudioBlobAI] = useState<Blob | null>(null);
  const [isRecordingAI, setIsRecordingAI] = useState(false);
  const [recordingTimeAI, setRecordingTimeAI] = useState(0);
  const mediaRecorderAIRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalAIRef = useRef<number | null>(null);
  const audioChunksAIRef = useRef<Blob[]>([]);
  const aiAvailable = isAIAvailable();

  useEffect(() => {
    if (showCreateProjectModal) {
        setName('');
        setDescription('');
        setStrategicGoal('');
        resetAIInputs();
    }
    return () => { 
        if (recordingIntervalAIRef.current) clearInterval(recordingIntervalAIRef.current);
        if (mediaRecorderAIRef.current && mediaRecorderAIRef.current.state === "recording") {
            mediaRecorderAIRef.current.stop();
        }
    };
  }, [showCreateProjectModal]);

  const resetAIInputs = () => {
    setCustomTextAI('');
    setLinksTextAI('');
    setSelectedFilesAI([]);
    setAudioBlobAI(null);
    setIsRecordingAI(false);
    setRecordingTimeAI(0);
    audioChunksAIRef.current = [];
    if (mediaRecorderAIRef.current && mediaRecorderAIRef.current.state === "recording") {
        mediaRecorderAIRef.current.stop();
    }
    if (recordingIntervalAIRef.current) {
        clearInterval(recordingIntervalAIRef.current);
    }
  };

  const handleFileChangeAI = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFilesAI(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };
  const removeFileAI = (fileName: string) => setSelectedFilesAI(prev => prev.filter(f => f.name !== fileName));

  const startRecordingAI = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderAIRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksAIRef.current = [];
      mediaRecorderAIRef.current.ondataavailable = (event) => audioChunksAIRef.current.push(event.data);
      mediaRecorderAIRef.current.onstop = () => {
        setAudioBlobAI(new Blob(audioChunksAIRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderAIRef.current.start();
      setIsRecordingAI(true);
      setRecordingTimeAI(0);
      recordingIntervalAIRef.current = window.setInterval(() => setRecordingTimeAI(prev => prev + 1), 1000);
    } catch (err) { console.error("Error starting AI recording:", err); showFriendlyError('🎤 Problema com o Microfone\n\nNão conseguimos acessar seu microfone. Verifique as permissões do navegador.'); }
  };

  const stopRecordingAI = () => {
    if (mediaRecorderAIRef.current && isRecordingAI) {
      mediaRecorderAIRef.current.stop();
      setIsRecordingAI(false);
      if (recordingIntervalAIRef.current) clearInterval(recordingIntervalAIRef.current);
    }
  };
  const resetAudioAI = () => { setAudioBlobAI(null); setRecordingTimeAI(0); if(isRecordingAI) stopRecordingAI(); };
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showFriendlyError('name is required');
      return;
    }
    const projectData: { name: string; description?: string; strategicGoal?: string } = {
      name,
      description,
    };
    
    if (strategicGoal.trim()) {
      projectData.strategicGoal = strategicGoal.trim();
    }
    
    const newProject = addProject(projectData);

    if (newProject) {
      try {
        triggerAIAnalysis(newProject.id);
      } catch (err: unknown) { 
        console.error("Failed to trigger AI Analysis on project creation:", err);
      }
      setShowCreateProjectModal(false);
    }
  };

  return (
    <Modal
      isOpen={showCreateProjectModal}
      onClose={() => setShowCreateProjectModal(false)}
      title="Criar Nova Caixa"
      size="2xl" 
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-textAccent mb-1">
            Nome da Caixa
          </label>
          <input
            type="text"
            id="projectName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-textOnSurface placeholder-textAccent/70"
            placeholder="Ex: Lançamento Produto X"
            required
          />
        </div>
        <div>
          <label htmlFor="projectDescription" className="block text-sm font-medium text-textAccent mb-1">
            Descrição (Opcional)
          </label>
          <textarea
            id="projectDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-textOnSurface placeholder-textAccent/70"
            placeholder="Descreva o objetivo principal ou contexto desta Caixa."
          ></textarea>
        </div>
        <div>
          <label htmlFor="strategicGoal" className="block text-sm font-medium text-textAccent mb-1">
            Meta Estratégica (Opcional)
          </label>
          <input
            type="text"
            id="strategicGoal"
            value={strategicGoal}
            onChange={(e) => setStrategicGoal(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-textOnSurface placeholder-textAccent/70"
            placeholder="Ex: Aumentar o engajamento em 15% no T4"
          />
        </div>

        {aiAvailable && (
            <div className="pt-4 border-t border-border">
                <div className="flex items-center mb-2">
                    <FiActivity className="text-primary mr-2" size={18}/>
                    <h3 className="text-base font-medium text-primary">Assistente IA: Kickstart (Opcional)</h3>
                </div>
                <p className="text-xs text-textAccent mb-3">Forneça contexto para a IA elaborar um kick-off inicial, sugerir tarefas, etc., assim que a caixa for criada.</p>
                <div className="space-y-3 p-3 bg-primary/5 rounded-md border border-primary/10">
                    <div>
                        <label htmlFor="aiCustomTextModal" className="block text-xs font-medium text-textAccent mb-0.5 flex items-center"><FiFileText className="mr-1"/>Contexto Adicional</label>
                        <textarea id="aiCustomTextModal" value={customTextAI} onChange={(e) => setCustomTextAI(e.target.value)} rows={2} className="w-full p-2 bg-background border-border rounded-md text-textOnSurface text-sm focus:ring-1 focus:ring-primary placeholder-textAccent/60" placeholder="Cole notas, ideias, transcrições..."/>
                    </div>
                    <div>
                        <label htmlFor="aiLinksModal" className="block text-xs font-medium text-textAccent mb-0.5 flex items-center"><FiLink className="mr-1"/>Links (separados por vírgula ou espaço)</label>
                        <input type="text" id="aiLinksModal" value={linksTextAI} onChange={(e) => setLinksTextAI(e.target.value)} className="w-full p-2 bg-background border-border rounded-md text-textOnSurface text-sm focus:ring-1 focus:ring-primary placeholder-textAccent/60" placeholder="https://exemplo.com, https://docs.com"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-textAccent mb-0.5 flex items-center"><FiUploadCloud className="mr-1"/>Arquivos</label>
                        <input type="file" multiple onChange={handleFileChangeAI} className="w-full text-xs text-textAccent file:mr-2 file:py-1.5 file:px-2 file:rounded-md file:border-0 file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"/>
                        {selectedFilesAI.length > 0 && <div className="mt-1.5 space-y-0.5 text-xs">{selectedFilesAI.map(f => <div key={f.name} className="flex justify-between items-center p-1 bg-secondary-light text-textAccent rounded text-xs"><span className="truncate w-4/5">{f.name} ({ (f.size/1024).toFixed(1)}KB)</span><button type="button" onClick={() => removeFileAI(f.name)} className="text-danger-DEFAULT p-0.5"><FiTrash2 size={12}/></button></div>)}</div>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-textAccent mb-0.5 flex items-center"><FiMic className="mr-1"/>Memo de Áudio</label>
                        {!isRecordingAI && !audioBlobAI && <button type="button" onClick={startRecordingAI} className="w-full flex items-center justify-center py-1.5 px-2 bg-info/10 hover:bg-info/20 text-info text-xs rounded-md font-medium"><FiMic className="mr-1.5"/>Gravar Áudio</button>}
                        {isRecordingAI && <div className="flex items-center space-x-2"><button type="button" onClick={stopRecordingAI} className="flex-grow flex items-center justify-center py-1.5 px-2 bg-danger-DEFAULT/10 hover:bg-danger-DEFAULT/20 text-danger-DEFAULT text-xs rounded-md font-medium"><FiPauseCircle className="mr-1.5"/>Parar</button><span className="text-xs text-textAccent bg-background px-1.5 py-0.5 rounded-md">{formatTime(recordingTimeAI)}</span></div>}
                        {!isRecordingAI && audioBlobAI && <div className="flex items-center justify-between p-1.5 bg-secondary-light rounded-md text-xs"><span className="text-primary flex items-center"><FiCheckCircle className="mr-1.5"/>Áudio gravado ({formatTime(recordingTimeAI)})</span><button type="button" onClick={resetAudioAI} className="text-danger-DEFAULT p-0.5"><FiTrash2/></button></div>}
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-end pt-3 space-x-3">
          <button
            type="button"
            onClick={() => setShowCreateProjectModal(false)}
            className="py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-textAccent hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-textOnPrimary bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
          >
            <FiPlus className="mr-2" /> Criar Caixa
          </button>
        </div>
      </form>
      <ToastContainer />
    </Modal>
  );
};

export default CreateProjectModal;