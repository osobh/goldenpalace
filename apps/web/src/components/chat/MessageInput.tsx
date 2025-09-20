import { useState, useRef, useEffect, FormEvent, KeyboardEvent, ChangeEvent } from 'react';
import { Send, Smile, Paperclip, Bold, Italic, Code, Link, X } from 'lucide-react';
import './MessageInput.css';

interface MessageData {
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  attachments?: File[];
}

interface MessageInputProps {
  onSendMessage: (message: MessageData) => void;
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
  placeholder?: string;
  maxLength?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  showFormatting?: boolean;
}

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😠', '🎉', '🔥', '💯', '👏', '🙌', '✨'];

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled,
  placeholder = 'Type a message...',
  maxLength,
  maxFileSize,
  acceptedFileTypes,
  showFormatting = false,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        !target.closest('[aria-label="Add emoji"]')
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;

    if (maxLength && value.length > maxLength) {
      value = value.slice(0, maxLength);
    }

    setMessage(value);

    // Handle typing indicator
    if (value.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        onTyping(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(false);
      }, 3000);
    } else if (isTyping) {
      setIsTyping(false);
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachedFiles.length === 0) {
      return;
    }

    const messageData: MessageData = {
      content: trimmedMessage,
      type: attachedFiles.length > 0 ? 'FILE' : 'TEXT',
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
    };

    onSendMessage(messageData);

    // Reset state
    setMessage('');
    setAttachedFiles([]);
    setIsTyping(false);
    onTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Escape' && inputRef.current) {
      // Cancel any ongoing action
      setShowEmojiPicker(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newMessage = message.substring(0, start) + emoji + message.substring(end);

    setMessage(newMessage);
    setShowEmojiPicker(false);

    // Restore focus and position cursor after emoji
    setTimeout(() => {
      input.focus();
      const newPosition = start + emoji.length;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError(null);

    // Validate file size
    if (maxFileSize) {
      const oversizedFile = files.find(file => file.size > maxFileSize);
      if (oversizedFile) {
        setFileError(`File size exceeds ${formatFileSize(maxFileSize)} limit`);
        return;
      }
    }

    // Validate file type
    if (acceptedFileTypes && acceptedFileTypes.length > 0) {
      const invalidFile = files.find(file => {
        const fileType = file.type;
        const fileExtension = '.' + file.name.split('.').pop();

        return !acceptedFileTypes.some(type => {
          if (type.endsWith('/*')) {
            // Match MIME type category (e.g., image/*)
            const category = type.split('/')[0];
            return fileType.startsWith(category + '/');
          }
          return type === fileType || type === fileExtension;
        });
      });

      if (invalidFile) {
        setFileError('File type not supported');
        return;
      }
    }

    setAttachedFiles(files);

    // Update message type if files are attached
    if (files.length > 0 && !message.trim()) {
      // Auto-add a message if only file is being sent
      setMessage('');
    }
  };

  const removeAttachment = () => {
    setAttachedFiles([]);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const applyFormatting = (format: 'bold' | 'italic' | 'code' | 'link') => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = message.substring(start, end);

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'text'}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'text'}*`;
        break;
      case 'code':
        formattedText = `\`${selectedText || 'code'}\``;
        break;
      case 'link':
        formattedText = `[${selectedText || 'link text'}](url)`;
        break;
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end);
    setMessage(newMessage);

    // Restore focus and select the formatted text
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start, start + formattedText.length);
    }, 0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const shouldDisableSend = disabled || message.trim().length === 0;
  const charactersRemaining = maxLength ? maxLength - message.length : null;
  const showCharacterCount = maxLength && message.length > maxLength * 0.8;

  return (
    <form
      className="message-input-container"
      onSubmit={handleSubmit}
      aria-label="Send message"
    >
      {showFormatting && (
        <div className="formatting-toolbar">
          <button
            type="button"
            onClick={() => applyFormatting('bold')}
            className="formatting-button"
            aria-label="Bold"
            title="Bold"
            tabIndex={0}
            disabled={disabled}
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('italic')}
            className="formatting-button"
            aria-label="Italic"
            title="Italic"
            tabIndex={0}
            disabled={disabled}
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('code')}
            className="formatting-button"
            aria-label="Code"
            title="Code"
            tabIndex={0}
            disabled={disabled}
          >
            <Code size={16} />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('link')}
            className="formatting-button"
            aria-label="Link"
            title="Link"
            tabIndex={0}
            disabled={disabled}
          >
            <Link size={16} />
          </button>
        </div>
      )}

      {attachedFiles.length > 0 && (
        <div className="attachment-preview">
          {attachedFiles.map((file, index) => (
            <div key={index} className="attachment-item">
              <span className="attachment-name">{file.name}</span>
              <span className="attachment-type">{file.type}</span>
              <button
                type="button"
                onClick={removeAttachment}
                className="remove-attachment"
                aria-label="Remove attachment"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {fileError && (
        <div className="file-error" role="alert">
          {fileError}
        </div>
      )}

      <div className="message-input-wrapper">
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="message-input"
          aria-label="Message input"
          tabIndex={0}
          rows={1}
        />

        <div className="message-actions">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="action-button"
            aria-label="Attach file"
            title="Attach file"
            tabIndex={0}
            disabled={disabled}
          >
            <Paperclip size={20} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            multiple
            accept={acceptedFileTypes?.join(',')}
            aria-label="Select file to attach"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="action-button"
            aria-label="Add emoji"
            title="Add emoji"
            tabIndex={0}
            disabled={disabled}
          >
            <Smile size={20} />
          </button>

          <button
            type="submit"
            className="send-button"
            aria-label="Send message"
            title="Send message"
            tabIndex={0}
            disabled={shouldDisableSend}
          >
            <Send size={20} />
          </button>
        </div>

        {showCharacterCount && charactersRemaining !== null && (
          <div className={`character-count ${charactersRemaining < 0 ? 'exceeded' : ''}`}>
            {message.length}/{maxLength}
          </div>
        )}

        {isTyping && (
          <div className="typing-status" aria-label="Typing in progress">
            <span className="sr-only">Typing in progress</span>
          </div>
        )}
      </div>

      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="emoji-picker"
          role="dialog"
          aria-label="Emoji picker"
        >
          <div className="emoji-section">
            <h4>Frequently Used</h4>
            <div className="emoji-grid">
              {DEFAULT_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="emoji-button"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="emoji-section">
            <h4>Smileys & People</h4>
            <div className="emoji-grid">
              {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🙂', '🙃', '😉'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="emoji-button"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="emoji-section">
            <h4>Animals & Nature</h4>
            <div className="emoji-grid">
              {['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="emoji-button"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}