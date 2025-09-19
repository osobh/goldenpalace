import { useAuthStore } from '../../stores/authStore';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-primary">Golden Palace</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span className="text-sm font-medium">{user?.username}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}