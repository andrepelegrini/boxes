import { useMemo } from 'react';

export const useHumanizedText = () => {
  return useMemo(() => ({
    PROJECT_STATES: {
      active: 'Ativo',
      shelf: 'Prateleira', 
      archived: 'Arquivado',
      nextUp: 'Próximo'
    },
    
    ACTIONS: {
      create: {
        success: 'Projeto criado com sucesso:',
        error: 'Erro ao criar projeto'
      },
      update: {
        success: 'Projeto atualizado',
        error: 'Erro ao atualizar projeto'
      },
      delete: {
        success: 'Projeto removido',
        error: 'Erro ao remover projeto'
      },
      promote: {
        success: 'Projeto promovido para ativo',
        error: 'Erro ao promover projeto'
      },
      demote: {
        success: 'Projeto movido para prateleira',
        error: 'Erro ao mover projeto'
      },
      archive: {
        success: 'Projeto arquivado',
        error: 'Erro ao arquivar projeto'
      }
    },
    
    FEEDBACK: {
      loading: 'Carregando...',
      saving: 'Salvando...',
      success: 'Sucesso!',
      error: 'Ops! Algo deu errado',
      confirm: 'Tem certeza?',
      cancel: 'Cancelar',
      save: 'Salvar',
      delete: 'Excluir',
      edit: 'Editar'
    },
    
    HILL_CHART: {
      figuring: 'Descobrindo',
      solving: 'Resolvendo',
      done: 'Finalizado',
      stuck: 'Travado',
      unknown: 'Indefinido'
    }
  }), []);
};