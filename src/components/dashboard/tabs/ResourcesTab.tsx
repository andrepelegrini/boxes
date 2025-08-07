import React, { useMemo, useState } from 'react';
import { FiFileText, FiPlus, FiExternalLink, FiDownload, FiSearch, FiFolder, FiLink } from 'react-icons/fi';
import { Project, DocumentItem } from '../../../types/app';
import { ContextualResources } from '../widgets/ContextualResources';
import { useAppContext } from '../../../contexts/SimplifiedRootProvider';
import AddDocumentModal from '../../modal/AddDocumentModal';

interface ResourcesTabProps {
  project: Project;
  documents: DocumentItem[];
  onUploadFiles: () => void;
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({
  project,
  documents,
  onUploadFiles,
}) => {
  const { addDocument, setCurrentEditingProjectForDocument, showAddDocumentModal, setShowAddDocumentModal } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  const categorizedDocuments = useMemo(() => {
    const categories = {
      ai_kickoff: { name: 'AI Generated', icon: '🤖', color: 'purple' },
      doc: { name: 'Documents', icon: '📄', color: 'blue' },
      file: { name: 'Files', icon: '📎', color: 'green' },
      link: { name: 'Links', icon: '🔗', color: 'pink' },
      other: { name: 'Other', icon: '📁', color: 'gray' }
    };

    const categorized = documents.reduce((acc, doc) => {
      const category = doc.type in categories ? doc.type : 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(doc);
      return acc;
    }, {} as Record<string, DocumentItem[]>);

    // Sort documents by date within each category
    Object.keys(categorized).forEach(category => {
      categorized[category].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });

    return { categorized, categories };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.type === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [documents, selectedCategory, searchTerm]);

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'ai_kickoff':
        return '🤖';
      case 'doc':
        return '📄';
      case 'file':
        return '📎';
      case 'link':
        return '🔗';
      default:
        return '📄';
    }
  };

  const getFileSize = (size?: number) => {
    if (!size) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && index < units.length - 1) {
      fileSize /= 1024;
      index++;
    }
    
    return `${Math.round(fileSize * 10) / 10} ${units[index]}`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.RelativeTimeFormat('en').format(
      -Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  const DocumentCard = ({ document: docItem }: { document: DocumentItem }) => (
    <div className="bg-white border border-nubank-gray-200 rounded-nubank-lg p-4 hover:shadow-sm transition-all duration-300 group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-nubank-gray-100 rounded-nubank flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{getDocumentIcon(docItem.type)}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-nubank-gray-800 group-hover:text-nubank-purple-700 transition-colors truncate">
              {docItem.name}
            </h4>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadDocument(docItem);
                }}
                className="text-nubank-gray-500 hover:text-nubank-blue-600 transition-colors"
              >
                <FiDownload className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenExternalLink(docItem);
                }}
                className="text-nubank-gray-500 hover:text-nubank-purple-600 transition-colors"
              >
                <FiExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {docItem.description && (
            <p className="text-sm text-nubank-gray-600 mt-1 line-clamp-2">
              {docItem.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-nubank-gray-500">
            <span>{formatDate(docItem.updatedAt)}</span>
            {docItem.size && <span>{getFileSize(docItem.size)}</span>}
            <span className="capitalize">{docItem.type.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Main Documents Panel */}
      <div className="col-span-3 space-y-6">
        {/* Header with Search */}
        <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
          <div className="p-6 border-b border-nubank-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-nubank-gray-800 flex items-center">
                <FiFileText className="w-5 h-5 mr-3 text-nubank-blue-600" />
                Project Resources
              </h2>
              <button
                onClick={onUploadFiles}
                className="bg-nubank-blue-600 hover:bg-nubank-blue-700 text-white px-4 py-2 rounded-nubank-lg font-medium transition-colors flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Add Resource
              </button>
            </div>
            
            {/* Search and Filter */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nubank-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-nubank-gray-300 rounded-nubank-lg focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-nubank-gray-300 rounded-nubank-lg focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-nubank-purple-500 bg-white"
              >
                <option value="all">All Categories</option>
                {Object.entries(categorizedDocuments.categories).map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Documents Grid */}
          <div className="p-6">
            {filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredDocuments.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-nubank-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFileText className="w-8 h-8 text-nubank-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-nubank-gray-600 mb-2">
                  {searchTerm || selectedCategory !== 'all' ? 'No resources found' : 'No resources yet'}
                </h3>
                <p className="text-nubank-gray-500 mb-6">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filter'
                    : 'Upload documents, files, and links to organize your project resources'
                  }
                </p>
                {(!searchTerm && selectedCategory === 'all') && (
                  <button
                    onClick={onUploadFiles}
                    className="bg-nubank-blue-600 hover:bg-nubank-blue-700 text-white px-6 py-3 rounded-nubank-lg font-medium transition-colors"
                  >
                    Upload First Resource
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contextual Resources Widget */}
        <ContextualResources
          project={project}
          documents={documents}
          onUploadFiles={onUploadFiles}
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Categories Overview */}
        <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
          <div className="p-6 border-b border-nubank-gray-200">
            <h3 className="text-lg font-semibold text-nubank-gray-800">Categories</h3>
          </div>
          
          <div className="p-6 space-y-3">
            {Object.entries(categorizedDocuments.categories).map(([key, category]) => {
              const count = categorizedDocuments.categorized[key]?.length || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                  className={`w-full text-left p-3 rounded-nubank transition-colors flex items-center justify-between ${
                    selectedCategory === key 
                      ? 'bg-nubank-purple-50 border border-nubank-purple-200' 
                      : 'hover:bg-nubank-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium text-nubank-gray-800">{category.name}</span>
                  </div>
                  <span className="text-sm text-nubank-gray-500">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Storage Overview */}
        <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
          <div className="p-6 border-b border-nubank-gray-200">
            <h3 className="text-lg font-semibold text-nubank-gray-800">Storage</h3>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-nubank-gray-800">{documents.length}</div>
              <div className="text-sm text-nubank-gray-600">Total Resources</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-nubank-gray-600">Documents</span>
                <span className="font-medium">{categorizedDocuments.categorized.doc?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-nubank-gray-600">Files</span>
                <span className="font-medium">{categorizedDocuments.categorized.file?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-nubank-gray-600">Links</span>
                <span className="font-medium">{categorizedDocuments.categorized.link?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-nubank-gray-600">AI Generated</span>
                <span className="font-medium">{categorizedDocuments.categorized.ai_kickoff?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-nubank-blue-50 to-nubank-purple-50 rounded-nubank-lg border border-nubank-blue-200 p-6">
          <h3 className="text-lg font-semibold text-nubank-gray-800 mb-4">Quick Actions</h3>
          
          <div className="space-y-3">
            <button
              onClick={handleUploadFiles}
              className="w-full text-left p-3 bg-white/80 hover:bg-white rounded-nubank transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-nubank-blue-100 rounded-nubank flex items-center justify-center">
                <FiFileText className="w-4 h-4 text-nubank-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-nubank-gray-800">Upload Document</h4>
                <p className="text-xs text-nubank-gray-500">Add files or docs</p>
              </div>
            </button>
            
            <button 
              onClick={handleAddLink}
              className="w-full text-left p-3 bg-white/80 hover:bg-white rounded-nubank transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-nubank-purple-100 rounded-nubank flex items-center justify-center">
                <FiLink className="w-4 h-4 text-nubank-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-nubank-gray-800">Add Link</h4>
                <p className="text-xs text-nubank-gray-500">External resource</p>
              </div>
            </button>
            
            <button 
              onClick={handleCreateFolder}
              className="w-full text-left p-3 bg-white/80 hover:bg-white rounded-nubank transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-nubank-green-100 rounded-nubank flex items-center justify-center">
                <FiFolder className="w-4 h-4 text-nubank-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-nubank-gray-800">Create Folder</h4>
                <p className="text-xs text-nubank-gray-500">Organize resources</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        {documents.length > 0 && (
          <div className="bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
            <div className="p-6 border-b border-nubank-gray-200">
              <h3 className="text-lg font-semibold text-nubank-gray-800">Recent Updates</h3>
            </div>
            
            <div className="p-6 space-y-3">
              {documents.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-nubank-gray-50 rounded-nubank transition-colors">
                  <span className="text-sm">{getDocumentIcon(doc.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-nubank-gray-800 truncate">{doc.name}</p>
                    <p className="text-xs text-nubank-gray-500">{formatDate(doc.updatedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <AddDocumentModal
        isOpen={showAddDocumentModal}
        onClose={() => setShowAddDocumentModal(false)}
        projectId={project.id}
      />
      
      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create Folder</h3>
            <form onSubmit={handleCreateFolderSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Folder Name</label>
                  <input
                    type="text"
                    id="folderName"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Design Assets, Meeting Notes"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    id="folderDescription"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Describe this folder's purpose..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-nubank-blue-500 text-white rounded-md hover:bg-nubank-blue-600"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Handler functions
  function handleUploadFiles() {
    setCurrentEditingProjectForDocument(project.id);
    setShowAddDocumentModal(true);
  }

  function handleAddLink() {
    setCurrentEditingProjectForDocument(project.id);
    setShowAddDocumentModal(true);
    // The AddDocumentModal already supports link type
  }

  function handleCreateFolder() {
    setShowCreateFolderModal(true);
  }

  function handleDownloadDocument(docItem: DocumentItem) {
    if (docItem.url) {
      // For documents with URLs, open in new tab for download
      window.open(docItem.url, '_blank');
    } else if (docItem.content) {
      // For documents with content, create blob and download
      const blob = new Blob([docItem.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      console.error('No downloadable content available for document:', docItem.name);
    }
  }

  function handleOpenExternalLink(docItem: DocumentItem) {
    if (docItem.url) {
      window.open(docItem.url, '_blank');
    } else {
      console.error('No URL available for document:', docItem.name);
    }
  }

  function handleCreateFolderSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    
    const folderData = {
      name: (form.querySelector('#folderName') as HTMLInputElement).value,
      description: (form.querySelector('#folderDescription') as HTMLTextAreaElement).value,
      type: 'folder' as const,
      projectId: project.id,
      url: '',
      content: ''
    };

    try {
      addDocument(folderData);
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }
};