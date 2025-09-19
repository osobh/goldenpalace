import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Edit2, Trash2, MoreVertical, Check, X, Heart, ThumbsUp, Laugh, Frown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { websocketService } from '../../services/websocket.service';
import type { ChatMessage } from '../../services/websocket.service';
import './MessageList.css';

interface MessageListProps {
  messages: ChatMessage[];
  loadingPortfolioId?: string;
}

const REACTION_EMOJIS = {
  '👍': ThumbsUp,
  '❤️': Heart,
  '😂': Laugh,
  '😮': Frown,
  '😢': Frown,
  '😠': Frown,
};

export function MessageList({ messages, loadingPortfolioId }: MessageListProps) {
  const { user } = useAuthStore();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showActionsForMessage, setShowActionsForMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [processedMessages, setProcessedMessages] = useState<ChatMessage[]>([]);

  const messageListRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group consecutive messages from the same user
  const groupedMessages = useMemo(() => {
    const groups: Array<{ user: string; userId: string; messages: ChatMessage[] }> = [];

    messages.forEach((message) => {
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.userId === message.userId && message.type !== 'SYSTEM') {
        // Check if messages are within 5 minutes of each other
        const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];
        const timeDiff = new Date(message.createdAt).getTime() - new Date(lastMessage.createdAt).getTime();

        if (timeDiff < 5 * 60 * 1000) {
          lastGroup.messages.push(message);
        } else {
          groups.push({
            user: message.username,
            userId: message.userId,
            messages: [message],
          });
        }
      } else {
        groups.push({
          user: message.username,
          userId: message.userId,
          messages: [message],
        });
      }
    });

    return groups;
  }, [messages]);

  // Virtual scrolling for large message lists
  useEffect(() => {
    if (messages.length > 100) {
      // Only render visible messages for performance (limit to 50 for virtual scrolling)
      const visibleMessages = messages.slice(-50);
      setProcessedMessages(visibleMessages);
    } else {
      setProcessedMessages(messages);
    }
  }, [messages]);

  // Set up Intersection Observer for read receipts
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId && user) {
              const message = messages.find(m => m.id === messageId);
              if (message && !message.readBy.some(r => r.userId === user.id)) {
                websocketService.markMessageAsRead(messageId);
              }
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [messages, user]);

  // Observe message elements for read receipts
  useEffect(() => {
    messageRefs.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      messageRefs.current.forEach((element) => {
        observerRef.current?.unobserve(element);
      });
    };
  }, [processedMessages]);

  // Auto-scroll behavior
  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.userId === user?.id) {
      // Auto-scroll for own messages
      container.scrollTop = container.scrollHeight - container.clientHeight;
    } else {
      // Maintain scroll position for others' messages
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight - container.clientHeight;
      }
    }
  }, [messages, user]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const shouldShowDateSeparator = (message: ChatMessage, index: number) => {
    if (index === 0) return true;

    const previousMessage = processedMessages[index - 1];
    const currentDate = new Date(message.createdAt).toDateString();
    const previousDate = new Date(previousMessage.createdAt).toDateString();

    return currentDate !== previousDate;
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditText(content);
  };

  const saveEdit = () => {
    if (editingMessageId && editText.trim()) {
      websocketService.editMessage(editingMessageId, editText.trim());
      setEditingMessageId(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Delete this message?')) {
      websocketService.deleteMessage(messageId);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    websocketService.addReaction({ messageId, emoji });
    setShowEmojiPicker(null);
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    websocketService.removeReaction({ messageId, emoji });
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const userReaction = message.reactions.find(r => r.userId === user?.id && r.emoji === emoji);
      if (userReaction) {
        handleRemoveReaction(messageId, emoji);
      } else {
        handleAddReaction(messageId, emoji);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <h3>No messages yet</h3>
        <p>Messages will appear here when someone starts chatting.</p>
      </div>
    );
  }

  return (
    <div
      ref={messageListRef}
      className="message-list"
      role="log"
      aria-label="Chat messages"
    >
      {processedMessages.map((message, index) => {
        const isOwnMessage = message.userId === user?.id;
        const isSystemMessage = message.type === 'SYSTEM';
        const showDateSep = shouldShowDateSeparator(message, index);

        // Check if this message should show username (first in group or after different user)
        const prevMessage = index > 0 ? processedMessages[index - 1] : null;
        const showUsername = !prevMessage ||
                           prevMessage.userId !== message.userId ||
                           prevMessage.type === 'SYSTEM' ||
                           message.type === 'SYSTEM' ||
                           // Show username if messages are more than 5 minutes apart
                           (prevMessage && new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 5 * 60 * 1000);

        return (
          <div key={message.id}>
            {showDateSep && (
              <div className="date-separator">
                <span>{formatDate(message.createdAt)}</span>
              </div>
            )}

            <div
              ref={(el) => {
                if (el) messageRefs.current.set(message.id, el);
                if (index === processedMessages.length - 1) {
                  lastMessageRef.current = el;
                }
              }}
              data-message-id={message.id}
              className={`message-item ${isOwnMessage ? 'own-message' : ''} ${isSystemMessage ? 'system-message' : ''} ${!showUsername && !isSystemMessage ? 'grouped' : ''}`}
              role="listitem"
              onMouseEnter={() => !isSystemMessage && setShowActionsForMessage(message.id)}
              onMouseLeave={() => setShowActionsForMessage(null)}
            >
              {isSystemMessage ? (
                <div className="system-message-content" aria-label="System message">
                  <span>{message.content}</span>
                </div>
              ) : (
                <>
                  {showUsername && (
                    <div className="message-header">
                      <span className="message-username">{message.username}</span>
                      {isOwnMessage && message.id === showActionsForMessage && (
                        <div className="message-actions">
                          <button
                            onClick={() => handleEditMessage(message.id, message.content)}
                            aria-label="Edit message"
                            className="action-button"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            aria-label="Delete message"
                            className="action-button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                      {message.editedAt && (
                        <span className="edited-indicator" aria-label="Message was edited">(edited)</span>
                      )}
                    </div>
                  )}

                  <div className="message-content">
                    {!showUsername && isOwnMessage && message.id === showActionsForMessage && (
                      <div className="message-actions inline">
                        <button
                          onClick={() => handleEditMessage(message.id, message.content)}
                          aria-label="Edit message"
                          className="action-button"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          aria-label="Delete message"
                          className="action-button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}

                    {editingMessageId === message.id ? (
                      <div className="edit-message-form">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                        />
                        <button onClick={saveEdit} aria-label="Save edit">
                          <Check size={16} />
                        </button>
                        <button onClick={cancelEdit} aria-label="Cancel edit">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p>
                          {message.content}
                          {!showUsername && (
                            <>
                              <span className="inline-time">{formatTime(message.createdAt)}</span>
                              {message.editedAt && (
                                <span className="inline-edited" aria-label="Message was edited">(edited)</span>
                              )}
                            </>
                          )}
                        </p>

                        {message.attachments && message.attachments.length > 0 && (
                          <div className="message-attachments">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id} className="attachment">
                                {attachment.mimeType.startsWith('image/') ? (
                                  <img
                                    src={attachment.url}
                                    alt={attachment.filename}
                                    role="img"
                                  />
                                ) : (
                                  <div className="file-attachment">
                                    <span>{attachment.filename}</span>
                                    <span>{formatFileSize(attachment.size)}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="message-reactions">
                          {message.reactions.map((reaction) => (
                            <button
                              key={`${reaction.id}-${reaction.emoji}`}
                              onClick={() => handleReactionClick(message.id, reaction.emoji)}
                              className={`reaction-button ${reaction.userId === user?.id ? 'own-reaction' : ''}`}
                              aria-label={`${reaction.emoji} reaction by ${reaction.username}`}
                              role="button"
                            >
                              <span>{reaction.emoji}</span>
                              <span className="reaction-count">
                                {message.reactions.filter(r => r.emoji === reaction.emoji).length}
                              </span>
                            </button>
                          ))}

                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                            className="add-reaction-button"
                            aria-label="Add reaction"
                          >
                            +
                          </button>

                          {showEmojiPicker === message.id && (
                            <div className="reaction-picker" role="dialog" aria-label="Select emoji">
                              {['👍', '❤️', '😂', '😮', '😢', '😠'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(message.id, emoji)}
                                  aria-label={emoji}
                                  role="button"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {message.readBy.length > 0 && (
                          <div className="read-receipts">
                            {message.readBy.map(receipt => (
                              <span
                                key={receipt.userId}
                                aria-label={`Read by ${receipt.username}`}
                                title={`Read by ${receipt.username}`}
                              >
                                ✓
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Screen reader announcement for new messages */}
                  {index === processedMessages.length - 1 && !isOwnMessage && (
                    <div
                      className="sr-only"
                      role="status"
                      aria-live="polite"
                      aria-label={`New message from ${message.username}: ${message.content}`}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}