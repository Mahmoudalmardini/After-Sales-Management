import React, { useEffect, useState, useCallback } from 'react';
import { storageAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface SparePartActivity {
  id: number;
  sparePartId: number;
  changeType: 'CREATED' | 'UPDATED' | 'QUANTITY_CHANGED' | 'USED_IN_REQUEST';
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  quantityChange?: number;
  description: string;
  requestId?: number;
  createdAt: string;
  sparePart: {
    id: number;
    name: string;
    partNumber: string;
  };
  changedBy: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
}

const SparePartsActivity: React.FC = () => {
  const { hasRole } = useAuth();
  const [activities, setActivities] = useState<SparePartActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('today');

  const canViewActivity = hasRole([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR,
    UserRole.WAREHOUSE_KEEPER,
  ]);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      // Get all spare parts first
      const response = await storageAPI.getSpareParts({ limit: 100 });
      const spareParts = response.data?.spareParts || [];
      
      // Load history for each spare part
      const allActivities: SparePartActivity[] = [];
      
      for (const part of spareParts) {
        try {
          const historyResponse = await storageAPI.getSparePartHistory(part.id) as any;
          const history = historyResponse.data?.history || [];
          allActivities.push(...history);
        } catch (error) {
          console.error(`Error loading history for part ${part.id}:`, error);
        }
      }

      // Sort by date descending
      allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply filter
      const now = new Date();
      const filtered = allActivities.filter(activity => {
        const activityDate = new Date(activity.createdAt);
        if (filter === 'today') {
          return activityDate.toDateString() === now.toDateString();
        } else if (filter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return activityDate >= weekAgo;
        }
        return true; // 'all'
      });

      setActivities(filtered);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (canViewActivity) {
      loadActivities();
    }
  }, [filter, canViewActivity, loadActivities]);

  const getActivityIcon = (changeType: string) => {
    switch (changeType) {
      case 'CREATED':
        return '🆕';
      case 'UPDATED':
        return '✏️';
      case 'QUANTITY_CHANGED':
        return '📦';
      case 'USED_IN_REQUEST':
        return '🔧';
      default:
        return '📋';
    }
  };

  const getActivityColor = (changeType: string) => {
    switch (changeType) {
      case 'CREATED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'QUANTITY_CHANGED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'USED_IN_REQUEST':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-SY');
  };

  if (!canViewActivity) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">نشاط قطع الغيار</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            هذا الأسبوع
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل
          </button>
          <button
            onClick={loadActivities}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
            title="تحديث"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          لا توجد أنشطة {filter === 'today' ? 'اليوم' : filter === 'week' ? 'هذا الأسبوع' : ''}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border ${getActivityColor(activity.changeType)} hover:shadow-sm transition-shadow`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{getActivityIcon(activity.changeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {activity.description}
                  </p>
                  
                  {activity.oldValue && activity.newValue && (
                    <div className="mt-2 bg-white bg-opacity-50 rounded p-2 text-xs">
                      <span className="text-gray-600">من:</span>
                      <span className="font-medium text-red-700 mx-1">{activity.oldValue}</span>
                      <span className="text-gray-400">←</span>
                      <span className="text-gray-600 mx-1">إلى:</span>
                      <span className="font-medium text-green-700">{activity.newValue}</span>
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{activity.changedBy.firstName} {activity.changedBy.lastName}</span>
                      <span className="text-gray-400">•</span>
                      <span>{activity.sparePart.name}</span>
                    </div>
                    <span>{formatTime(activity.createdAt)}</span>
                  </div>
                  
                  {activity.requestId && (
                    <div className="mt-1 text-xs text-gray-500">
                      مرتبط بالطلب #{activity.requestId}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SparePartsActivity;
