import { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, MoreVertical, Shield, Crown, User, Circle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import type { GroupMember } from '../../services/websocket.service';
import './GroupMembers.css';

interface GroupMembersProps {
  members: GroupMember[];
  onMemberAction: (action: any) => void;
  groupId: string;
}

type FilterStatus = 'all' | 'online' | 'offline';
type FilterRole = 'all' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
type SortBy = 'name' | 'role' | 'joinDate' | 'status';

export function GroupMembers({ members, onMemberAction, groupId }: GroupMembersProps) {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [showMemberActions, setShowMemberActions] = useState<string | null>(null);
  const [expandedMemberActions, setExpandedMemberActions] = useState<string | null>(null);
  const [animatingMembers, setAnimatingMembers] = useState<Set<string>>(new Set());
  const [exitingMembers, setExitingMembers] = useState<Map<string, GroupMember>>(new Map());
  const [previousMemberIds, setPreviousMemberIds] = useState<Set<string>>(() => new Set(members.map(m => m.id)));
  const [previousMembers, setPreviousMembers] = useState<GroupMember[]>(members);

  const currentUserMember = members.find(m => m.userId === user?.id);
  const isAdmin = currentUserMember?.role === 'ADMIN';
  const isModerator = currentUserMember?.role === 'MODERATOR';
  const canManageMembers = isAdmin || isModerator;

  // Track member changes for animations
  useEffect(() => {
    const currentIds = new Set(members.map(m => m.id));
    const newMembers = members.filter(m => !previousMemberIds.has(m.id));
    const removedMemberIds = Array.from(previousMemberIds).filter(id => !currentIds.has(id));

    if (newMembers.length > 0) {
      setAnimatingMembers(new Set(newMembers.map(m => m.id)));
      setTimeout(() => {
        setAnimatingMembers(new Set());
      }, 500);
    }

    if (removedMemberIds.length > 0) {
      const removedMembersMap = new Map();
      removedMemberIds.forEach(id => {
        const removedMember = previousMembers.find(m => m.id === id);
        if (removedMember) {
          removedMembersMap.set(id, removedMember);
        }
      });
      setExitingMembers(removedMembersMap);
      setTimeout(() => {
        setExitingMembers(new Map());
      }, 500);
    }

    setPreviousMemberIds(currentIds);
    setPreviousMembers(members);
  }, [members]); // Fixed infinite loop - removed previousMemberIds and previousMembers from dependencies

  // Filter and sort members
  const processedMembers = useMemo(() => {
    let filtered = members;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus === 'online') {
      filtered = filtered.filter(m => m.isOnline);
    } else if (filterStatus === 'offline') {
      filtered = filtered.filter(m => !m.isOnline);
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(m => m.role === filterRole);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.username.localeCompare(b.username);
        case 'role':
          const roleOrder = { ADMIN: 0, MODERATOR: 1, MEMBER: 2 };
          return roleOrder[a.role] - roleOrder[b.role];
        case 'joinDate':
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        case 'status':
          return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [members, searchTerm, filterStatus, filterRole, sortBy]);

  const onlineCount = members.filter(m => m.isOnline).length;

  const formatLastSeen = (lastSeen: string) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const formatJoinDate = (joinDate: string) => {
    return new Date(joinDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown size={14} />;
      case 'MODERATOR':
        return <Shield size={14} />;
      default:
        return <User size={14} />;
    }
  };

  const handlePromote = (member: GroupMember) => {
    const newRole = member.role === 'MEMBER' ? 'MODERATOR' : 'ADMIN';
    onMemberAction({
      action: 'promote',
      memberId: member.id,
      newRole,
    });
  };

  const handleDemote = (member: GroupMember) => {
    const newRole = member.role === 'ADMIN' ? 'MODERATOR' : 'MEMBER';
    onMemberAction({
      action: 'demote',
      memberId: member.id,
      newRole,
    });
  };

  const handleRemove = (member: GroupMember) => {
    setMemberToRemove(member);
  };

  const confirmRemove = () => {
    if (memberToRemove) {
      onMemberAction({
        action: 'remove',
        memberId: memberToRemove.id,
      });
      setMemberToRemove(null);
    }
  };

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      onMemberAction({
        action: 'invite',
        email: inviteEmail.trim(),
      });
      setInviteEmail('');
      setShowInviteDialog(false);
    }
  };

  if (members.length === 0) {
    return (
      <div className="members-empty">
        <h3>No members</h3>
        <p>This group has no members yet.</p>
      </div>
    );
  }

  return (
    <div className="group-members" role="region" aria-label="Group members" data-testid="group-members">
      <div className="members-header">
        <h3>{members.length} member{members.length !== 1 ? 's' : ''}</h3>
        <span className="online-count">{onlineCount} online</span>
        {canManageMembers && (
          <button
            onClick={() => setShowInviteDialog(true)}
            className="invite-button"
            aria-label="Invite members"
          >
            <UserPlus size={16} />
          </button>
        )}
      </div>

      <div className="members-controls">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search members..."
          className="search-input"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as FilterRole)}
          aria-label="Filter by role"
        >
          <option value="all">All Roles</option>
          <option value="ADMIN">Admins</option>
          <option value="MODERATOR">Moderators</option>
          <option value="MEMBER">Members</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label="Sort members by"
        >
          <option value="name">Name</option>
          <option value="role">Role</option>
          <option value="joinDate">Join Date</option>
          <option value="status">Status</option>
        </select>
      </div>

      <ul className="members-list" role="list" aria-label="Member list">
        {[...processedMembers, ...Array.from(exitingMembers.values())].map((member) => {
          const isCurrentUser = member.userId === user?.id;
          const isEntering = animatingMembers.has(member.id);
          const isExiting = exitingMembers.has(member.id);

          return (
            <li
              key={member.id}
              data-member-id={member.id}
              className={`member-item ${isCurrentUser ? 'current-user' : ''} ${isEntering ? 'member-entering' : ''} ${isExiting ? 'member-exiting' : ''}`}
              role="listitem"
              tabIndex={0}
              onClick={() => setSelectedMember(member)}
              onMouseEnter={() => canManageMembers && !isCurrentUser && setShowMemberActions(member.id)}
              onMouseLeave={() => {
                setShowMemberActions(null);
                setExpandedMemberActions(null);
              }}
            >
              <div className="member-status">
                <Circle
                  size={8}
                  className={member.isOnline ? 'online-indicator' : 'offline-indicator'}
                  aria-label={`${member.username} is ${member.isOnline ? 'online' : 'offline'}`}
                />
              </div>

              <div className="member-info">
                <div className="member-name">
                  <span>{member.username}</span>
                  {isCurrentUser && <span className="you-badge">(You)</span>}
                </div>
                <div className="member-role">
                  {getRoleIcon(member.role)}
                  <span>{member.role.charAt(0) + member.role.slice(1).toLowerCase()}</span>
                </div>
                <div className="member-meta">
                  <span>Joined {formatJoinDate(member.joinedAt)}</span>
                  {!member.isOnline && (
                    <span>{formatLastSeen(member.lastSeen)}</span>
                  )}
                </div>
              </div>

              {canManageMembers && !isCurrentUser && showMemberActions === member.id && (
                <div className="member-actions">
                  <button
                    className="actions-button"
                    aria-label="Member actions"
                    aria-haspopup="menu"
                    aria-expanded={expandedMemberActions === member.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedMemberActions(expandedMemberActions === member.id ? null : member.id);
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {expandedMemberActions === member.id && (
                    <div className="actions-menu" role="menu">
                      {member.role === 'MEMBER' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromote(member);
                          }}
                          role="menuitem"
                        >
                          Promote to Moderator
                        </button>
                      )}
                      {member.role === 'MODERATOR' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromote(member);
                            }}
                            role="menuitem"
                          >
                            Promote to Admin
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDemote(member);
                            }}
                            role="menuitem"
                          >
                            Demote to Member
                          </button>
                        </>
                      )}
                      {member.role === 'ADMIN' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDemote(member);
                          }}
                          role="menuitem"
                        >
                          Demote to Moderator
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(member);
                        }}
                        role="menuitem"
                        className="remove-button"
                      >
                        Remove from group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Member count update announcement for screen readers */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-label={`Member count updated: ${members.length} members, ${onlineCount} online`}
      />

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="invite-dialog" role="dialog" aria-label="Invite members">
          <div className="dialog-content">
            <h3>Invite Members</h3>
            <input
              type="text"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter username or email"
              className="invite-input"
            />
            <div className="dialog-actions">
              <button onClick={handleInvite} className="primary-button">
                Send invite
              </button>
              <button onClick={() => setShowInviteDialog(false)} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Dialog */}
      {selectedMember && (
        <div className="member-profile" role="dialog" aria-label="Member profile">
          <div className="profile-content">
            <h3>{selectedMember.username}</h3>
            <p>Member since {formatJoinDate(selectedMember.joinedAt)}</p>
            {selectedMember.permissions && selectedMember.permissions.length > 0 && (
              <div className="permissions">
                <h4>Permissions</h4>
                {selectedMember.permissions.map(permission => (
                  <span key={permission}>
                    {permission.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedMember(null)} aria-label="Close profile">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Remove member confirmation dialog */}
      {memberToRemove && (
        <div className="member-remove-dialog" role="dialog" aria-label="Confirm member removal">
          <div className="dialog-content">
            <h3>Remove {memberToRemove.username}?</h3>
            <p>Are you sure you want to remove this member from the group?</p>
            <div className="dialog-actions">
              <button onClick={confirmRemove} aria-label="Remove member">
                Remove member
              </button>
              <button onClick={() => setMemberToRemove(null)} aria-label="Cancel removal">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}