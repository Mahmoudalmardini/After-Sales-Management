import React, { useCallback, useEffect, useState } from 'react';
import { storageAPI, departmentsAPI } from '../../services/api';
import { SparePart, CreateSparePartForm, StorageFilters, Department, UserRole } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import SparePartsLogModal from '../../components/SparePartsLogModal';

const StoragePage: React.FC = () => {
  const { t } = useI18n();
  const { hasRole } = useAuth();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [form, setForm] = useState<CreateSparePartForm>({
    name: '',
    partNumber: '', // Alphanumeric identifier
    presentPieces: 0, // Number of present pieces
    unitPrice: 0,
    quantity: 0,
    currency: 'SYP',
    description: '',
    departmentId: undefined,
  });
  const [changeReason, setChangeReason] = useState<string>('');

  const [filters, setFilters] = useState<StorageFilters>({
    search: '',
    category: '',
    lowStock: false,
    page: 1,
    limit: 20,
  });
  
  const [selectedPartForDescription, setSelectedPartForDescription] = useState<SparePart | null>(null);
  const [selectedPartForHistory, setSelectedPartForHistory] = useState<SparePart | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const loadSpareParts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await storageAPI.getSpareParts(filters);
      setSpareParts((response as any).data?.spareParts || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load spare parts');
    } finally {
      setLoading(false);
    }
  }, [filters]);


  const loadDepartments = async () => {
    try {
      const response = await departmentsAPI.getDepartments();
      console.log('Departments response:', response);
      setDepartments((response as any).data?.departments || []);
    } catch (e: any) {
      console.error('Failed to load departments:', e);
    }
  };

  useEffect(() => {
    loadSpareParts();
    loadDepartments();
  }, [filters, loadSpareParts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Ensure required backend fields exist
      const payload: CreateSparePartForm = {
        ...form,
        quantity: typeof form.quantity === 'number' ? form.quantity : 0,
      };
      
      // Validate required fields
      if (!payload.name || payload.presentPieces === undefined) {
        setError('Name and number of present pieces are required');
        setLoading(false);
        return;
      }
      
      if (editingPart) {
        await storageAPI.updateSparePart(editingPart.id, { ...payload, changeReason });
      } else {
        await storageAPI.createSparePart(payload);
      }
      setShowForm(false);
      setEditingPart(null);
      setForm({
        name: '',
        partNumber: '',
        presentPieces: 0,
        unitPrice: 0,
        quantity: 0,
        currency: 'SYP',
        description: '',
        departmentId: undefined,
      });
      setChangeReason('');
      await loadSpareParts();
    } catch (e: any) {
      setError(e.message || 'Failed to save spare part');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (part: SparePart) => {
    setEditingPart(part);
    setForm({
      name: part.name,
      partNumber: part.partNumber,
      presentPieces: part.presentPieces,
      unitPrice: part.unitPrice,
      quantity: part.quantity,
      currency: part.currency || 'SYP',
      description: part.description || '',
      departmentId: (part as any).departmentId || undefined,
    });
    setChangeReason('');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('storage.confirmDelete'))) return;
    try {
      setLoading(true);
      await storageAPI.deleteSparePart(id);
      await loadSpareParts();
    } catch (e: any) {
      setError(e.message || 'Failed to delete spare part');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (part: SparePart) => {
    setSelectedPartForHistory(part);
    setLoadingHistory(true);
    try {
      const response = await storageAPI.getSparePartHistory(part.id) as any;
      setHistoryData(response.data?.history || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load history');
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };


  const canEdit = hasRole([UserRole.WAREHOUSE_KEEPER]);
  const canView = hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.WAREHOUSE_KEEPER]);

  // If user doesn't have view permissions, show access denied
  if (!canView) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('common.accessDenied')}</h1>
          <p className="text-gray-600">{t('storage.noAccess')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('storage.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('storage.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn bg-indigo-600 text-white hover:bg-indigo-700" 
            onClick={() => setShowLogsModal(true)}
          >
            📋 التاريخ
          </button>
          {canEdit && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              {t('storage.add')}
            </button>
          )}
        </div>
      </div>

      {/* Spare Parts Activity Widget - Removed to prevent issues */}

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              className="input"
              placeholder={t('common.search') + ' by name or number of present pieces...'}
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
            <select
              className="input"
              value={filters.category || ''}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="MECHANICAL">Mechanical</option>
              <option value="ELECTRONIC">Electronic</option>
            </select>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.lowStock || false}
                onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked, page: 1 })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Low Stock Only</span>
            </label>
            <button
              className="btn"
              onClick={() => setFilters({ search: '', category: '', lowStock: false, page: 1, limit: 20 })}
            >
              {t('common.clear')}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && canEdit && (
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-medium mb-4">
              {editingPart ? t('storage.edit') : t('storage.add')}
            </h3>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <input
                className="input"
                placeholder={t('storage.name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              {editingPart && (
                <input
                  className="input bg-gray-100"
                  type="text"
                  placeholder={t('storage.partNumber')}
                  value={form.partNumber}
                  disabled
                  title="رقم القطعة يتم توليده تلقائياً"
                />
              )}
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                placeholder={t('storage.presentPieces')}
                value={form.presentPieces}
                onChange={(e) => {
                  const value = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                  setForm({ ...form, presentPieces: value });
                }}
                required
              />
              <input
                className="input"
                type="text"
                inputMode="decimal"
                pattern="[0-9]+(\.[0-9]{1,2})?"
                placeholder={t('storage.unitPrice')}
                value={form.unitPrice || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  const numValue = parseFloat(value) || 0;
                  setForm({ ...form, unitPrice: numValue });
                }}
                required
              />
              <div>
                <label htmlFor="currency" className="block text-sm text-gray-700 mb-1">
                  {t('storage.currency')}
                </label>
                <select
                  id="currency"
                  name="currency"
                  className="input w-full"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  required
                >
                  <option value="SYP">SYP - Syrian Pound</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                placeholder={t('storage.quantity')}
                value={form.quantity || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  const numValue = parseInt(value) || 0;
                  setForm({ ...form, quantity: numValue });
                }}
                required
              />
              <div className="md:col-span-2">
                <label htmlFor="departmentId" className="block text-sm text-gray-700 mb-1">
                  {t('products.department')}
                </label>
                <select
                  id="departmentId"
                  name="departmentId"
                  className="input w-full"
                  value={form.departmentId ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      departmentId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  aria-label={t('products.department')}
                >
                  <option value="">{t('common.select')}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Loading departments...</p>
                )}
              </div>
              <textarea
                className="input md:col-span-2"
                placeholder={t('storage.description')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
              {editingPart && (
                <div className="md:col-span-2">
                  <label htmlFor="changeReason" className="block text-sm font-medium text-gray-700 mb-1">
                    سبب التعديل (مطلوب) *
                  </label>
                  <textarea
                    id="changeReason"
                    className="input w-full border-blue-300 focus:border-blue-500"
                    placeholder="يرجى توضيح سبب التعديل (مثلاً: تحديث السعر بسبب تغير سعر الموّرد، تصحيح الكمية بعد الجرد...)"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    rows={2}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    📝 سيتم حفظ هذا السبب في التغييرات ليراه المديرون
                  </p>
                </div>
              )}
              <div className="md:col-span-2 flex gap-2">
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? t('common.loading') : (editingPart ? t('storage.update') : t('storage.save'))}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPart(null);
                    setForm({
                      name: '',
                      partNumber: '',
                      presentPieces: 0,
                      unitPrice: 0,
                      quantity: 0,
                      currency: 'SYP',
                      description: '',
                      departmentId: undefined,
                    });
                    setChangeReason('');
                  }}
                >
                  {t('storage.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-content">
          {error && <div className="text-red-600 mb-3">{error}</div>}
          
          {/* Summary Stats */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Parts</div>
              <div className="text-2xl font-bold text-blue-900">{spareParts.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600 font-medium">In Stock</div>
              <div className="text-2xl font-bold text-green-900">
                {spareParts.filter(p => p.quantity > 10).length}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Low Stock</div>
              <div className="text-2xl font-bold text-red-900">
                {spareParts.filter(p => p.quantity <= 5).length}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr className="text-right">
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                    {t('storage.name')}
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                    {t('storage.partNumber')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    {t('storage.presentPieces')}
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                    {t('storage.unitPrice')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    {t('storage.currency')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    {t('storage.quantity')}
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                    {t('storage.description')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    {t('products.department')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    {t('storage.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      {t('storage.loading')}
                    </td>
                  </tr>
                ) : spareParts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      {filters.search ? 
                        `No spare parts found matching "${filters.search}"` : 
                        t('storage.empty')
                      }
                    </td>
                  </tr>
                ) : (
                  spareParts.map((part) => {
                    // Check if part was recently updated (within last 24 hours)
                    const isRecentlyUpdated = part.updatedAt && 
                      new Date(part.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
                    
                    return (
                      <tr 
                        key={part.id} 
                        className={`hover:bg-blue-50 hover:shadow-sm cursor-pointer transition-all duration-150 ${isRecentlyUpdated ? 'bg-yellow-50' : ''}`} 
                        onClick={() => setSelectedPartForDescription(part)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{part.name}</div>
                            {isRecentlyUpdated && (
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">محدث</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">{part.partNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-medium text-gray-900">{part.presentPieces}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">{part.unitPrice.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {part.currency || 'SYP'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            part.quantity <= 5 ? 'bg-red-100 text-red-800' : 
                            part.quantity <= 10 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {part.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-sm text-gray-600 truncate" title={part.description || '-'}>
                            {part.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{part.department?.name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-center">
                            {canEdit && (
                              <button
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
                                onClick={(e) => { e.stopPropagation(); handleEdit(part); }}
                              >
                                <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                تعديل
                              </button>
                            )}
                            {(canEdit || hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER])) && (
                              <button
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-150"
                                onClick={(e) => { e.stopPropagation(); handleViewHistory(part); }}
                              >
                                <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                التاريخ
                              </button>
                            )}
                            {canEdit && (
                              <button
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-150"
                                onClick={(e) => { e.stopPropagation(); handleDelete(part.id); }}
                              >
                                <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                حذف
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Description Modal */}
      {selectedPartForDescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedPartForDescription(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedPartForDescription.name}</h3>
              <button
                onClick={() => setSelectedPartForDescription(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="إغلاق النافذة"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">رقم القطعة:</span>
                  <p className="text-sm font-mono text-gray-900">{selectedPartForDescription.partNumber}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">عدد القطع الموجودة:</span>
                  <p className="text-sm text-gray-900">{selectedPartForDescription.presentPieces}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">الكمية:</span>
                  <p className="text-sm text-gray-900">{selectedPartForDescription.quantity}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">السعر:</span>
                  <p className="text-sm text-gray-900">{selectedPartForDescription.unitPrice.toLocaleString()} {selectedPartForDescription.currency}</p>
                </div>
                {selectedPartForDescription.department && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">القسم:</span>
                    <p className="text-sm text-gray-900">{selectedPartForDescription.department.name}</p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">الوصف:</span>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                  {selectedPartForDescription.description || 'لا يوجد وصف'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedPartForDescription(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {selectedPartForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedPartForHistory(null)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">تاريخ التغييرات</h3>
                <p className="text-sm text-gray-600">{selectedPartForHistory.name} ({selectedPartForHistory.partNumber})</p>
              </div>
              <button
                onClick={() => setSelectedPartForHistory(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="إغلاق النافذة"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {loadingHistory ? (
              <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">لا توجد تغييرات مسجلة</div>
            ) : (
              <div className="space-y-3">
                {historyData.map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          item.changeType === 'CREATED' ? 'bg-green-100 text-green-800' :
                          item.changeType === 'UPDATED' ? 'bg-blue-100 text-blue-800' :
                          item.changeType === 'QUANTITY_CHANGED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.changeType === 'CREATED' ? '🆕 إنشاء' :
                           item.changeType === 'UPDATED' ? '✏️ تعديل' :
                           item.changeType === 'QUANTITY_CHANGED' ? '📦 تغيير الكمية' :
                           '🔧 استخدام في طلب'}
                        </span>
                        {item.fieldChanged && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {item.fieldChanged === 'name' ? 'الاسم' :
                             item.fieldChanged === 'presentPieces' ? 'عدد القطع' :
                             item.fieldChanged === 'unitPrice' ? 'السعر' :
                             item.fieldChanged === 'currency' ? 'العملة' :
                             item.fieldChanged === 'quantity' ? 'الكمية' :
                             item.fieldChanged === 'description' ? 'الوصف' :
                             item.fieldChanged === 'departmentId' ? 'القسم' :
                             item.fieldChanged === 'partNumber' ? 'رقم القطعة' : item.fieldChanged}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>{new Date(item.createdAt).toLocaleDateString('ar-SY')}</div>
                        <div className="text-right">{new Date(item.createdAt).toLocaleTimeString('ar-SY')}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 mb-3 leading-relaxed">{item.description}</p>
                    
                    {/* Show old and new values if available */}
                    {item.oldValue && item.newValue && item.changeType === 'UPDATED' && (
                      <div className="bg-white rounded p-3 mb-3 border border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-2">التغيير التفصيلي:</div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="font-medium text-red-600">القيمة السابقة:</span>
                            <p className="mt-1 text-gray-900 bg-red-50 p-2 rounded break-words">
                              {item.oldValue}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-green-600">القيمة الجديدة:</span>
                            <p className="mt-1 text-gray-900 bg-green-50 p-2 rounded break-words">
                              {item.newValue}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">بواسطة:</span>
                        <span className="text-gray-800">{item.changedBy.firstName} {item.changedBy.lastName}</span>
                        <span className="text-gray-400">({item.changedBy.role === 'WAREHOUSE_KEEPER' ? 'أمين مستودع' : item.changedBy.role})</span>
                      </div>
                      {item.quantityChange && (
                        <span className={`font-bold text-sm ${item.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.quantityChange > 0 ? '+' : ''}{item.quantityChange} قطعة
                        </span>
                      )}
                    </div>
                    
                    {/* Show request ID if related to a request */}
                    {item.requestId && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500">مرتبط بالطلب رقم: #{item.requestId}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedPartForHistory(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spare Parts Log Modal */}
      <SparePartsLogModal 
        isOpen={showLogsModal} 
        onClose={() => setShowLogsModal(false)} 
      />
    </div>
  );
};

export default StoragePage;
