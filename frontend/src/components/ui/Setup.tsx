import React from 'react';

interface SetupProps {
  onReset: () => void;
  onStackChange: (stack: number) => void;
  stackSize: number;
  isHandActive: boolean;
}

const Setup: React.FC<SetupProps> = ({ 
  onReset, 
  onStackChange, 
  stackSize, 
  isHandActive 
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold">Game Setup</h3>
      
      <div className="flex items-center gap-4">
        <label className="text-white">
          Starting Stack:
        </label>
        <input
          type="number"
          value={stackSize}
          onChange={(e) => onStackChange(Number(e.target.value))}
          className="w-32 px-3 py-2 bg-gray-700 text-white rounded"
          min={100}
          max={10000}
          step={100}
          disabled={isHandActive}
        />
        
        <button
          onClick={onReset}
          className={`px-6 py-2 rounded font-bold transition ${
            isHandActive 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isHandActive ? 'Reset' : 'Start'}
        </button>
      </div>
      
      <div className="text-sm text-gray-400">
        {isHandActive 
          ? 'Click Reset to abandon current hand and start over' 
          : 'Set stack size and click Start to deal cards'}
      </div>
    </div>
  );
};

export default Setup;