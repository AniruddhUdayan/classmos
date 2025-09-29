import React from 'react';

export interface StreakCounterProps {
  currentStreak: number;
  maxStreak?: number;
  size?: 'sm' | 'md' | 'lg';
  showMaxStreak?: boolean;
  animated?: boolean;
  className?: string;
}

export function StreakCounter({ 
  currentStreak, 
  maxStreak, 
  size = 'md',
  showMaxStreak = true,
  animated = true,
  className = '' 
}: StreakCounterProps) {
  const sizeClasses = {
    sm: {
      container: 'text-sm',
      streak: 'text-xl',
      fire: 'text-lg',
      padding: 'p-2'
    },
    md: {
      container: 'text-base',
      streak: 'text-3xl',
      fire: 'text-2xl',
      padding: 'p-4'
    },
    lg: {
      container: 'text-lg',
      streak: 'text-4xl',
      fire: 'text-3xl',
      padding: 'p-6'
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak === 0) return 'from-gray-400 to-gray-500';
    if (streak < 3) return 'from-orange-400 to-orange-500';
    if (streak < 7) return 'from-red-400 to-red-500';
    if (streak < 14) return 'from-blue-400 to-blue-500';
    if (streak < 30) return 'from-purple-400 to-purple-500';
    return 'from-yellow-400 to-yellow-500';
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return 'Great start!';
    if (streak < 3) return 'Keep it up!';
    if (streak < 7) return 'On fire! 🔥';
    if (streak < 14) return 'Incredible streak!';
    if (streak < 30) return 'Unstoppable! ⚡';
    return 'Legendary! 👑';
  };

  const getFireEmojis = (streak: number) => {
    if (streak === 0) return '💨';
    if (streak < 3) return '🔥';
    if (streak < 7) return '🔥🔥';
    if (streak < 14) return '🔥🔥🔥';
    return '🔥🔥🔥🔥';
  };

  return (
    <div className={`
      relative rounded-xl border-2 border-opacity-20
      ${currentStreak > 0 ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-red-50' : 'border-gray-300 bg-gray-50'}
      ${sizeClasses[size].padding}
      ${className}
    `}>
      {/* Streak Icon and Count */}
      <div className="text-center">
        <div className={`
          inline-flex items-center justify-center w-16 h-16 rounded-full
          bg-gradient-to-br ${getStreakColor(currentStreak)}
          shadow-lg mb-3
          ${animated && currentStreak > 0 ? 'animate-pulse' : ''}
        `}>
          <span className={`${sizeClasses[size].fire}`}>
            {getFireEmojis(currentStreak)}
          </span>
        </div>

        {/* Streak Number */}
        <div className={`
          font-bold ${sizeClasses[size].streak}
          ${currentStreak > 0 ? 'text-orange-600' : 'text-gray-500'}
          mb-1
        `}>
          {currentStreak}
        </div>

        {/* Streak Label */}
        <div className={`
          text-sm font-medium
          ${currentStreak > 0 ? 'text-orange-700' : 'text-gray-600'}
          mb-2
        `}>
          Day Streak
        </div>

        {/* Streak Message */}
        <div className={`
          text-xs 
          ${currentStreak > 0 ? 'text-orange-600' : 'text-gray-500'}
          font-medium
        `}>
          {getStreakMessage(currentStreak)}
        </div>

        {/* Max Streak */}
        {showMaxStreak && maxStreak !== undefined && maxStreak > currentStreak && (
          <div className="mt-3 text-xs text-gray-500">
            <span className="font-medium">Best:</span> {maxStreak} days
          </div>
        )}
      </div>

      {/* Achievement Indicators */}
      {currentStreak > 0 && (
        <div className="absolute -top-1 -right-1">
          {currentStreak >= 7 && (
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
              <span className="text-xs">7️⃣</span>
            </div>
          )}
          {currentStreak >= 30 && (
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-xs text-white">👑</span>
            </div>
          )}
        </div>
      )}

      {/* Progress Indicators */}
      {currentStreak > 0 && size !== 'sm' && (
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-1">Next milestone:</div>
          <div className="flex space-x-1">
            {[7, 14, 30, 60, 100].map((milestone) => (
              <div 
                key={milestone}
                className={`
                  flex-1 h-1 rounded-full
                  ${currentStreak >= milestone 
                    ? 'bg-orange-400' 
                    : 'bg-gray-200'
                  }
                `}
                title={`${milestone} day milestone ${currentStreak >= milestone ? '✓' : ''}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>7</span>
            <span>30</span>
            <span>100</span>
          </div>
        </div>
      )}

      {/* Motivational Quote */}
      {currentStreak === 0 && size === 'lg' && (
        <div className="mt-4 text-center text-xs text-gray-500 italic">
          "Success is the sum of small efforts repeated day in and day out."
        </div>
      )}
    </div>
  );
}

export default StreakCounter;
