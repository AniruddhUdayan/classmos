import React from 'react';

export interface XPProgressProps {
  currentXP: number;
  level: number;
  nextLevelXP: number;
  currentLevelXP?: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function XPProgress({ 
  currentXP, 
  level, 
  nextLevelXP, 
  currentLevelXP = (level - 1) * 100,
  showDetails = true,
  size = 'md',
  className = '' 
}: XPProgressProps) {
  const progressXP = currentXP - currentLevelXP;
  const xpForNextLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.min((progressXP / xpForNextLevel) * 100, 100);
  const xpToNextLevel = nextLevelXP - currentXP;

  const sizeClasses = {
    sm: {
      container: 'text-sm',
      progress: 'h-2',
      level: 'text-lg',
    },
    md: {
      container: 'text-base',
      progress: 'h-3',
      level: 'text-xl',
    },
    lg: {
      container: 'text-lg',
      progress: 'h-4',
      level: 'text-2xl',
    }
  };

  const getLevelColor = (level: number) => {
    if (level <= 5) return 'from-green-400 to-green-600';
    if (level <= 10) return 'from-blue-400 to-blue-600';
    if (level <= 20) return 'from-purple-400 to-purple-600';
    if (level <= 50) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const getLevelBorder = (level: number) => {
    if (level <= 5) return 'border-green-500';
    if (level <= 10) return 'border-blue-500';
    if (level <= 20) return 'border-purple-500';
    if (level <= 50) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-4">
        {/* Level Badge */}
        <div className={`
          relative flex items-center justify-center w-12 h-12 rounded-full border-3
          bg-gradient-to-br ${getLevelColor(level)} ${getLevelBorder(level)}
          shadow-lg
        `}>
          <span className={`font-bold text-white ${sizeClasses[size].level}`}>
            {level}
          </span>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full px-1">
            <span className="text-xs font-semibold text-gray-700">LV</span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="flex-1">
          {/* XP Display */}
          <div className={`flex justify-between items-center mb-1 ${sizeClasses[size].container}`}>
            <span className="font-semibold text-gray-900">
              {currentXP.toLocaleString()} XP
            </span>
            {showDetails && (
              <span className="text-gray-600 text-sm">
                {xpToNextLevel > 0 ? `${xpToNextLevel} to Level ${level + 1}` : 'Max Level!'}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className={`
            relative w-full bg-gray-200 rounded-full overflow-hidden
            ${sizeClasses[size].progress}
          `}>
            <div 
              className={`
                absolute left-0 top-0 h-full transition-all duration-500 ease-out
                bg-gradient-to-r ${getLevelColor(level)}
                shadow-sm
              `}
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Progress Bar Glow Effect */}
            <div 
              className={`
                absolute left-0 top-0 h-full transition-all duration-500 ease-out
                bg-gradient-to-r from-white to-transparent opacity-30
              `}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Progress Details */}
          {showDetails && (
            <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
              <span>Level {level}</span>
              <span>{progressXP}/{xpForNextLevel} XP</span>
              <span>Level {level + 1}</span>
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      {showDetails && size !== 'sm' && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-900">{level}</div>
            <div className="text-xs text-gray-500">Current Level</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-lg font-bold text-blue-600">{currentXP.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Total XP</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-600">{Math.round(progressPercentage)}%</div>
            <div className="text-xs text-gray-500">Progress</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default XPProgress;
