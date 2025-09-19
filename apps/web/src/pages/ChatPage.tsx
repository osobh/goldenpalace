export function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Chat</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          New Group
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Groups</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No groups joined yet.</p>
          </div>
        </div>

        <div className="lg:col-span-3 bg-card border border-border rounded-lg flex flex-col">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-medium text-foreground">Select a group to start chatting</h3>
          </div>

          <div className="flex-1 p-6 flex items-center justify-center">
            <p className="text-muted-foreground">Join or create a group to start messaging with other traders.</p>
          </div>

          <div className="p-6 border-t border-border">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-input bg-background rounded-md disabled:opacity-50"
                disabled
              />
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}