import { useEffect, useState, useRef, useMemo } from 'react';
import './TypingIndicator.css';

interface TypingIndicatorProps {
  typingUsers: string[];
  customText?: string;
  maxDisplayedUsers?: number;
  className?: string;
  locale?: string;
  direction?: 'ltr' | 'rtl';
}

export function TypingIndicator({
  typingUsers,
  customText = 'is typing...',
  maxDisplayedUsers = 3,
  className = '',
  locale,
  direction = 'ltr',
}: TypingIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [displayedUsers, setDisplayedUsers] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minimumDisplayTimeRef = useRef<NodeJS.Timeout | null>(null);
  const previousUsersRef = useRef<string[]>([]);
  const isShowingRef = useRef(false);

  // Deduplicate and filter/replace invalid usernames
  const uniqueUsers = useMemo(() => {
    const processed = typingUsers.map(user => {
      if (user === undefined || user === null || user === '') {
        return 'Someone';
      }
      return user;
    });
    return Array.from(new Set(processed));
  }, [typingUsers]);

  useEffect(() => {
    // Clear previous timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Handle rapid changes with a small debounce
    const updateTypingState = () => {
      if (uniqueUsers.length > 0) {
        // Someone is typing - show immediately
        setDisplayedUsers(uniqueUsers);
        setIsVisible(true);
        setIsFading(false);
        isShowingRef.current = true;
        previousUsersRef.current = uniqueUsers;

        // Clear minimum display time if it exists
        if (minimumDisplayTimeRef.current) {
          clearTimeout(minimumDisplayTimeRef.current);
          minimumDisplayTimeRef.current = null;
        }
      } else if (isShowingRef.current && uniqueUsers.length === 0) {
        // No one is typing anymore - start fade out animation
        setIsFading(true);

        // Keep showing for minimum duration
        if (!minimumDisplayTimeRef.current) {
          minimumDisplayTimeRef.current = setTimeout(() => {
            setIsVisible(false);
            setIsFading(false);
            setDisplayedUsers([]);
            isShowingRef.current = false;
            previousUsersRef.current = [];
            minimumDisplayTimeRef.current = null;
          }, 1000);
        }
      }
    };

    // Apply small debounce only if rapidly changing between non-empty states
    if (uniqueUsers.length > 0 && previousUsersRef.current.length > 0) {
      timeoutRef.current = setTimeout(updateTypingState, 100);
    } else {
      updateTypingState();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (minimumDisplayTimeRef.current) {
        clearTimeout(minimumDisplayTimeRef.current);
      }
    };
  }, [uniqueUsers]);

  const formatTypingText = () => {
    if (displayedUsers.length === 0) {
      return '';
    }

    if (displayedUsers.length === 1) {
      return `${displayedUsers[0]} ${customText}`;
    }

    // For multiple users, use comma-separated format
    return `${displayedUsers.join(', ')} are ${customText.replace('is ', '')}`;
  };

  const typingText = formatTypingText();
  const animationClass = isFading ? 'fade-out' : (isVisible ? 'fade-in' : '');

  if (!isVisible && !isFading && displayedUsers.length === 0) {
    return (
      <div
        data-testid="typing-indicator-container"
        aria-hidden="true"
        style={{ display: 'none' }}
      />
    );
  }

  return (
    <div
      data-testid="typing-indicator-container"
      aria-hidden={!isVisible && !isFading}
    >
      {(isVisible || isFading) && (
        <div
          data-testid="typing-indicator"
          className={`typing-indicator ${animationClass} ${className}`}
          role="status"
          aria-live="polite"
          aria-label={displayedUsers.join(', ') + ' is typing'}
          dir={direction}
        >
          <span className="typing-text">{typingText}</span>
          {(isVisible || isFading) && (
            <span className="dots-animation" aria-label="Typing animation">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}