import React from 'react';

interface PlayLogProps {
  actions: string[];
}

const PlayLog: React.FC<PlayLogProps> = ({ actions }) => {
  const formatAction = (action: string) => {
    const [player, act] = action.split(':');
    let description = `${player}: `;
    
    if (act === 'f') description += 'Fold';
    else if (act === 'x') description += 'Check';
    else if (act === 'c') description += 'Call';
    else if (act.startsWith('b')) description += `Bet $${act.slice(1)}`;
    else if (act.startsWith('r')) description += `Raise $${act.slice(1)}`;
    else if (act.startsWith('sb')) description += `Small Blind $${act.slice(2)}`;
    else if (act.startsWith('bb')) description += `Big Blind $${act.slice(2)}`;
    else if (act === 'allin') description += 'All-in';
    else description += act;
    
    return description;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-bold mb-3">Play Log</h3>
      
      <div className="bg-black/30 rounded p-3 h-48 overflow-y-auto">
        {actions.length === 0 ? (
          <div className="text-gray-500 text-sm">No actions yet...</div>
        ) : (
          <div className="space-y-1">
            {actions.map((action, index) => (
              <div key={index} className="text-white text-sm font-mono">
                {formatAction(action)}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        Format: f=fold, x=check, c=call, b=bet, r=raise
      </div>
    </div>
  );
};

export default PlayLog;