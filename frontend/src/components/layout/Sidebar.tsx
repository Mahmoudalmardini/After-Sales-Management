import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { UserRole } from '../../types';
import {
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CubeIcon,
  UsersIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const location = useLocation();

  const navigation = [
    {
      name: t('nav.dashboard') || 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.TECHNICIAN],
    },
    {
      name: t('nav.storage') || 'Storage',
      href: '/storage',
      icon: ArchiveBoxIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.WAREHOUSE_KEEPER],
      isMainForWarehouse: true, // Special flag for warehouse keepers
    },
    {
      name: t('nav.requests') || 'Requests',
      href: '/requests',
      icon: ClipboardDocumentListIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.TECHNICIAN],
    },
    {
      name: t('nav.customers') || 'Customers',
      href: '/customers',
      icon: UserGroupIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR],
    },
    {
      name: t('nav.products') || 'Products',
      href: '/products',
      icon: CubeIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.TECHNICIAN],
    },
    {
      name: t('nav.accounts') || 'Accounts',
      href: '/accounts',
      icon: UsersIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER],
    },
    {
      name: t('nav.reports') || 'Reports',
      href: '/reports',
      icon: ChartBarIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER],
    },
    {
      name: t('nav.statusManagement') || 'Status Management',
      href: '/status-management',
      icon: CogIcon,
      roles: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.TECHNICIAN],
    },
  ];

  const filteredNavigation = navigation.filter(item => 
    hasRole(item.roles as any)
  );

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    // For warehouse keepers, also highlight storage when on root path
    if (user?.role === UserRole.WAREHOUSE_KEEPER && location.pathname === '/' && href === '/storage') {
      return true;
    }
    return location.pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200 lg:w-64 lg:min-w-[16rem]">
      <div className="flex items-center flex-shrink-0 px-4">
        <div className="relative">
          <img
            src="/images/logo/logo-icon.png"
            alt="شعار نظام ما بعد البيع"
            className="logo-image w-10 h-10"
            onError={(e) => {
              // Fallback if logo not found
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          {/* Fallback logo */}
          <div className="hidden w-10 h-10 bg-primary-600 rounded-lg items-center justify-center">
            <span className="text-white text-lg font-bold">ما بعد البيع</span>
          </div>
        </div>
        <div className="ml-3 rtl:mr-3 rtl:ml-0">
          <h1 className="text-lg font-bold text-gray-900 font-arabic">نظام ما بعد البيع</h1>
          <p className="text-xs text-gray-500 font-arabic">خدمات ما بعد البيع</p>
        </div>
      </div>
      
      <div className="mt-8 flex-grow flex flex-col">
        <nav className="flex-1 px-2 pb-4 space-y-1">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={clsx(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                isActive(item.href)
                  ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon
                className={clsx(
                  'mr-3 rtl:ml-3 rtl:mr-0 flex-shrink-0 h-6 w-6',
                  isActive(item.href)
                    ? 'text-primary-600'
                    : 'text-gray-400 group-hover:text-gray-500'
                )}
                aria-hidden="true"
              />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <NavLink
            to="/profile"
            className="flex-shrink-0 group block"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="flex items-center">
              <div className="inline-block h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="ml-3 rtl:mr-3 rtl:ml-0">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.firstName || 'User'} {user?.lastName || 'Name'}
                </p>
                <p className="text-xs text-gray-500 group-hover:text-gray-700">
                  {user?.role?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                </p>
              </div>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className={`hidden lg:flex lg:w-64 lg:min-w-[16rem] lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 ${
        dir === 'rtl' ? 'lg:right-0' : 'lg:left-0'
      }`}>
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;
