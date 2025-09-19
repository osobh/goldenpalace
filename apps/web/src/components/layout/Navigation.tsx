import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  MessageCircle,
  Trophy,
  Shield,
  User,
} from 'lucide-react';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Trading',
    href: '/trading',
    icon: TrendingUp,
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageCircle,
  },
  {
    name: 'Competitions',
    href: '/competitions',
    icon: Trophy,
  },
  {
    name: 'Risk Analytics',
    href: '/risk',
    icon: Shield,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export function Navigation() {
  return (
    <nav className="w-64 bg-card border-r border-border">
      <div className="p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}