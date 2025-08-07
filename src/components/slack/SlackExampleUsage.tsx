import { SlackMasterInterface } from './SlackMasterInterface';

// Exemplo de como usar a nova interface do Slack
export function SlackExampleUsage() {
  const mockProjects = [
    { id: '1', name: 'Website Redesign', color: '#3b82f6' },
    { id: '2', name: 'Mobile App', color: '#10b981' },
    { id: '3', name: 'Marketing Campaign', color: '#f59e0b' },
    { id: '4', name: 'Customer Support', color: '#ef4444' },
  ];

  const handleTaskCreated = (taskId: string, projectId: string) => {
    console.log(`✅ Nova tarefa criada: ${taskId} no projeto ${projectId}`);
    
    // Aqui você poderia:
    // - Mostrar uma notificação de sucesso
    // - Redirecionar para a tarefa criada
    // - Atualizar a lista de tarefas
    // - Sincronizar com outros sistemas
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SlackMasterInterface 
        projects={mockProjects}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}

// Exemplo de integração em uma página de configurações
export function SlackSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">Configure suas integrações externas</p>
      </div>
      
      <div className="grid gap-6">
        {/* Outras integrações poderiam vir aqui */}
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Slack Integration</h2>
          <SlackMasterInterface 
            projects={[
              { id: '1', name: 'Projeto Principal' },
              { id: '2', name: 'Projeto Secundário' },
            ]}
            onTaskCreated={(taskId, projectId) => {
              console.log('Task created from settings page:', { taskId, projectId });
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Exemplo de uso minimalista (apenas dashboard)
export function SlackMinimalDashboard() {
  const { SlackDashboard } = require('./SlackDashboard');
  
  return (
    <SlackDashboard
      projects={[{ id: '1', name: 'My Project' }]}
      onTaskCreated={(taskId: string, projectId: string) => {
        alert(`Task ${taskId} created in project ${projectId}`);
      }}
      onOpenSettings={() => {
        console.log('Open settings clicked');
      }}
    />
  );
}