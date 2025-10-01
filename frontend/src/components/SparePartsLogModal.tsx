import React, { useEffect, useState } from 'react';
import { storageAPI } from '../services/api';
import { useI18n } from '../contexts/I18nContext';

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
  const { t } = useI18n();
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
            <h2 className="text-xl font-bold text-gray-900">{t('storage.changeHistory')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
              title={t('common.update')}
              aria-label={t('common.update')}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
              title={t('common.close')}
              aria-label={t('common.close')}
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
              <p className="text-gray-600">{t('storage.noChangesYet')}</p>
              <p className="text-sm text-gray-400 mt-2">
                {t('storage.changesWillAppear')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg border ${getLogColor(log.changeType)} hover:shadow-md transition-all`}
                >
                  <div className="p-4">
                    {/* Header with icon and spare part info */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl flex-shrink-0">{getLogIcon(log.changeType)}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              log.changeType === 'CREATED' ? 'bg-green-100 text-green-800' :
                              log.changeType === 'UPDATED' ? 'bg-blue-100 text-blue-800' :
                              log.changeType === 'QUANTITY_CHANGED' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {log.changeType === 'CREATED' ? '🆕 إنشاء' :
                               log.changeType === 'UPDATED' ? '✏️ تعديل' :
                               log.changeType === 'QUANTITY_CHANGED' ? '📦 تغيير الكمية' :
                               '🔧 استخدام في طلب'}
                            </span>
                            {log.sparePart && (
                              <>
                                <span className="text-sm font-bold text-gray-900">{log.sparePart.name}</span>
                                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                  {log.sparePart.partNumber}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-800 mb-3 leading-relaxed px-1">
                      {log.description}
                    </p>
                    
                    {/* Show detailed change information if available */}
                    {log.fieldChanged && (log.oldValue || log.newValue) && log.changeType === 'UPDATED' && (
                      <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-lg p-4 mb-3 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                            التغيير التفصيلي
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-3 border-l-4 border-red-400 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-xs font-bold text-red-600 uppercase">القيمة السابقة</span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium break-words bg-red-50 p-2 rounded">
                              {log.oldValue || '-'}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border-l-4 border-green-400 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-xs font-bold text-green-600 uppercase">القيمة الجديدة</span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium break-words bg-green-50 p-2 rounded">
                              {log.newValue || '-'}
                            </p>
                          </div>
                        </div>
                        {log.fieldChanged && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 bg-white rounded p-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="font-medium">الحقل المعدل:</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                              {log.fieldChanged === 'name' ? 'اسم القطعة' :
                               log.fieldChanged === 'presentPieces' ? 'عدد القطع الموجودة' :
                               log.fieldChanged === 'unitPrice' ? 'سعر الوحدة' :
                               log.fieldChanged === 'currency' ? 'العملة' :
                               log.fieldChanged === 'quantity' ? 'الكمية' :
                               log.fieldChanged === 'description' ? 'الوصف' :
                               log.fieldChanged === 'departmentId' ? 'القسم' :
                               log.fieldChanged}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show quantity change badge if available */}
                    {log.quantityChange !== undefined && log.quantityChange !== null && log.quantityChange !== 0 && (
                      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${
                        log.quantityChange > 0 ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
                      }`}>
                        <svg className={`w-5 h-5 ${log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {log.quantityChange > 0 ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          )}
                        </svg>
                        <div>
                          <span className="text-xs font-medium text-gray-700">تغيير في الكمية:</span>
                          <span className={`ml-2 text-lg font-bold ${log.quantityChange > 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                          </span>
                          <span className="text-xs text-gray-600 mr-1">قطعة</span>
                        </div>
                      </div>
                    )}

                    {/* User and timestamp info */}
                    <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        {log.changedBy && (
                          <>
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium text-gray-700">بواسطة:</span>
                            <span className="text-gray-900 font-semibold">
                              {log.changedBy.firstName} {log.changedBy.lastName}
                            </span>
                          </>
                        )}
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
            {t('storage.totalChanges')}: {logs.length}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SparePartsLogModal;
