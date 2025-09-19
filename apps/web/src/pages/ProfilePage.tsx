import { useAuthStore } from '../stores/authStore';

export function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Username</label>
                <p className="text-muted-foreground">{user?.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Member Since</label>
                <p className="text-muted-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
                <p className="text-muted-foreground">{user?.bio || 'No bio added yet.'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Trading Experience</label>
                <p className="text-muted-foreground">{user?.tradingExperience || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Specialties</label>
                <p className="text-muted-foreground">
                  {user?.specialties?.length ? user.specialties.join(', ') : 'No specialties added'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Trading Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold text-foreground">0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-foreground">0%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className="text-2xl font-bold text-green-600">$0.00</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Best Trade</p>
                <p className="text-2xl font-bold text-green-600">$0.00</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Achievements</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No achievements yet</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Settings</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors">
                <div className="text-sm font-medium">Notification Preferences</div>
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors">
                <div className="text-sm font-medium">Privacy Settings</div>
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors">
                <div className="text-sm font-medium">Change Password</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}