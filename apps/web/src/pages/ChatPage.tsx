import { useEffect, useState } from 'react';
import { Plus, Hash, Globe, Lock, Shield, Users, Send, Search } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import type { Group } from '../services/chat.service';

export function ChatPage() {
  const {
    groups,
    selectedGroup,
    messages,
    unreadCounts,
    isLoading,
    error,
    selectedGroupId,
    fetchGroups,
    selectGroup,
    sendMessage,
    fetchMessages,
  } = useChatStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedGroupMessages = selectedGroupId ? messages[selectedGroupId] || [] : [];

  const handleGroupSelect = (group: Group) => {
    selectGroup(group.id);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedGroupId) return;

    try {
      await sendMessage(selectedGroupId, {
        content: messageText.trim(),
        messageType: 'TEXT',
      });
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Chat</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        {/* Groups Sidebar */}
        <div className="bg-card border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-medium text-foreground mb-3">Groups</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {searchTerm ? 'No groups found' : 'No groups joined yet'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Create your first group
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupSelect(group)}
                    className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                      selectedGroupId === group.id ? 'bg-muted' : ''
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
                        {unreadCounts[group.id] > 0 && (
                          <div className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {unreadCounts[group.id]}
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 bg-card border border-border rounded-lg flex flex-col">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center space-x-3">
                  {getGroupIcon(selectedGroup.groupType)}
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      {selectedGroup.name}
                    </h3>
                    {selectedGroup.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedGroup.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto">
                {selectedGroupMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No messages yet</p>
                      <p className="text-sm text-muted-foreground">
                        Start the conversation in {selectedGroup.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedGroupMessages.map((message) => (
                      <div key={message.id} className="flex space-x-3">
                        {message.user.avatarUrl ? (
                          <img
                            src={message.user.avatarUrl}
                            alt={message.user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {message.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-foreground">
                              {message.user.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-foreground mt-1">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder={`Message ${selectedGroup.name}...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* No Group Selected */}
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">
                  Select a group to start chatting
                </h3>
              </div>

              <div className="flex-1 p-6 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hash className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Join or create a group to start messaging with other traders
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-border">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Select a group to start messaging..."
                    className="flex-1 px-3 py-2 border border-border bg-background rounded-lg disabled:opacity-50"
                    disabled
                  />
                  <button
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                    disabled
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}