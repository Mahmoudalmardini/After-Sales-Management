import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { requestsAPI, usersAPI, statusAPI, requestPartsAPI } from '../../services/api';
import { AddCostForm, CloseRequestForm, CostType, Request, RequestStatus, REQUEST_STATUS_LABELS, CustomRequestStatus, UserRole, RequestPart } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, getCurrentCurrency } from '../../utils/currency';
import { useCurrency } from '../../hooks/useCurrency';

interface CostFormState extends AddCostForm {}

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
const [costForm, setCostForm] = useState<CostFormState>({ description: '', amount: 0, costType: 'PARTS', currency: getCurrentCurrency() });
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loadingSpareParts, setLoadingSpareParts] = useState(false);
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
    
    // If request is CLOSED, no status changes allowed
    if (request.status === 'CLOSED') {
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
  }, [request?.status]);

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

    // If spare part selected, use dedicated request parts API first
    if (costForm.sparePartId) {
      await requestPartsAPI.addPartToRequest({
        requestId,
        sparePartId: Number(costForm.sparePartId),
        quantityUsed: Number(costForm.quantity) || 1,
        addedById: user?.id,
      });

      setCostForm({ description: '', amount: 0, costType: 'PARTS', currency: getCurrentCurrency() });
      await reload();
      return;
    }

    const payload = {
      description: costForm.description,
      amount: costForm.amount,
      costType: costForm.costType,
      currency: costForm.currency,
    };

    await requestsAPI.addCost(requestId, payload);
    setCostForm({ description: '', amount: 0, costType: 'PARTS', currency: getCurrentCurrency() });
    await reload();
  } catch (e: any) {
    setError(e.message || t('error.failedToSave'));
  } finally {
    setLoading(false);
  }
};

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
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
                {/* Only show cost form if request is not completed or if user is manager */}
                {(!['COMPLETED', 'CLOSED'].includes(request?.status || '') || hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER])) && (
                  <form className="space-y-4" onSubmit={handleAddCost}>
                  <div className="form-group">
                    <label className="form-label required">وصف التكلفة</label>
                    <input className="input-field" placeholder="مثال: قطع غيار، عمالة..." value={costForm.description} onChange={(e)=>setCostForm(f=>({...f, description: e.target.value}))} required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label required">المبلغ ({getCurrencySymbolHook()})</label>
                      <input className="input-field" type="number" step="0.01" placeholder="0.00" value={costForm.amount} onChange={(e)=>setCostForm(f=>({...f, amount: Number(e.target.value)}))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" id="costType-label" htmlFor="costType">نوع التكلفة</label>
                      <select id="costType" className="select-field" value={costForm.costType} onChange={(e)=>setCostForm(f=>({...f, costType: e.target.value as CostType}))} aria-labelledby="costType-label">
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
                      value={costForm.sparePartId?.toString() || ''}
                      onChange={(e) => {
                        const part = spareParts.find(p => String(p.id) === e.target.value);
                        setCostForm(f => ({
                          ...f,
                          sparePartId: part ? part.id : undefined,
                          quantity: part ? Math.min(part.quantity, 1) : undefined,
                          amount: part ? part.unitPrice : f.amount,
                        }));
                      }}
                      disabled={loadingSpareParts}
                    >
                      <option value="">بدون قطع غيار</option>
                      {spareParts.map(part => (
                        <option key={part.id} value={part.id}>
                          {part.name} (المتوفر: {part.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  {costForm.sparePartId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label required" htmlFor="spareQuantity">الكمية المطلوبة</label>
                        <input
                          id="spareQuantity"
                          className="input-field"
                          type="number"
                          min={1}
                          max={(() => {
                            const part = spareParts.find(p => p.id === costForm.sparePartId);
                            return part ? part.quantity : undefined;
                          })()}
                          value={costForm.quantity ?? ''}
                          onChange={(e) => setCostForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="amountSuggestion">القيمة المقترحة</label>
                        <input
                          id="amountSuggestion"
                          className="input-field bg-gray-50"
                          type="number"
                          value={(() => {
                            const part = spareParts.find(p => p.id === costForm.sparePartId);
                            if (!part || !costForm.quantity) return '';
                            const suggested = part.unitPrice ? Number(part.unitPrice * costForm.quantity).toFixed(2) : '';
                            return suggested;
                          })()}
                          onFocus={() => {
                            const part = spareParts.find(p => p.id === costForm.sparePartId);
                            if (part && costForm.quantity) {
                              setCostForm(f => ({ ...f, amount: part.unitPrice * costForm.quantity! }));
                            }
                          }}
                          readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">يمكنك تعديل المبلغ النهائي يدوياً إذا لزم الأمر.</p>
                      </div>
                    </div>
                  )}
                  <button className="btn-primary w-full" type="submit" disabled={loading}>
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    {t('details.costs.add') || 'إضافة تكلفة'}
                  </button>
                </form>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">قائمة التكاليف</h4>
                  <div className="space-y-3">
                    {request.costs && request.costs.length > 0 ? request.costs.map(c => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">{c.description}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {c.costType === 'PARTS' ? 'قطع غيار' : c.costType === 'LABOR' ? 'عمالة' : c.costType === 'TRANSPORTATION' ? 'مواصلات' : 'أخرى'}
                              </span>
                              {c.requestPart && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                  <span className="material-icons text-xs">build</span>
                                  {c.requestPart.sparePart?.name} • كمية {c.requestPart.quantityUsed}
                                </span>
                              )}
                            </div>
                            {c.requestPart && (
                              <p className="text-xs text-gray-400">
                                السعر للوحدة: {formatCurrency(c.requestPart.unitPrice, c.currency as any)}
                              </p>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(c.amount, c.currency as any)}</p>
                            <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('ar-SY')}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>لا توجد تكاليف مضافة بعد</p>
                      </div>
                    )}
                  </div>
                </div>
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
                    <label className="form-label" htmlFor="statusToCompleted">الحالة الجديدة</label>
                    <select id="statusToCompleted" className="select-field" value={statusTo} onChange={(e)=>setStatusTo(e.target.value as RequestStatus)}>
                      <option value="">اختر الحالة الجديدة...</option>
                      <option value="CLOSED">مغلق</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ملاحظات (اختياري)</label>
                    <textarea className="textarea-field" rows={3} placeholder="أضف أي ملاحظات حول إغلاق الطلب..." value={statusComment} onChange={(e)=>setStatusComment(e.target.value)} />
                  </div>
                  <button className="btn-primary w-full bg-green-600 hover:bg-green-700" onClick={handleStatus} disabled={loading || !statusTo}>
                    {loading ? <div className="loading-spinner ml-2"></div> : null}
                    إغلاق الطلب نهائياً
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

    </div>
  );
};

export default RequestDetailsPage;
