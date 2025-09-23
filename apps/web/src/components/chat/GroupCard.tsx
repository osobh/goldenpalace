import { Globe, Lock, Shield, Hash, Users } from 'lucide-react';
import type { Group } from '../../services/chat.service';

interface GroupCardProps {
  group: Group;
  isSelected?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function GroupCard({ group, isSelected = false, unreadCount = 0, onClick }: GroupCardProps) {
  const getGroupIcon = (groupType: string) => {
    switch (groupType) {
      case 'PUBLIC':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'PRIVATE':
        return <Lock className="h-4 w-4 text-gray-600" />;
      case 'INVITE_ONLY':
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <Hash className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/50 ${
        isSelected ? 'bg-muted' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          {getGroupIcon(group.groupType)}
          <span className="font-medium text-foreground truncate">
            {group.name}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {group.memberCount && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="h-3 w-3 mr-1" />
              {group.memberCount}
            </div>
          )}
          {unreadCount > 0 && (
            <div className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>
      {group.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {group.description}
        </p>
      )}
    </button>
  );
}