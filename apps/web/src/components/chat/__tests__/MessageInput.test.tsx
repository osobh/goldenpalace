import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MessageInput } from '../MessageInput';

describe('MessageInput', () => {
  const mockOnSendMessage = vi.fn();
  const mockOnTyping = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render input field and send button', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Enter your message here..."
        />
      );

      expect(screen.getByPlaceholderText('Enter your message here...')).toBeInTheDocument();
    });

    it('should show emoji picker button', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      expect(screen.getByRole('button', { name: 'Add emoji' })).toBeInTheDocument();
    });

    it('should show attachment button', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      expect(screen.getByRole('button', { name: 'Attach file' })).toBeInTheDocument();
    });

    it('should disable all inputs when disabled prop is true', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={true}
          placeholder="Type a message..."
        />
      );

      expect(screen.getByPlaceholderText('Type a message...')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Add emoji' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Attach file' })).toBeDisabled();
    });
  });

  describe('message sending', () => {
    it('should send message when send button is clicked', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: 'Hello world!' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith({
          content: 'Hello world!',
          type: 'TEXT',
        });
      });

      expect(input).toHaveValue('');
    });

    it('should send message when Enter key is pressed', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'Hello world!' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith({
          content: 'Hello world!',
          type: 'TEXT',
        });
      });

      expect(input).toHaveValue('');
    });

    it('should not send message when Shift+Enter is pressed', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'Line 1' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

      expect(mockOnSendMessage).not.toHaveBeenCalled();
      expect(input).toHaveValue('Line 1');
    });

    it('should not send empty messages', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      fireEvent.click(sendButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should not send messages with only whitespace', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: '   \n\t  ' } });
      fireEvent.click(sendButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should trim whitespace from messages', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: '  Hello world!  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith({
          content: 'Hello world!',
          type: 'TEXT',
        });
      });
    });
  });

  describe('typing indicators', () => {
    it('should call onTyping when user starts typing', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'H' } });

      await waitFor(() => {
        expect(mockOnTyping).toHaveBeenCalledWith(true);
      });
    });

    it('should stop typing indicator after delay', () => {
      vi.useFakeTimers();

      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      act(() => {
        fireEvent.change(input, { target: { value: 'Hello' } });
      });

      expect(mockOnTyping).toHaveBeenCalledWith(true);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnTyping).toHaveBeenCalledWith(false);

      vi.useRealTimers();
    });

    it('should stop typing indicator when message is sent', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      act(() => {
        fireEvent.change(input, { target: { value: 'Hello' } });
      });

      expect(mockOnTyping).toHaveBeenCalledWith(true);

      act(() => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(mockOnTyping).toHaveBeenLastCalledWith(false);
    });

    it('should not send typing indicator when input is empty', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnTyping).not.toHaveBeenCalled();
    });
  });

  describe('emoji picker', () => {
    it('should open emoji picker when emoji button is clicked', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const emojiButton = screen.getByRole('button', { name: 'Add emoji' });
      fireEvent.click(emojiButton);

      expect(screen.getByRole('dialog', { name: 'Emoji picker' })).toBeInTheDocument();
    });

    it('should close emoji picker when clicked outside', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const emojiButton = screen.getByRole('button', { name: 'Add emoji' });
      fireEvent.click(emojiButton);

      expect(screen.getByRole('dialog', { name: 'Emoji picker' })).toBeInTheDocument();

      // Use mousedown instead of click to match the event listener
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'Emoji picker' })).not.toBeInTheDocument();
      });
    });

    it('should insert emoji at cursor position', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const emojiButton = screen.getByRole('button', { name: 'Add emoji' });

      fireEvent.change(input, { target: { value: 'Hello world!' } });
      input.setSelectionRange(5, 5); // Position cursor after "Hello"

      fireEvent.click(emojiButton);

      const smileyEmoji = screen.getByRole('button', { name: '😊' });
      fireEvent.click(smileyEmoji);

      expect(input).toHaveValue('Hello😊 world!');
    });

    it('should append emoji when no cursor position', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const emojiButton = screen.getByRole('button', { name: 'Add emoji' });

      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.click(emojiButton);

      const heartEmoji = screen.getByRole('button', { name: '❤️' });
      fireEvent.click(heartEmoji);

      expect(input).toHaveValue('Hello❤️');
    });

    it('should show frequently used emojis', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const emojiButton = screen.getByRole('button', { name: 'Add emoji' });
      fireEvent.click(emojiButton);

      expect(screen.getByText('Frequently Used')).toBeInTheDocument();
      expect(screen.getByText('Smileys & People')).toBeInTheDocument();
      expect(screen.getByText('Animals & Nature')).toBeInTheDocument();
    });
  });

  describe('file attachments', () => {
    it('should open file picker when attach button is clicked', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const attachButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(attachButton);

      expect(screen.getByLabelText('Select file to attach')).toBeInTheDocument();
    });

    it('should handle file selection', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const attachButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(attachButton);

      const fileInput = screen.getByLabelText('Select file to attach');
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      act(() => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      expect(screen.getByText('test.txt')).toBeInTheDocument();
      expect(screen.getByText('text/plain')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove attachment' })).toBeInTheDocument();
    });

    it('should send message with attachment', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const attachButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(attachButton);

      const fileInput = screen.getByLabelText('Select file to attach');
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'Check this file' } });

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith({
          content: 'Check this file',
          type: 'FILE',
          attachments: [mockFile],
        });
      });
    });

    it('should remove attachment when remove button is clicked', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const attachButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(attachButton);

      const fileInput = screen.getByLabelText('Select file to attach');
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const removeButton = screen.getByRole('button', { name: 'Remove attachment' });
      fireEvent.click(removeButton);

      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });

    it('should validate file size', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          maxFileSize={1024} // 1KB limit
        />
      );

      const attachButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(attachButton);

      const fileInput = screen.getByLabelText('Select file to attach');
      const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText('File size exceeds 1.0 KB limit')).toBeInTheDocument();
      });
    });

    it('should validate file type', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          acceptedFileTypes={['image/*', 'text/*']}
        />
      );

      const attachButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(attachButton);

      const fileInput = screen.getByLabelText('Select file to attach');
      const executableFile = new File(['binary'], 'app.exe', { type: 'application/x-executable' });

      fireEvent.change(fileInput, { target: { files: [executableFile] } });

      await waitFor(() => {
        expect(screen.getByText('File type not supported')).toBeInTheDocument();
      });
    });
  });

  describe('message formatting', () => {
    it('should show formatting toolbar', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          showFormatting={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Code' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    });

    it('should apply bold formatting', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          showFormatting={true}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const boldButton = screen.getByRole('button', { name: 'Bold' });

      fireEvent.change(input, { target: { value: 'Hello world!' } });
      input.setSelectionRange(0, 5); // Select "Hello"

      fireEvent.click(boldButton);

      expect(input).toHaveValue('**Hello** world!');
    });

    it('should apply italic formatting', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          showFormatting={true}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const italicButton = screen.getByRole('button', { name: 'Italic' });

      fireEvent.change(input, { target: { value: 'Hello world!' } });
      input.setSelectionRange(6, 11); // Select "world"

      fireEvent.click(italicButton);

      expect(input).toHaveValue('Hello *world*!');
    });

    it('should apply code formatting', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          showFormatting={true}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const codeButton = screen.getByRole('button', { name: 'Code' });

      fireEvent.change(input, { target: { value: 'const x = 1;' } });
      input.setSelectionRange(0, 12); // Select all

      fireEvent.click(codeButton);

      expect(input).toHaveValue('`const x = 1;`');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      expect(screen.getByRole('form', { name: 'Send message' })).toBeInTheDocument();
      expect(screen.getByLabelText('Message input')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      const emojiButton = screen.getByRole('button', { name: 'Add emoji' });
      const attachButton = screen.getByRole('button', { name: 'Attach file' });

      expect(input).toHaveAttribute('tabIndex', '0');
      expect(sendButton).toHaveAttribute('tabIndex', '0');
      expect(emojiButton).toHaveAttribute('tabIndex', '0');
      expect(attachButton).toHaveAttribute('tabIndex', '0');
    });

    it('should announce typing status to screen readers', async () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'Hello' } });

      await waitFor(() => {
        expect(screen.getByLabelText('Typing in progress')).toBeInTheDocument();
      });
    });
  });

  describe('character limits', () => {
    it('should show character count when approaching limit', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          maxLength={100}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'x'.repeat(85) } });

      expect(screen.getByText('85/100')).toBeInTheDocument();
    });

    it('should prevent typing when limit is reached', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          maxLength={10}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'x'.repeat(15) } });

      expect(input).toHaveValue('x'.repeat(10));
      expect(screen.getByText('10/10')).toBeInTheDocument();
    });

    it('should not disable send button when at character limit', () => {
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          onTyping={mockOnTyping}
          disabled={false}
          placeholder="Type a message..."
          maxLength={10}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: 'x'.repeat(10) } });

      expect(sendButton).not.toBeDisabled();
    });
  });
});