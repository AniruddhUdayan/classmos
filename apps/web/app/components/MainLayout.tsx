'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import LogoutButton from './LogoutButton';
import { 
  HomeIcon, 
  BookOpenIcon, 
  ChatBubbleLeftIcon, 
  TrophyIcon, 
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

interface MainLayoutProps {
  children: React.ReactNode;
  userRole?: 'student' | 'educator';
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Quizzes', href: '/quiz', icon: BookOpenIcon },
  { name: 'AI Tutor', href: '/chat', icon: ChatBubbleLeftIcon },
  { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
];

const educatorNavigation = [
  { name: 'Dashboard', href: '/dashboard/educator', icon: HomeIcon },
  { name: 'Manage Quizzes', href: '/dashboard/educator/quizzes', icon: BookOpenIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
];

export default function MainLayout({ children, userRole = 'student' }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  const navItems = userRole === 'educator' ? educatorNavigation : navigation;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border sidebar-shadow transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <AcademicCapIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient-gold">Classmos</span>
            </Link>
            
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 custom-scrollbar overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                        ${isActive 
                          ? 'bg-primary text-primary-foreground shadow-md' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <item.icon className={`
                        mr-3 h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}
                      `} />
                      {item.name}
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="ml-auto w-2 h-2 bg-primary-foreground rounded-full"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User role indicator */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className={`
                w-2 h-2 rounded-full
                ${userRole === 'educator' ? 'bg-primary' : 'bg-green-500'}
              `} />
              <span className="capitalize">{userRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          {/* Breadcrumb or page title */}
          <div className="flex-1 flex items-center space-x-4 lg:ml-0 ml-4">
            <h1 className="text-lg font-semibold text-foreground">
              {navItems.find(item => pathname.startsWith(item.href))?.name || 'Classmos'}
            </h1>
          </div>

          {/* User button */}
          <div className="flex items-center space-x-4">
            <LogoutButton />
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-card border-border",
                  userButtonPopoverFooter: "hidden"
                }
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

