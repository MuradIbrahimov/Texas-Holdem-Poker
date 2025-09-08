import React from 'react';

interface HandHistoryProps {
  hands: any[];
}

const HandHistory: React.FC<HandHistoryProps> = ({ hands }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-bold mb-3">Hand History</h3>
      
      <div className="bg-black/30 rounded p-3 h-64 overflow-y-auto">
        {hands.length === 0 ? (
          <div className="text-gray-500 text-sm">No hands played yet...</div>
        ) : (
          <div className="space-y-4">
            {hands.slice(0, 10).map((hand, index) => (
              <div key={index} className="text-xs font-mono text-gray-300 border-b border-gray-700 pb-2">
                <div className="text-yellow-400">UUID: {hand.uuid}</div>
                <div className="text-blue-400">{hand.stack_info}</div>
                <div className="text-green-400">{hand.hole_cards}</div>
                <div className="text-gray-400">{hand.action_sequence}</div>
                <div className="text-orange-400">{hand.winnings}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        Showing last 10 hands
      </div>
    </div>
  );
};

export default HandHistory;