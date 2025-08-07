// src/components/templates/TemplateLibrary.tsx
import React, { useState, useMemo } from 'react';
import { 
  FiSearch, FiFilter, FiStar, FiUsers, FiClock, FiTag,
  FiGrid, FiList, FiTrendingUp, FiAward, FiBookmark,
  FiX, FiZap
} from 'react-icons/fi';
import { ProjectTemplate } from '../../services/ProjectTemplateService';
import { useProjectTemplates, useTemplateConstants } from '../../hooks/useProjectTemplates';
import PulseButton from '../ui/PulseButton';
import GlowingCard from '../ui/GlowingCard';
import TypewriterText from '../ui/TypewriterText';

interface TemplateLibraryProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  onClose?: () => void;
  selectedCategories?: ProjectTemplate['category'][];
  className?: string;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onClose,
  selectedCategories = [],
  className = ''
}) => {
  const { 
    templates, 
    popularTemplates, 
    isLoading, 
    searchTemplates, 
  } = useProjectTemplates();
  
  const { categories, difficulties, getDifficultyColor, getCategoryColor } = useTemplateConstants();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectTemplate['category'] | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<ProjectTemplate['difficulty'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'name' | 'rating' | 'recent'>('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Apply search
    if (searchQuery.trim()) {
      filtered = searchTemplates(searchQuery.trim());
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(t => t.difficulty === selectedDifficulty);
    }

    // Apply pre-selected categories if provided
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(t => selectedCategories.includes(t.category));
    }

    // Sort templates
    switch (sortBy) {
      case 'popular':
        return filtered.sort((a, b) => b.usageCount - a.usageCount);
      case 'name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'rating':
        return filtered.sort((a, b) => b.rating - a.rating);
      case 'recent':
        return filtered.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      default:
        return filtered;
    }
  }, [templates, searchQuery, selectedCategory, selectedDifficulty, selectedCategories, sortBy, searchTemplates]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
  };

  const getTemplateIcon = (category: ProjectTemplate['category']) => {
    switch (category) {
      case 'desenvolvimento': return <FiZap className="text-nubank-purple-600" size={20} />;
      case 'marketing': return <FiTrendingUp className="text-nubank-pink-600" size={20} />;
      case 'pesquisa': return <FiBookmark className="text-nubank-blue-600" size={20} />;
      case 'design': return <FiStar className="text-nubank-orange-600" size={20} />;
      case 'negocio': return <FiAward className="text-nubank-green-600" size={20} />;
      case 'pessoal': return <FiUsers className="text-nubank-gray-600" size={20} />;
      case 'educacao': return <FiBookmark className="text-nubank-blue-600" size={20} />;
      default: return <FiGrid className="text-nubank-gray-600" size={20} />;
    }
  };

  const TemplateCard: React.FC<{ template: ProjectTemplate; index: number }> = ({ template, index }) => (
    <GlowingCard
      glowColor={template.difficulty === 'avancado' ? 'purple' : 'blue'}
      intensity="low"
      className={`p-6 glass-card rounded-lg cursor-pointer transition-all duration-200 ${
        viewMode === 'grid' 
          ? 'stagger-item hover:scale-105' 
          : 'flex items-center space-x-4 notion-hover'
      }`}
      style={viewMode === 'grid' ? { animationDelay: `${index * 0.1}s` } : {}}
      onClick={() => onSelectTemplate(template)}
    >
      {viewMode === 'grid' ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {getTemplateIcon(template.category)}
              <div>
                <h3 className="font-bold text-nubank-gray-800 text-lg">
                  {template.name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {categories.find(c => c.value === template.category)?.label}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                    {difficulties.find(d => d.value === template.difficulty)?.label}
                  </span>
                </div>
              </div>
            </div>
            
            {template.isBuiltIn && (
              <div className="px-2 py-1 bg-nubank-purple-100 text-nubank-purple-700 rounded-full text-xs font-medium">
                Oficial
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-nubank-gray-600 text-sm line-clamp-3">
            {template.description}
          </p>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <FiUsers className="text-nubank-blue-600" size={14} />
              <span className="text-xs text-nubank-gray-600">
                {template.usageCount} usos
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <FiClock className="text-nubank-green-600" size={14} />
              <span className="text-xs text-nubank-gray-600">
                {template.estimatedDuration}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <FiStar className="text-nubank-orange-600" size={14} />
              <span className="text-xs text-nubank-gray-600">
                {template.rating > 0 ? template.rating.toFixed(1) : 'Novo'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <FiTag className="text-nubank-purple-600" size={14} />
              <span className="text-xs text-nubank-gray-600">
                {template.tasksTemplate.length} tarefas
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <span 
                key={tag} 
                className="px-2 py-1 bg-nubank-gray-100 text-nubank-gray-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="px-2 py-1 bg-nubank-gray-100 text-nubank-gray-600 rounded text-xs">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      ) : (
        // List view
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getTemplateIcon(template.category)}
            <div>
              <h3 className="font-semibold text-nubank-gray-800">
                {template.name}
              </h3>
              <p className="text-sm text-nubank-gray-600 line-clamp-1">
                {template.description}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                  {categories.find(c => c.value === template.category)?.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                  {difficulties.find(d => d.value === template.difficulty)?.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-nubank-gray-600">
            <div className="flex items-center space-x-1">
              <FiUsers size={14} />
              <span>{template.usageCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FiStar size={14} />
              <span>{template.rating > 0 ? template.rating.toFixed(1) : 'Novo'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FiClock size={14} />
              <span>{template.estimatedDuration}</span>
            </div>
          </div>
        </div>
      )}
    </GlowingCard>
  );

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 glass-card rounded-lg space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: '60%' }}></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: '40%' }}></div>
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse" style={{ width: '80px' }}></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse" style={{ width: '60px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <TypewriterText
            text="Biblioteca de Templates"
            speed={80}
            className="text-2xl font-bold text-nubank-gray-800 block"
          />
          <p className="text-nubank-gray-600 mt-1">
            {filteredTemplates.length} templates encontrados
          </p>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-nubank-gray-400 hover:text-nubank-gray-600 transition-colors ripple"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {/* Quick Stats */}
      {popularTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlowingCard
            glowColor="purple"
            intensity="low"
            className="p-4 glass-card rounded-lg text-center stagger-item"
          >
            <FiTrendingUp className="text-nubank-purple-600 mx-auto mb-2" size={24} />
            <div className="text-lg font-bold text-nubank-gray-800">
              {popularTemplates[0]?.name}
            </div>
            <div className="text-sm text-nubank-gray-600">Mais Popular</div>
          </GlowingCard>
          
          <GlowingCard
            glowColor="blue"
            intensity="low"
            className="p-4 glass-card rounded-lg text-center stagger-item"
          >
            <FiGrid className="text-nubank-blue-600 mx-auto mb-2" size={24} />
            <div className="text-lg font-bold text-nubank-gray-800">
              {templates.length}
            </div>
            <div className="text-sm text-nubank-gray-600">Templates Disponíveis</div>
          </GlowingCard>
          
          <GlowingCard
            glowColor="green"
            intensity="low"
            className="p-4 glass-card rounded-lg text-center stagger-item"
          >
            <FiAward className="text-nubank-green-600 mx-auto mb-2" size={24} />
            <div className="text-lg font-bold text-nubank-gray-800">
              {categories.length}
            </div>
            <div className="text-sm text-nubank-gray-600">Categorias</div>
          </GlowingCard>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nubank-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 glass-card rounded-lg border border-nubank-gray-200 focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 transition-all"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <PulseButton
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'primary' : 'secondary'}
              size="sm"
              className="flex items-center space-x-2"
            >
              <FiFilter size={14} />
              <span>Filtros</span>
            </PulseButton>

            {(selectedCategory !== 'all' || selectedDifficulty !== 'all' || searchQuery) && (
              <PulseButton
                onClick={clearFilters}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
              >
                <FiX size={14} />
                <span>Limpar</span>
              </PulseButton>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 glass-card rounded-lg border border-nubank-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-nubank-purple-500"
            >
              <option value="popular">Mais Populares</option>
              <option value="name">Nome A-Z</option>
              <option value="rating">Melhor Avaliados</option>
              <option value="recent">Mais Recentes</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center glass-card rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-nubank-purple-100 text-nubank-purple-700' 
                    : 'text-nubank-gray-600 hover:text-nubank-gray-800'
                }`}
              >
                <FiGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-nubank-purple-100 text-nubank-purple-700' 
                    : 'text-nubank-gray-600 hover:text-nubank-gray-800'
                }`}
              >
                <FiList size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="p-4 glass-card rounded-lg border border-nubank-gray-200 slide-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-nubank-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nubank-purple-500"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
                  Dificuldade
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 border border-nubank-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nubank-purple-500"
                >
                  <option value="all">Todas as dificuldades</option>
                  {difficulties.map(difficulty => (
                    <option key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Templates Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {filteredTemplates.map((template, index) => (
          <TemplateCard key={template.id} template={template} index={index} />
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-nubank-gray-100 rounded-full flex items-center justify-center">
            <FiGrid className="text-nubank-gray-400" size={24} />
          </div>
          <h3 className="text-lg font-medium text-nubank-gray-600 mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-nubank-gray-500 mb-4">
            Tente ajustar os filtros ou buscar por outros termos
          </p>
          <PulseButton
            onClick={clearFilters}
            variant="primary"
            size="sm"
          >
            Limpar Filtros
          </PulseButton>
        </div>
      )}
    </div>
  );
};

export default TemplateLibrary;