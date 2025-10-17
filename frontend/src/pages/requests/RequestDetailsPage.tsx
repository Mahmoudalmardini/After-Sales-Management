import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { requestsAPI, usersAPI, statusAPI, storageAPI } from '../../services/api';
import { AddCostForm, CloseRequestForm, CostType, Request, RequestStatus, REQUEST_STATUS_LABELS, CustomRequestStatus, UserRole } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, getCurrentCurrency } from '../../utils/currency';
import { useCurrency } from '../../hooks/useCurrency';
import AddPartToRequestModal from '../../components/storage/AddPartToRequestModal';
import RequestSparePartModal from '../../components/requests/RequestSparePartModal';
import AddReportModal from '../../components/requests/AddReportModal';
import TechnicianReportsSection from '../../components/requests/TechnicianReportsSection';

interface CostFormState extends AddCostForm {
  sparePartId?: string;
  sparePartQuantity?: number;
}

const RequestDetailsPage: React.FC = () => {
  const { t } = useI18n();
  const { user, hasRole } = useAuth();
  const { id } = useParams();
  const requestId = Number(id);
  const { getCurrencySymbol: getCurrencySymbolHook } = useCurrency();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [customStatuses, setCustomStatuses] = useState<CustomRequestStatus[]>([]);
  const [assignId, setAssignId] = useState<string>('');
  const [statusTo, setStatusTo] = useState<RequestStatus>('UNDER_INSPECTION');
  const [statusComment, setStatusComment] = useState('');
  const [costForm, setCostForm] = useState<CostFormState>({ description: '', amount: 0, costType: 'PARTS', currency: getCurrentCurrency(), sparePartId: '', sparePartQuantity: undefined });
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loadingSpareParts, setLoadingSpareParts] = useState(false);
  const [showSparePartsModal, setShowSparePartsModal] = useState(false);
  const [showRequestSparePartModal, setShowRequestSparePartModal] = useState(false);
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  useEffect(() => {
    const loadSpareParts = async () => {
      try {
        setLoadingSpareParts(true);
        const response = await storageAPI.getSpareParts({ limit: 100 });
        setSpareParts(response.data?.spareParts || []);
      } catch (e) {
        console.error('Error loading spare parts:', e);
      } finally {
        setLoadingSpareParts(false);
      }
    };

    loadSpareParts();
  }, []);
  const [closeForm, setCloseForm] = useState<CloseRequestForm>({ finalNotes: '', customerSatisfaction: undefined });


  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await requestsAPI.getRequestById(requestId);
      setRequest(data.request);
    } catch (e: any) {
      setError(e.message || t('error.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    if (!requestId) return;
    reload();
  }, [requestId, reload]);

  useEffect(() => {
    const loadTechs = async () => {
      try {
        // For managers, load all technicians. For others, filter by department
        const params: any = { role: UserRole.TECHNICIAN };
        if (!hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER])) {
          params.departmentId = request?.department?.id;
        }
        const resp = await usersAPI.getUsers(params);
        setTechnicians(resp.data?.users || []);
      } catch {}
    };
    loadTechs();
  }, [request?.department?.id, hasRole]);

  useEffect(() => {
    const loadCustomStatuses = async () => {
      try {
        const response = await statusAPI.getCustomStatuses();
        setCustomStatuses(response.statuses);
      } catch (e) {
        console.error('Error loading custom statuses:', e);
      }
    };
    loadCustomStatuses();
  }, []);

  const statusOptions: RequestStatus[] = useMemo(() => {
    if (!request?.status) return [];
    
    // If request is CLOSED, only admins can reopen it
    if (request.status === 'CLOSED') {
      // Only COMPANY_MANAGER and DEPUTY_MANAGER can reopen
      const canReopen = hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER]);
      if (canReopen) {
        // Allow reopening to any valid status
        return ['ASSIGNED', 'UNDER_INSPECTION', 'WAITING_PARTS', 'IN_REPAIR', 'COMPLETED'];
      }
      return [];
    }
    
    // If request is COMPLETED, can only go to CLOSED
    if (request.status === 'COMPLETED') {
      return ['CLOSED'];
    }
    
    // For all other statuses (not COMPLETED and not CLOSED), allow going back to previous statuses
    // This includes: NEW, ASSIGNED, UNDER_INSPECTION, WAITING_PARTS, IN_REPAIR
    const allAvailableStatuses: RequestStatus[] = [
      'ASSIGNED', 
      'UNDER_INSPECTION', 
      'WAITING_PARTS', 
      'IN_REPAIR', 
      'COMPLETED'
    ];
    
    // Return all available statuses except the current one (to avoid selecting same status)
    return allAvailableStatuses.filter(status => status !== request.status);
  }, [request?.status, hasRole]);

  // Combine standard and custom statuses for display
  const allStatusOptions = useMemo(() => {
    const standardStatuses = statusOptions.map(status => ({
      value: status,
      label: REQUEST_STATUS_LABELS[status],
      type: 'standard' as const
    }));

      const customStatusesList = customStatuses
        .filter(status => status.isActive)
        .map(status => ({
          value: status.name,
          label: status.displayName,
          type: 'custom' as const
        }));

    return [...standardStatuses, ...customStatusesList];
  }, [statusOptions, customStatuses]);

  const handleAssign = async () => {
    if (!assignId) return;
    try {
      setLoading(true);
      await requestsAPI.assignTechnician(requestId, Number(assignId));
      setAssignId('');
      await reload();
    } catch (e: any) {
      setError(e.message || t('error.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async () => {
    try {
      setLoading(true);
      await requestsAPI.updateRequestStatus(requestId, { status: statusTo, comment: statusComment || undefined });
      setStatusComment('');
      await reload();
    } catch (e: any) {
      setError(e.message || t('error.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        description: costForm.description,
        amount: costForm.amount,
        costType: costForm.costType,
        currency: costForm.currency,
      };

      if (costForm.sparePartId) {
        payload.sparePartId = Number(costForm.sparePartId);
        payload.quantity = Number(costForm.sparePartQuantity);
      }

      await requestsAPI.addCost(requestId, payload);
      setCostForm({ description: '', amount: 0, costType: 'PARTS', currency: getCurrentCurrency(), sparePartId: '', sparePartQuantity: undefined });
      await reload();
    } catch (e: any) {
      setError(e.message || t('error.failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Single confirmation
    if (!window.confirm('هل أنت متأكد من إغلاق هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }
    
    try {
      setLoading(true);
      await requestsAPI.closeRequest(requestId, closeForm);
      navigate('/requests');
    } catch (e: any) {
      setError(e.message || t('error.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };


  const handleMarkAsReceived = async () => {
    if (!window.confirm('هل أنت متأكد من تأكيد استلام هذا الطلب؟')) return;
    try {
      setLoading(true);
      await requestsAPI.updateRequestStatus(requestId, { 
        status: 'UNDER_INSPECTION', 
        comment: 'تم استلام الطلب من قبل الفني' 
      });
      await reload();
    } catch (e: any) {
      setError(e.message || t('error.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('details.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('details.subtitle')}</p>
        </div>
        <Link to="/requests" className="btn">{t('details.back')}</Link>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {!request ? (
        <div className="card"><div className="card-content py-12 text-center text-gray-500">{loading ? t('requests.loading') : t('requests.empty')}</div></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="card-header">{t('details.overview')}</div>
              <div className="card-content space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">{t('details.number')}:</span> {request.requestNumber}</div>
                  <div><span className="text-gray-500">{t('details.status')}:</span> 
                    <span className="status-display status-gray">
                      {customStatuses.find(s => s.name === request.status)?.displayName || REQUEST_STATUS_LABELS[request.status]}
                    </span>
                  </div>
                  <div><span className="text-gray-500">{t('details.customer')}:</span> {request.customer?.name}</div>
                  <div><span className="text-gray-500">{t('details.department')}:</span> {request.department?.name}</div>
                  <div><span className="text-gray-500">{t('details.technician')}:</span> {request.assignedTechnician ? `${request.assignedTechnician.firstName} ${request.assignedTechnician.lastName}` : '-'}</div>
                  <div><span className="text-gray-500">{t('details.priority')}:</span> {request.priority}</div>
                  <div className="col-span-2"><span className="text-gray-500">{t('details.issue')}:</span> {request.issueDescription}</div>
                </div>
              </div>
      </div>

      <div className="card">
              <div className="card-header">{t('details.activities')}</div>
        <div className="card-content">
                <div className="space-y-3">
                  {/* Show request received info first */}
                  <div className="border-l-4 border-green-200 pl-4 py-2 bg-green-50 rounded">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">تم استلام الطلب</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                          <span className="font-medium">{request.receivedBy.firstName} {request.receivedBy.lastName}</span>
                          <span>(موظف الاستقبال)</span>
                          <span>•</span>
                          <span>{new Date(request.createdAt).toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Show activities */}
                  {request.activities && request.activities.length > 0 ? (
                    request.activities.map(activity => (
                      <div key={activity.id} className="border-l-4 border-blue-200 pl-4 py-2 rounded">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 font-medium">{activity.description}</p>
                            {activity.oldValue && activity.newValue && (
                              <p className="text-xs text-gray-600 mt-1">
                                <span className="text-red-600">من: {activity.oldValue}</span>
                                {' → '}
                                <span className="text-green-600">إلى: {activity.newValue}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                              <span className="font-medium">{activity.user.firstName} {activity.user.lastName}</span>
                              <span>({activity.user.role?.replace('_', ' ') || 'Unknown Role'})</span>
                              <span>•</span>
                              <span>{new Date(activity.createdAt).toLocaleString('ar-EG')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm">{t('details.activities.empty')}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>{t('details.costs') || 'التكاليف'}</h3>
                <p>إضافة وإدارة تكاليف الطلب</p>
              </div>
              <div className="card-content space-y-6">
                {/* Only show cost form if request is not completed or if user is manager or technician */}
                {(!['COMPLETED', 'CLOSED'].includes(request?.status || '') || hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.TECHNICIAN])) && (
                  <form className="space-y-4" onSubmit={handleAddCost}>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="costDescription">وصف التكلفة</label>
                    <input 
                      id="costDescription"
                      className="input-field" 
                      placeholder="مثال: قطع غيار، عمالة..." 
                      value={costForm.description} 
                      onChange={(e)=>setCostForm(f=>({...f, description: e.target.value}))} 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label required" htmlFor="costAmount">المبلغ ({getCurrencySymbolHook()})</label>
                      <input 
                        id="costAmount"
                        className="input-field no-spinner" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={costForm.amount || ''} 
                        onChange={(e)=>setCostForm(f=>({...f, amount: Number(e.target.value) || 0}))} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" id="costType-label" htmlFor="costType">نوع التكلفة</label>
                      <select 
                        id="costType" 
                        className="select-field" 
                        value={costForm.costType} 
                        onChange={(e)=>setCostForm(f=>({...f, costType: e.target.value as CostType}))} 
                        aria-labelledby="costType-label"
                      >
                        <option value="PARTS">قطع غيار</option>
                        <option value="LABOR">عمالة</option>
                        <option value="TRANSPORTATION">مواصلات</option>
                        <option value="OTHER">أخرى</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="sparePart">اختيار قطعة الغيار (اختياري)</label>
                    <select
                      id="sparePart"
                      className="select-field"
                      value={costForm.sparePartId || ''}
                      onChange={(e) => setCostForm(f => ({ ...f, sparePartId: e.target.value, sparePartQuantity: undefined }))}
                      disabled={loadingSpareParts}
                    >
                      <option value="">بدون قطع غيار</option>
                      {spareParts.map(part => (
                        <option key={part.id} value={part.id}>
                          {part.name} (المتوفر: {part.presentPieces} - {formatCurrency(part.unitPrice, part.currency as any)}/وحدة)
                        </option>
                      ))}
                    </select>
                    {loadingSpareParts && (
                      <p className="text-xs text-gray-500 mt-1">جاري تحميل قطع الغيار...</p>
                    )}
                  </div>

                  {costForm.sparePartId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label required" htmlFor="spareQuantity">الكمية المطلوبة</label>
                        <input
                          id="spareQuantity"
                          className="input-field no-spinner"
                          type="number"
                          min={1}
                          max={(() => {
                            const part = spareParts.find(p => String(p.id) === String(costForm.sparePartId));
                            return part ? part.presentPieces : undefined;
                          })()}
                          value={costForm.sparePartQuantity || ''}
                          onChange={(e) => setCostForm(f => ({ ...f, sparePartQuantity: Number(e.target.value) || 0 }))}
                          required
                        />
                        {(() => {
                          const part = spareParts.find(p => String(p.id) === String(costForm.sparePartId));
                          return part && (
                            <p className="text-xs text-gray-500 mt-1">
                              الحد الأقصى المتاح: {part.presentPieces} قطعة
                            </p>
                          );
                        })()}
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="amountSuggestion">القيمة المقترحة</label>
                        <input
                          id="amountSuggestion"
                          className="input-field bg-gray-50 no-spinner"
                          type="number"
                          value={(() => {
                            const part = spareParts.find(p => String(p.id) === String(costForm.sparePartId));
                            if (!part || !costForm.sparePartQuantity) return '';
                            return part.unitPrice ? Number(part.unitPrice * costForm.sparePartQuantity).toFixed(2) : '';
                          })()}
                          readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">يمكنك تعديل المبلغ النهائي يدوياً إذا لزم الأمر.</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      className="btn-primary flex-1 flex items-center justify-center" 
                      type="submit" 
                      disabled={loading || !costForm.description || costForm.amount <= 0}
                    >
                      {loading ? (
                        <div className="loading-spinner ml-2"></div>
                      ) : (
                        <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                        </svg>
                      )}
                      {t('details.costs.add') || 'إضافة تكلفة'}
                    </button>
                    <button 
                      type="button"
                      className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center"
                      onClick={() => setShowSparePartsModal(true)}
                    >
                      <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                      </svg>
                      إضافة قطع غيار
                    </button>
                    {user?.role === UserRole.TECHNICIAN && (
                      <>
                        <button 
                          type="button"
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center"
                          onClick={() => setShowRequestSparePartModal(true)}
                        >
                          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                          </svg>
                          طلب قطع غيار جديدة
                        </button>
                        <button 
                          type="button"
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                          onClick={() => setShowAddReportModal(true)}
                        >
                          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                          </svg>
                          إضافة تقرير
                        </button>
                      </>
                    )}
                  </div>
                </form>
                )}
                
                <div className="border-t border-gray-200 pt-6 space-y-6">
                  {/* Spare Parts Used Section */}
                  {request.requestParts && request.requestParts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <svg className="w-4 h-4 ml-2 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                        </svg>
                        قطع الغيار المستخدمة
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {request.requestParts.map(part => (
                          <div key={part.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-amber-900">{part.sparePart.name}</p>
                                <p className="text-xs text-amber-700">عدد القطع الموجودة: {part.sparePart.partNumber}</p>
                                <div className="flex items-center mt-2 text-xs">
                                  <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                    الكمية: {part.quantityUsed}
                                  </span>
                                  <span className="mr-2 text-amber-700">
                                    {formatCurrency(part.unitPrice, part.sparePart.currency as any)} / وحدة
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-amber-900">
                                  {formatCurrency(part.totalCost, part.sparePart.currency as any)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Costs Section */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 ml-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                      </svg>
                      إجمالي التكاليف
                    </h4>
                    <div className="space-y-3">
                      {request.costs && request.costs.length > 0 ? request.costs.map(c => (
                        <div key={c.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{c.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {c.costType === 'PARTS' ? 'قطع غيار' : c.costType === 'LABOR' ? 'عمالة' : c.costType === 'TRANSPORTATION' ? 'مواصلات' : 'أخرى'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(c.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">{formatCurrency(c.amount, c.currency as any)}</p>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                          </svg>
                          <p className="text-sm font-medium">لا توجد تكاليف مضافة بعد</p>
                          <p className="text-xs text-gray-400 mt-1">سيتم عرض جميع التكاليف المضافة للطلب هنا</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technician Reports Section */}
            <div className="card">
              <div className="card-header">
                <h3>تقارير الفنيين</h3>
                <p>تقارير وتحديثات الفنيين حول هذا الطلب</p>
              </div>
              <div className="card-content">
                <TechnicianReportsSection
                  reports={request.technicianReports || []}
                  requestId={requestId}
                  onReportsUpdated={reload}
                />
              </div>
            </div>

          </div>

          {/* Right: actions */}
          <div className="space-y-6">
            {hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]) && (
              <div className="card">
                <div className="card-header">
                  <h3>{t('details.assign') || 'تعيين فني'}</h3>
                  <p>اختر الفني المناسب لهذا الطلب</p>
                </div>
                <div className="card-content space-y-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="assignTechnician">الفني المختص</label>
                    <select id="assignTechnician" className="select-field" value={assignId} onChange={(e)=>setAssignId(e.target.value)}>
                      <option value="">اختر الفني...</option>
                      {technicians.map(ti => (
                        <option key={ti.id} value={ti.id}>{ti.firstName} {ti.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-primary w-full" disabled={!assignId || loading} onClick={handleAssign}>
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    {t('details.assign') || 'تعيين الفني'}
                  </button>
                </div>
              </div>
            )}

            {/* Technician-specific: Mark as Received */}
            {user?.role === UserRole.TECHNICIAN && request?.status === 'ASSIGNED' && (
              <div className="card border-blue-200">
                <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="text-blue-800">تأكيد استلام الطلب</h3>
                  <p className="text-blue-600">قم بتأكيد استلامك لهذا الطلب لبدء العمل عليه</p>
                </div>
                <div className="card-content">
                  <button 
                    className="btn-primary w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={handleMarkAsReceived}
                    disabled={loading}
                  >
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    تأكيد استلام الطلب
                  </button>
                </div>
              </div>
            )}

            {/* Only show status update if request is not closed, not completed, has available status options, and user has permission */}
            {/* Only admin and supervisor roles can change status */}
            {request?.status !== 'CLOSED' && request?.status !== 'COMPLETED' && allStatusOptions.length > 0 && 
             (hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR])) && (
              <div className="card">
                <div className="card-header">
                  <h3>{t('details.updateStatus') || 'تحديث الحالة'}</h3>
                  <p>قم بتغيير حالة الطلب وإضافة ملاحظات</p>
                </div>
                <div className="card-content space-y-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="statusTo">الحالة الجديدة</label>
                    <select id="statusTo" className="select-field" value={statusTo} onChange={(e)=>setStatusTo(e.target.value as RequestStatus)}>
                      <option value="">اختر الحالة الجديدة...</option>
                      {allStatusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ملاحظات (اختياري)</label>
                    <textarea className="textarea-field" rows={3} placeholder="أضف أي ملاحظات حول تحديث الحالة..." value={statusComment} onChange={(e)=>setStatusComment(e.target.value)} />
                  </div>
                  <button className="btn-primary w-full" onClick={handleStatus} disabled={loading || !statusTo}>
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    {t('common.update') || 'تحديث الحالة'}
                  </button>
                </div>
              </div>
            )}

            {/* Show message for technicians that they cannot change status */}
            {request?.status !== 'CLOSED' && request?.status !== 'COMPLETED' && 
             user?.role === UserRole.TECHNICIAN && (
              <div className="card border-yellow-200 bg-yellow-50">
                <div className="card-header">
                  <h3 className="text-yellow-800">تحديث الحالة</h3>
                  <p className="text-yellow-700">يمكن للمديرين والمشرفين فقط تغيير حالة الطلب</p>
                </div>
                <div className="card-content">
                  <p className="text-sm text-yellow-700">
                    كفني، يمكنك إضافة التكاليف والملاحظات، ولكن لا يمكنك تغيير حالة الطلب. 
                    يرجى التواصل مع المشرف أو المدير لتغيير الحالة.
                  </p>
                </div>
              </div>
            )}

            {/* Show read-only message for closed requests */}
            {request?.status === 'CLOSED' && (
              <div className="card border-gray-200">
                <div className="card-header bg-gray-50">
                  <h3 className="text-gray-600">طلب مغلق نهائياً</h3>
                  <p className="text-gray-500">لا يمكن تعديل حالة هذا الطلب لأنه مغلق نهائياً</p>
                </div>
                <div className="card-content">
                  <p className="text-sm text-gray-600">
                    هذا الطلب في حالة "مغلق" ولا يمكن تغيير حالته إلى أي حالة أخرى. 
                    الطلبات المغلقة تعتبر مكتملة نهائياً.
                  </p>
                </div>
              </div>
            )}

            {/* Show status update for COMPLETED requests for admins and supervisors */}
            {request.status === 'COMPLETED' && hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]) && (
              <div className="card border-green-200">
                <div className="card-header bg-gradient-to-r from-green-50 to-emerald-50">
                  <h3 className="text-green-800">تحديث حالة الطلب</h3>
                  <p className="text-green-600">الطلب مكتمل - يمكن إغلاقه نهائياً</p>
                </div>
                <div className="card-content space-y-4">
                  <div className="form-group">
                    <label className="form-label">ملاحظات (اختياري)</label>
                    <textarea className="textarea-field" rows={3} placeholder="أضف أي ملاحظات حول إغلاق الطلب..." value={statusComment} onChange={(e)=>setStatusComment(e.target.value)} />
                  </div>
                  <button 
                    className="btn-primary w-full bg-green-600 hover:bg-green-700" 
                    onClick={async () => {
                      if (window.confirm('هل أنت متأكد من إغلاق هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
                        try {
                          setLoading(true);
                          await requestsAPI.updateRequestStatus(requestId, { status: 'CLOSED', comment: statusComment || 'تم الإغلاق' });
                          await reload();
                        } catch (e: any) {
                          setError(e.message || t('error.failedToUpdate'));
                        } finally {
                          setLoading(false);
                        }
                      }
                    }} 
                    disabled={loading}
                  >
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    إغلاق الطلب نهائياً
                  </button>
                </div>
              </div>
            )}

            {/* Reopen closed request - Only for admins */}
            {request.status === 'CLOSED' && hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER]) && (
              <div className="card border-yellow-200">
                <div className="card-header bg-gradient-to-r from-yellow-50 to-amber-50">
                  <h3 className="text-yellow-800">إعادة فتح الطلب</h3>
                  <p className="text-yellow-600">يمكن للمدراء فقط إعادة فتح الطلبات المغلقة</p>
                </div>
                <div className="card-content space-y-4">
                  <div className="form-group">
                    <label className="form-label">الحالة الجديدة</label>
                    <select 
                      className="select-field" 
                      value={statusTo} 
                      onChange={(e) => setStatusTo(e.target.value as RequestStatus)}
                      aria-label="اختر الحالة الجديدة للطلب"
                    >
                      <option value="">اختر الحالة...</option>
                      {allStatusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">سبب إعادة الفتح</label>
                    <textarea 
                      className="textarea-field" 
                      rows={3} 
                      placeholder="اذكر سبب إعادة فتح الطلب..." 
                      value={statusComment} 
                      onChange={(e) => setStatusComment(e.target.value)}
                      required
                    />
                  </div>
                  <button 
                    className="btn-primary w-full bg-yellow-600 hover:bg-yellow-700" 
                    onClick={() => {
                      if (!statusTo) {
                        alert('الرجاء اختيار الحالة الجديدة');
                        return;
                      }
                      if (!statusComment.trim()) {
                        alert('الرجاء إدخال سبب إعادة الفتح');
                        return;
                      }
                      if (window.confirm('هل أنت متأكد من إعادة فتح هذا الطلب المغلق؟')) {
                        handleStatus();
                      }
                    }} 
                    disabled={loading || !statusTo}
                  >
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    إعادة فتح الطلب
                  </button>
                </div>
              </div>
            )}

            {/* Show close request form only for technicians when request is COMPLETED */}
            {request.status === 'COMPLETED' && user?.role === UserRole.TECHNICIAN && (
              <div className="card border-green-200">
                <div className="card-header bg-gradient-to-r from-green-50 to-emerald-50">
                  <h3 className="text-green-800">{t('details.close') || 'إغلاق الطلب'}</h3>
                  <p className="text-green-600">إنهاء الطلب وتقييم رضا العميل</p>
                </div>
                <form className="card-content space-y-4" onSubmit={handleClose}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="finalNotes">الملاحظات النهائية</label>
                    <textarea id="finalNotes" className="textarea-field" rows={4} placeholder="أضف أي ملاحظات نهائية حول الطلب..." value={closeForm.finalNotes || ''} onChange={(e)=>setCloseForm(f=>({...f, finalNotes: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="customerSatisfaction">تقييم رضا العميل</label>
                    <select id="customerSatisfaction" className="select-field" value={closeForm.customerSatisfaction || ''} onChange={(e)=>setCloseForm(f=>({...f, customerSatisfaction: e.target.value ? Number(e.target.value) : undefined}))}>
                      <option value="">اختر التقييم...</option>
                      <option value="5">ممتاز (5 نجوم)</option>
                      <option value="4">جيد جداً (4 نجوم)</option>
                      <option value="3">جيد (3 نجوم)</option>
                      <option value="2">مقبول (2 نجمة)</option>
                      <option value="1">ضعيف (1 نجمة)</option>
                    </select>
                  </div>
                  <button className="btn-primary w-full bg-green-600 hover:bg-green-700" type="submit" disabled={loading}>
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    {t('common.close') || 'إغلاق الطلب نهائياً'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Spare Parts Modal */}
      <AddPartToRequestModal
        isOpen={showSparePartsModal}
        onClose={() => setShowSparePartsModal(false)}
        requestId={requestId}
        onPartAdded={() => {
          setShowSparePartsModal(false);
          reload(); // Refresh the request to show new parts
        }}
      />

      {/* Request New Spare Part Modal */}
      <RequestSparePartModal
        isOpen={showRequestSparePartModal}
        onClose={() => setShowRequestSparePartModal(false)}
        requestId={requestId}
        onRequestCreated={() => {
          setShowRequestSparePartModal(false);
          reload(); // Refresh the request to show new parts
        }}
      />

      {/* Add Report Modal */}
      <AddReportModal
        isOpen={showAddReportModal}
        onClose={() => setShowAddReportModal(false)}
        requestId={requestId}
        onReportCreated={() => {
          setShowAddReportModal(false);
          reload(); // Refresh the request to show new reports
        }}
      />
    </div>
  );
};

export default RequestDetailsPage;
