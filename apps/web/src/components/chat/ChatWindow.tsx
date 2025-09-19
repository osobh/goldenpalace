import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { websocketService } from '../../services/websocket.service';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { GroupMembers } from './GroupMembers';
import { TypingIndicator } from './TypingIndicator';
import type { ChatMessage, GroupMember } from '../../services/websocket.service';
import './ChatWindow.css';

interface ChatWindowProps {
  groupId: string;
  groupName: string;
  messages: ChatMessage[];
  members: GroupMember[];
  isLoading: boolean;
  typingUsers?: string[];
  error?: string;
  onRetry?: () => void;
  onMemberAction?: (action: any) => void;
  showFormatting?: boolean;
  maxMessageLength?: number;
}

export function ChatWindow({
  groupId,
  groupName,
  messages,
  members,
  isLoading,
  typingUsers = [],
  error,
  onRetry,
  onMemberAction,
  showFormatting = false,
  maxMessageLength = 1000,
}: ChatWindowProps) {
  const { user } = useAuthStore();
  const [showMembers, setShowMembers] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastGroupIdRef = useRef<string>();

  const connectionState = websocketService.getConnectionState();
  const isConnected = websocketService.isConnected();

  // Join/leave group on mount/unmount and when groupId changes
  useEffect(() => {
    if (!groupId) return;

    // Leave previous group if different
    if (lastGroupIdRef.current && lastGroupIdRef.current !== groupId) {
      websocketService.leaveGroup(lastGroupIdRef.current);
    }

    // Join new group
    websocketService.joinGroup(groupId);
    lastGroupIdRef.current = groupId;

    return () => {
      if (lastGroupIdRef.current) {
        websocketService.leaveGroup(lastGroupIdRef.current);
      }
    };
  }, [groupId]);

  // Handle typing indicator
  const handleTyping = useCallback((typing: boolean) => {
    if (typing && !isTyping && isConnected) {
      setIsTyping(true);
      websocketService.sendTyping({ groupId, isTyping: true });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        websocketService.sendTyping({ groupId, isTyping: false });
      }, 3000);
    } else if (!typing && isTyping) {
      setIsTyping(false);
      websocketService.sendTyping({ groupId, isTyping: false });

      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [groupId, isConnected, isTyping]);

  // Handle sending messages
  const handleSendMessage = useCallback(
    (content: string | { content: string; attachments?: File[] }, attachments?: File[]) => {
      // Handle both string and object input
      let messageContent: string;
      let messageAttachments: File[] | undefined;

      if (typeof content === 'string') {
        messageContent = content;
        messageAttachments = attachments;
      } else {
        messageContent = content.content;
        messageAttachments = content.attachments;
      }

      if (!messageContent?.trim() || !isConnected) return;

      websocketService.sendMessage({
        groupId,
        content: messageContent.trim(),
        type: 'TEXT',
      });

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        websocketService.sendTyping({ groupId, isTyping: false });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    },
    [groupId, isConnected, isTyping]
  );

  const onlineCount = members.filter(m => m.isOnline).length;

  // Get connection status text
  const getConnectionStatus = () => {
    if (connectionState.connected) {
      return { text: 'Connected', icon: Wifi, color: 'success' };
    }
    if (connectionState.isReconnecting) {
      return {
        text: `Reconnecting... (attempt ${connectionState.reconnectAttempts})`,
        icon: WifiOff,
        color: 'warning',
      };
    }
    return { text: 'Disconnected', icon: WifiOff, color: 'error' };
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

  if (isLoading) {
    return (
      <div className="chat-window-loading">
        <div className="loading-spinner" aria-label="Loading chat messages" />
        <p>Loading chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-window-error">
        <AlertCircle size={48} />
        <p>{error}</p>
        {onRetry && (
          <button onClick={onRetry} aria-label="Retry connection" className="retry-button">
            <RefreshCw size={16} />
            Retry connection
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="chat-window" role="region" aria-label="Chat window">
      <div className="chat-header">
        <div className="chat-header-info">
          <h2>{groupName}</h2>
          <div className="chat-header-meta">
            <span className="member-count">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            <span className="online-count">{onlineCount} online</span>
          </div>
        </div>

        <div className="chat-header-actions">
          <div
            className={`connection-status ${connectionStatus.color}`}
            aria-label={`Connection status: ${connectionState.isReconnecting ? 'Reconnecting' : connectionStatus.text}`}
          >
            <ConnectionIcon size={16} />
            <span>{connectionStatus.text}</span>
          </div>

          <button
            onClick={() => setShowMembers(!showMembers)}
            aria-label="Toggle member list"
            aria-expanded={showMembers}
            className="toggle-members-button"
            tabIndex={0}
          >
            <Users size={20} />
          </button>
        </div>
      </div>

      <div className="chat-body">
        <div className="chat-messages-container">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <h3>No messages yet</h3>
              <p>Start the conversation by sending a message.</p>
            </div>
          ) : (
            <MessageList messages={messages} loadingPortfolioId={undefined} />
          )}

          {typingUsers.length > 0 && (
            <div className="typing-indicator-container">
              <TypingIndicator typingUsers={typingUsers} />
            </div>
          )}
        </div>

        {showMembers && (
          <GroupMembers
            members={members}
            groupId={groupId}
            onMemberAction={onMemberAction || (() => {})}
          />
        )}
      </div>

      <div className="chat-input-container">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={!isConnected}
          placeholder="Type a message..."
          maxLength={maxMessageLength}
          showFormatting={showFormatting}
        />
      </div>
    </div>
  );
}