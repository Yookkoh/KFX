import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Settings,
  LogOut,
  ChevronLeft,
  X,
  DollarSign,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, useSidebarStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CreditCard, label: 'Cards', path: '/cards' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions' },
  { icon: Users, label: 'Partners', path: '/partners' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { user, workspace, logout } = useAuthStore();
  const { isCollapsed, isMobileOpen, toggleCollapse, setMobileOpen } = useSidebarStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280,
          x: isMobileOpen ? 0 : undefined,
        }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r bg-card transition-transform lg:relative lg:translate-x-0',
          !isMobileOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-xl font-bold text-gradient overflow-hidden whitespace-nowrap"
                >
                  KinkyForex
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user?.name || user?.email)}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="truncate text-sm font-medium">
                    {user?.name || user?.email?.split('@')[0]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {workspace?.name}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 hidden h-6 w-6 rounded-full border bg-background shadow-sm lg:flex"
          onClick={toggleCollapse}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              isCollapsed && 'rotate-180'
            )}
          />
        </Button>
      </motion.aside>
    </>
  );
}
