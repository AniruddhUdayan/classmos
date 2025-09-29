import React from 'react';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'streak' | 'accuracy' | 'completion' | 'achievement';
}

export interface BadgeCardProps {
  badge: BadgeDefinition;
  earned?: boolean;
  earnedAt?: Date | string;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export function BadgeCard({ 
  badge, 
  earned = false, 
  earnedAt, 
  size = 'md', 
  showDescription = true,
  className = '' 
}: BadgeCardProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl'
  };

  const containerSizeClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'streak':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'accuracy':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'completion':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'achievement':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div 
      className={`
        relative rounded-lg border-2 transition-all duration-200 hover:scale-105
        ${earned 
          ? `${getTypeColor(badge.type)} shadow-md` 
          : 'bg-gray-50 border-gray-200 text-gray-400'
        }
        ${containerSizeClasses[size]}
        ${className}
      `}
      title={`${badge.name}: ${badge.description}${earnedAt ? ` (Earned: ${new Date(earnedAt).toLocaleDateString()})` : ''}`}
    >
      {/* Badge Icon */}
      <div className={`
        flex items-center justify-center rounded-full 
        ${sizeClasses[size]}
        ${earned 
          ? 'bg-white shadow-sm' 
          : 'bg-gray-200'
        }
        mx-auto mb-2
      `}>
        <span className={earned ? '' : 'grayscale opacity-50'}>
          {badge.icon}
        </span>
      </div>

      {/* Badge Name */}
      <div className="text-center">
        <h4 className={`
          font-semibold 
          ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}
          ${earned ? '' : 'text-gray-500'}
        `}>
          {badge.name}
        </h4>

        {/* Badge Description */}
        {showDescription && (
          <p className={`
            mt-1 
            ${size === 'sm' ? 'text-xs' : 'text-xs'}
            ${earned ? 'text-current opacity-75' : 'text-gray-400'}
            line-clamp-2
          `}>
            {badge.description}
          </p>
        )}

        {/* Earned Date */}
        {earned && earnedAt && size !== 'sm' && (
          <p className="text-xs opacity-60 mt-1">
            {new Date(earnedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Earned Indicator */}
      {earned && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}

      {/* Badge Type Label */}
      <div className={`
        absolute top-1 left-1 px-1 py-0.5 rounded text-xs font-medium capitalize
        ${earned ? 'bg-white bg-opacity-75' : 'bg-gray-300 text-gray-600'}
      `}>
        {badge.type}
      </div>
    </div>
  );
}

export default BadgeCard;
