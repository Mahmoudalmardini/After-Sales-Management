import React, { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import CurrencySelector from '../common/CurrencySelector';
import { authAPI } from '../../services/api';

export default function Header(props: any) {
  const { lang, setLang } = useI18n();
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(v => v + 1);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Only load notifications if user is authenticated
      if (!user) return;
      
      try {
        const res: any = await authAPI.getNotifications({ unreadOnly: true, limit: 1, page: 1 });
        if (!mounted) return;
        setNotificationCount(res.unreadCount || 0);
      } catch (error) {
        console.log('Failed to load notifications:', error);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      name: 'Your Profile',
      icon: UserCircleIcon,
      action: () => navigate('/profile'),
    },
    {
      name: 'Settings',
      icon: Cog6ToothIcon,
      action: () => navigate('/settings'),
    },
    {
      name: 'Sign out',
      icon: ArrowRightOnRectangleIcon,
      action: handleLogout,
    },
  ];

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next as any);
  };

  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200">
      <button
        type="button"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
        onClick={() => props.setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>
      
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex items-center">
          {/* Logo */}
          <div className="logo-container cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img
              src="/images/logo/logo-sm.png"
              alt="شعار نظام ما بعد البيع"
              className="logo-image h-8 w-auto mr-3 rtl:mr-0 rtl:ml-3"
              onError={(e) => {
                // Fallback if logo not found
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="hidden lg:block">
              <h1 className="text-lg font-bold text-gray-900 font-arabic">
                نظام ما بعد البيع
              </h1>
              <p className="text-xs text-gray-500 font-arabic">
                After-Sales Management System
              </p>
            </div>
          </div>
          
          <div className="flex-1 max-w-xs ml-8 rtl:ml-0 rtl:mr-8">
            {/* Search can be added here later */}
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6 space-x-4 rtl:space-x-reverse">
          {/* Currency Selector */}
          <CurrencySelector showLabel={false} className="hidden sm:flex" />
          {/* Notifications */}
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">{notificationCount}</span>
              </span>
            )}
          </button>

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <div>
              <Menu.Button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200">
                <span className="sr-only">Open user menu</span>
                <div className="inline-block h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="ml-3 hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.firstName || 'User'} {user?.lastName || 'Name'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                  </p>
                </div>
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                {userMenuItems.map((item) => (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      <button
                        onClick={item.action}
                        className={clsx(
                          active ? 'bg-gray-100' : '',
                          'flex w-full px-4 py-2 text-sm text-gray-700 items-center transition-colors duration-200'
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4" aria-hidden="true" />
                        {item.name}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Language Toggle */}
          <div className="ml-auto flex items-center gap-2">
            <button className="btn" onClick={toggleLang}>
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
