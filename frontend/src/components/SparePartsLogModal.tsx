import React, { useEffect, useState } from 'react';
import { storageAPI } from '../services/api';

interface SparePartLog {
  id: number;
  sparePartId: number;
  changeType: string;
  description: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  quantityChange?: number;
  createdAt: string;
  sparePart: {
    id: number;
    name: string;
    partNumber: string;
  } | null;
  changedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface SparePartsLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SparePartsLogModal: React.FC<SparePartsLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SparePartLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await storageAPI.getSparePartLogs(100) as any;
      setLogs(response.data?.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLogIcon = (changeType: string) => {
    switch (changeType) {
      case 'USED_IN_REQUEST':
        return '🔧';
      case 'UPDATED':
        return '✏️';
      case 'QUANTITY_CHANGED':
        return '📦';
      default:
        return '📋';
    }
  };

  const getLogColor = (changeType: string) => {
    switch (changeType) {
      case 'USED_IN_REQUEST':
        return 'bg-purple-50 border-purple-200';
      case 'UPDATED':
        return 'bg-blue-50 border-blue-200';
      case 'QUANTITY_CHANGED':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <h2 className="text-xl font-bold text-gray-900">تاريخ قطع الغيار</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
              title="تحديث"
              aria-label="تحديث"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">📋</div>
              <p className="text-gray-600">لا توجد تغييرات حتى الآن</p>
              <p className="text-sm text-gray-400 mt-2">
                سيتم عرض التغييرات هنا عند استخدام أو تحديث قطع الغيار
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${getLogColor(log.changeType)} hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{getLogIcon(log.changeType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {log.description}
                      </p>
                      
                      {/* Show detailed change information if available */}
                      {log.fieldChanged && (log.oldValue || log.newValue) && (
                        <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-700">التغيير التفصيلي:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="font-medium text-red-600">القيمة السابقة:</span>
                              <p className="mt-1 text-gray-900 bg-red-50 p-2 rounded">
                                {log.oldValue || '-'}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-green-600">القيمة الجديدة:</span>
                              <p className="mt-1 text-gray-900 bg-green-50 p-2 rounded">
                                {log.newValue || '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show quantity change if available */}
                      {log.quantityChange !== undefined && log.quantityChange !== null && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-200">
                          <span className="text-xs font-medium text-gray-700">التغيير في الكمية:</span>
                          <span className={`text-xs font-bold ${log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                          </span>
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          {log.sparePart && (
                            <>
                              <span className="font-medium">{log.sparePart.name}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500 font-mono">{log.sparePart.partNumber}</span>
                            </>
                          )}
                          {log.changedBy && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-blue-600">
                                {log.changedBy.firstName} {log.changedBy.lastName}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-gray-500">{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            إجمالي التغييرات: {logs.length}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default SparePartsLogModal;
