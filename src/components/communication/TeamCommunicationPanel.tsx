import React from 'react';

interface TeamCommunicationPanelProps {
  className?: string;
}

const TeamCommunicationPanel: React.FC<TeamCommunicationPanelProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`team-communication-panel ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Team Communication</h3>
      <p className="text-gray-600">Team communication features coming soon...</p>
    </div>
  );
};

export default TeamCommunicationPanel;