// frontend/src/app/HandHistory.tsx - Fixed to match exact task format

import React, { useEffect, useState } from 'react';

interface HandRecord {
  uuid: string;
  stack_info: string;
  hole_cards: string;
  action_sequence: string;
  winnings: string;
}

const HandHistory: React.FC = () => {
  const [hands, setHands] = useState<HandRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchHandHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/hands');
      if (response.ok) {
        const data = await response.json();
        // The backend now returns hands in the correct format
        if (data.hands && Array.isArray(data.hands)) {
          setHands(data.hands);
        }
      }
    } catch (error) {
      console.error('Failed to fetch hand history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Fetch initially
    fetchHandHistory();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchHandHistory, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">📜 Hand History</h3>
      
      <div className="text-xs space-y-3 max-h-96 overflow-y-auto font-mono">
        {loading && hands.length === 0 ? (
          <div className="text-gray-400 italic">Loading hand history...</div>
        ) : hands.length === 0 ? (
          <div className="text-gray-400 italic">No hands played yet</div>
        ) : (
          hands.map((hand, index) => (
            <div key={hand.uuid || index} className="bg-slate-700 p-2 rounded border border-slate-600 space-y-1">
              {/* Line 1: UUID */}
              <div className="text-yellow-400 break-all">{hand.uuid}</div>
              
              {/* Line 2: Stack info + positions */}
              <div className="text-blue-300 text-xs">{hand.stack_info}</div>
              
              {/* Line 3: Hole cards */}
              <div className="text-green-300 text-xs">{hand.hole_cards}</div>
              
              {/* Line 4: Action sequence */}
              <div className="text-gray-300 text-xs break-all">{hand.action_sequence}</div>
              
              {/* Line 5: Winnings */}
              <div className="text-orange-300 text-xs">{hand.winnings}</div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-400 flex justify-between">
        <span>Showing last {hands.length} hands</span>
        <button 
          onClick={fetchHandHistory}
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default HandHistory;