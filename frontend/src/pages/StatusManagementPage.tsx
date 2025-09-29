import React, { useCallback, useEffect, useState } from 'react';
import { statusAPI } from '../services/api';
import { CustomRequestStatus } from '../types';
import { useI18n } from '../contexts/I18nContext';

const StatusManagementPage: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<CustomRequestStatus[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CustomRequestStatus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    sortOrder: 0,
  });

  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await statusAPI.getCustomStatuses();
      setStatuses(response.statuses);
    } catch (e: any) {
      setError(e.message || 'Failed to load statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.displayName) return;

    try {
      setLoading(true);
      await statusAPI.createCustomStatus(formData);
      setShowCreateModal(false);
      setFormData({ name: '', displayName: '', description: '', sortOrder: 0 });
      await loadStatuses();
    } catch (e: any) {
      setError(e.message || 'Failed to create status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus || !formData.name || !formData.displayName) return;

    try {
      setLoading(true);
      await statusAPI.updateCustomStatus(editingStatus.id, formData);
      setEditingStatus(null);
      setFormData({ name: '', displayName: '', description: '', sortOrder: 0 });
      await loadStatuses();
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this status?')) return;

    try {
      setLoading(true);
      await statusAPI.deleteCustomStatus(id);
      await loadStatuses();
    } catch (e: any) {
      setError(e.message || 'Failed to delete status');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (status: CustomRequestStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      displayName: status.displayName,
      description: status.description || '',
      sortOrder: status.sortOrder,
    });
  };

  const resetForm = () => {
    setFormData({ name: '', displayName: '', description: '', sortOrder: 0 });
    setEditingStatus(null);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('status.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('status.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
{t('status.add')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-content">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الاسم المعروض
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الوصف
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ترتيب العرض
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statuses.map((status) => (
                    <tr key={status.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {status.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {status.displayName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {status.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {status.sortOrder}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(status)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(status.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingStatus) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingStatus ? 'تعديل الحالة' : 'إضافة حالة جديدة'}
              </h3>
              <form onSubmit={editingStatus ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الحالة *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
                    required
                    placeholder="مثال: CUSTOM_STATUS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم المعروض *
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="input"
                    required
                    placeholder="مثال: حالة مخصصة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوصف
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="textarea-field"
                    rows={3}
                    placeholder="وصف الحالة..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ترتيب العرض
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'جاري الحفظ...' : (editingStatus ? 'تحديث' : 'إنشاء')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusManagementPage;
