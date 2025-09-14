import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { 
  HomeIcon, 
  AcademicCapIcon, 
  ClipboardDocumentListIcon, 
  ChartBarIcon,
  WifiIcon,
  CalendarDaysIcon,
  UserIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import QuickStats from '../QuickStats/QuickStats';

// Custom RFID Icon component since Heroicons doesn't have one
const RfidIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const Layout = () => {
  const location = useLocation();
  const { user, logout, isAdmin, hasPermission } = useAuth();

  // Navigation items based on user role and permissions
  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, permission: null },
    ];

    // Add role-specific navigation items
    if (isAdmin()) {
      baseItems.push(
        { name: 'Students', href: '/students', icon: AcademicCapIcon, permission: 'canManageStudents' },
        { name: 'Users', href: '/users', icon: UserGroupIcon, permission: 'canManageUsers' },
        { name: 'Exams', href: '/exams', icon: CalendarDaysIcon, permission: 'canManageExams' }
      );
    }

    // Items available to both admin and invigilators
    baseItems.push(
      { name: 'Attendance', href: '/attendance', icon: ClipboardDocumentListIcon, permission: 'canViewReports' },
      { name: 'Scanner', href: '/scanner', icon: WifiIcon, permission: 'canControlScanner' },
      { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, permission: 'canViewReports' }
    );

    // Filter items based on permissions
    return baseItems.filter(item => 
      !item.permission || hasPermission(item.permission)
    );
  };

  const navigation = getNavigationItems();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <RfidIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Exam Attendance System
                </h1>
                <p className="text-sm text-gray-500">
                  Secure RFID-based exam attendance
                </p>
              </div>
            </div>

            {/* User Menu and Actions */}
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live</span>
              </div>
              
              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
                
                {/* Settings */}
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
                
                {/* Logout */}
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-8 px-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                        isActive
                          ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Quick Stats Sidebar */}
          <div className="mt-8 px-4">
            <QuickStats />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;