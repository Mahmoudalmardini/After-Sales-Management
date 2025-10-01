import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { dashboardAPI, requestsAPI } from '../services/api';
import { DashboardStats, Request } from '../types';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdueRequests, setOverdueRequests] = useState<Request[]>([]);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsResp, overdueResp, recentResp] = await Promise.all([
          dashboardAPI.getStats(),
          requestsAPI.getRequests({ isOverdue: true, limit: 5 }),
          requestsAPI.getRequests({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        ]);
        
        setStats(statsResp.data);
        setOverdueRequests(overdueResp.data?.requests || []);
        setRecentRequests(recentResp.data?.requests || []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const displayStats = [
    {
      name: t('dashboard.stats.totalRequests'),
      value: stats?.totalRequests?.toString() || '0',
      icon: ClipboardDocumentListIcon,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      name: t('dashboard.stats.overdueRequests'),
      value: stats?.overdueRequests?.toString() || '0',
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
    {
      name: t('dashboard.stats.completedRequests'),
      value: stats?.completedRequests?.toString() || '0',
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      name: t('dashboard.stats.pendingRequests'),
      value: stats?.pendingRequests?.toString() || '0',
      icon: ClockIcon,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
    },
    {
      name: t('dashboard.stats.underWarranty'),
      value: stats?.underWarranty?.toString() || '0',
      icon: ShieldCheckIcon,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      name: t('dashboard.stats.outOfWarranty'),
      value: stats?.outOfWarranty?.toString() || '0',
      icon: ShieldExclamationIcon,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
    },
  ];


  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'NEW': 'status-badge status-new',
      'ASSIGNED': 'status-badge status-assigned',
      'UNDER_INSPECTION': 'status-badge status-under-inspection',
      'WAITING_PARTS': 'status-badge status-waiting-parts',
      'IN_REPAIR': 'status-badge status-in-repair',
      'COMPLETED': 'status-badge status-completed',
      'CLOSED': 'status-badge status-closed',
    };
    return statusClasses[status as keyof typeof statusClasses] || 'status-badge status-new';
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      'LOW': 'status-badge priority-low',
      'NORMAL': 'status-badge priority-normal',
      'HIGH': 'status-badge priority-high',
      'URGENT': 'status-badge priority-urgent',
    };
    return priorityClasses[priority as keyof typeof priorityClasses] || 'status-badge priority-normal';
  };

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-sm p-6 text-white">
        <h1 className="text-2xl font-bold">
          {t('dashboard.welcome', { firstName: user?.firstName || '' })}
        </h1>
        <p className="mt-1 text-primary-100">
          {t('dashboard.welcomeSubtitle')}
        </p>
      </div>

      {/* Overdue Requests Alert */}
      {overdueRequests.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <BellIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {t('dashboard.overdueAlert', { count: overdueRequests.length })}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{t('dashboard.overdueDescription')}</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {overdueRequests.slice(0, 3).map((req) => (
                    <li key={req.id}>
                      <Link 
                        to={`/requests/${req.id}`}
                        className="font-medium underline hover:text-red-900"
                      >
                        {req.requestNumber}
                      </Link>
                      {' - '}{req.customer.name}
                      {' - '}{Math.floor((new Date().getTime() - new Date(req.slaDueDate || req.createdAt).getTime()) / (1000 * 60 * 60 * 24))} {t('dashboard.daysOverdue')}
                    </li>
                  ))}
                </ul>
                {overdueRequests.length > 3 && (
                  <p className="mt-1">
                    <Link to="/requests?isOverdue=true" className="font-medium underline hover:text-red-900">
                      {t('dashboard.viewAllOverdue', { count: overdueRequests.length })}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {displayStats.map((item) => (
          <div key={item.name} className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${item.bgColor} rounded-lg p-3`}>
                  <item.icon
                    className={`h-6 w-6 ${item.textColor}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Spare Parts Activity Widget - Removed to prevent issues */}

      {/* Recent requests */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {t('dashboard.recentRequests')}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {t('dashboard.recentRequestsDesc')}
          </p>
        </div>
        <div className="card-content p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">{t('dashboard.loading')}</div>
            </div>
          ) : recentRequests.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.table.number')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.table.client')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.table.product')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.table.status')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.table.priority')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.table.created')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        <Link to={`/requests/${request.id}`}>
                          {request.requestNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.product?.name || t('dashboard.undefined')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(request.status)}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getPriorityBadge(request.priority)}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">{t('dashboard.noRequests')}</div>
            </div>
          )}
        </div>
        <div className="card-footer">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-700">
              {t('dashboard.showingRequests', { count: recentRequests.length, total: stats?.totalRequests || 0 })}
            </p>
            <Link
              to="/requests"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              {t('dashboard.viewAllRequests')}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/requests/new"
          className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
        >
          <div className="card-content text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary-200 transition-colors duration-200">
              <ClipboardDocumentListIcon className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">{t('dashboard.quickActions.newRequest')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.quickActions.newRequestDesc')}</p>
          </div>
        </Link>

        <Link
          to="/customers"
          className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
        >
          <div className="card-content text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-green-200 transition-colors duration-200">
              <ClipboardDocumentListIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">{t('dashboard.quickActions.clients')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.quickActions.clientsDesc')}</p>
          </div>
        </Link>

        <Link
          to="/reports"
          className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
        >
          <div className="card-content text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-purple-200 transition-colors duration-200">
              <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">{t('dashboard.quickActions.reports')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.quickActions.reportsDesc')}</p>
          </div>
        </Link>

        <Link
          to="/profile"
          className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
        >
          <div className="card-content text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-orange-200 transition-colors duration-200">
              <ClipboardDocumentListIcon className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">{t('dashboard.quickActions.profile')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.quickActions.profileDesc')}</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
