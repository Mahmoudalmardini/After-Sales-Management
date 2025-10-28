import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { requestsAPI, departmentsAPI, usersAPI, statusAPI } from '../../services/api';
import { Request, RequestFilters, RequestPriority, RequestStatus, REQUEST_STATUS_LABELS, PRIORITY_LABELS, WarrantyStatus, Department, User, CustomRequestStatus, UserRole } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';

const RequestsPage: React.FC = () => {
  const { t, lang } = useI18n();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState<number>(Number(searchParams.get('limit')) || 10);

  const [status, setStatus] = useState<RequestStatus | ''>((searchParams.get('status') as RequestStatus) || '');
  const [priority, setPriority] = useState<RequestPriority | ''>((searchParams.get('priority') as RequestPriority) || '');
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus | ''>((searchParams.get('warrantyStatus') as WarrantyStatus) || '');
  const [departmentId, setDepartmentId] = useState<string>(searchParams.get('departmentId') || '');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>(searchParams.get('assignedTechnicianId') || '');
  const [isOverdue, setIsOverdue] = useState<boolean>(searchParams.get('isOverdue') === 'true');
  const [completion, setCompletion] = useState<string>(searchParams.get('completion') || '');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [customStatuses, setCustomStatuses] = useState<CustomRequestStatus[]>([]);

  const params: RequestFilters = useMemo(() => ({
    page,
    limit,
    status: status || undefined,
    priority: priority || undefined,
    warrantyStatus: warrantyStatus || undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
    assignedTechnicianId: assignedTechnicianId ? Number(assignedTechnicianId) : undefined,
    isOverdue: isOverdue || undefined,
    search: search ? search.trim() : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [page, limit, status, priority, warrantyStatus, departmentId, assignedTechnicianId, isOverdue, search]);

  useEffect(() => {
    const sp: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) sp.status = status;
    if (priority) sp.priority = priority;
    if (warrantyStatus) sp.warrantyStatus = warrantyStatus;
    if (departmentId) sp.departmentId = departmentId;
    if (assignedTechnicianId) sp.assignedTechnicianId = assignedTechnicianId;
    if (isOverdue) sp.isOverdue = 'true';
    if (completion) sp.completion = completion;
    if (search) sp.search = search;
    setSearchParams(sp, { replace: true });
  }, [page, limit, status, priority, warrantyStatus, departmentId, assignedTechnicianId, isOverdue, completion, search, setSearchParams]);

  // Load departments and technicians
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [deptResp, techResp] = await Promise.all([
          departmentsAPI.getDepartments(),
          usersAPI.getUsers({ role: UserRole.TECHNICIAN }),
        ]);
        setDepartments(deptResp.data?.departments || []);
        setTechnicians(techResp.data?.users || []);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    loadOptions();
  }, [t]);

  // Load custom statuses
  useEffect(() => {
    const loadCustomStatuses = async () => {
      try {
        const response = await statusAPI.getCustomStatuses();
        setCustomStatuses(response.statuses);
      } catch (error) {
        console.error('Failed to load custom statuses:', error);
      }
    };
    loadCustomStatuses();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await requestsAPI.getRequests(params as any);
        const fetchedRequests = resp?.data?.requests || [];
        setRequests(fetchedRequests);
        setTotal(resp?.meta?.total || 0);
      } catch (e: any) {
        setError(e.message || t('error.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params, t]);

  // Helper function to get status display info
  const getStatusDisplay = (status: RequestStatus) => {
    const customStatus = customStatuses.find(s => s.name === status);
    if (customStatus) {
      return {
        label: customStatus.displayName
      };
    }
    
    return {
      label: REQUEST_STATUS_LABELS[status]
    };
  };

  const filteredRequests = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const matchesCompletion = (s: RequestStatus) => {
      if (completion === 'COMPLETED') return s === 'COMPLETED' || s === 'CLOSED';
      if (completion === 'INCOMPLETE') return s !== 'COMPLETED' && s !== 'CLOSED';
      return true;
    };

    const base = requests.filter(r => matchesCompletion(r.status));

    if (!searchValue) {
      return base;
    }

    return base.filter((requestItem) => {
      const requestNumber = requestItem.requestNumber?.toLowerCase() || '';
      const issueDescription = requestItem.issueDescription?.toLowerCase() || '';
      const customerName = requestItem.customer?.name?.toLowerCase() || '';
      const customerPhone = requestItem.customer?.phone?.toLowerCase() || '';
      const productName = requestItem.product?.name?.toLowerCase() || '';

      return (
        requestNumber.includes(searchValue) ||
        issueDescription.includes(searchValue) ||
        customerName.includes(searchValue) ||
        customerPhone.includes(searchValue) ||
        productName.includes(searchValue)
      );
    });
  }, [requests, search, completion]);

  const filteredTotal = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('requests.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('requests.subtitle')}</p>
        </div>
        {hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]) && (
          <Link to="/requests/new" className="btn-primary">{t('requests.new')}</Link>
        )}
      </div>

      <div className="card shadow-medium">
        <div className="card-header">
          <h2>{t('requests.section.allRequests')}</h2>
          <p>{t('requests.section.filters')}</p>
        </div>
        <div className="card-content space-y-6">
          {/* Search Bar */}
          <div className="form-group">
            <label className="form-label">{t('requests.search.label')}</label>
            <input
              value={search}
              placeholder={t('requests.search.placeholder')}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setPage(1);
                  setSearch('');
                }
              }}
              className="input-field"
            />
            <div className="text-xs text-gray-500 mt-1">
              {t('requests.search.resetHint')}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="status-filter">{t('requests.filters.status')}</label>
              <select id="status-filter" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as any); }} className="select-field">
                <option value="">{t('requests.filters.status.all')}</option>
                {Object.keys(REQUEST_STATUS_LABELS).map((key) => (
                  <option key={key} value={key}>{REQUEST_STATUS_LABELS[key as RequestStatus]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="priority-filter">{t('requests.filters.priority')}</label>
              <select id="priority-filter" value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value as any); }} className="select-field">
                <option value="">{t('requests.filters.priority.all')}</option>
                {Object.keys(PRIORITY_LABELS).map((key) => (
                  <option key={key} value={key}>{PRIORITY_LABELS[key as RequestPriority]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="warranty-filter">{t('requests.filters.warranty')}</label>
              <select id="warranty-filter" value={warrantyStatus} onChange={(e) => { setPage(1); setWarrantyStatus(e.target.value as any); }} className="select-field">
                <option value="">{t('requests.filters.warranty.all')}</option>
                <option value="UNDER_WARRANTY">{lang === 'ar' ? 'ضمن الكفالة' : 'Under warranty'}</option>
                <option value="OUT_OF_WARRANTY">{lang === 'ar' ? 'خارج الكفالة' : 'Out of warranty'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="completion-filter">{lang === 'ar' ? 'حالة الإكمال' : 'Completion'}</label>
              <select id="completion-filter" value={completion} onChange={(e) => { setPage(1); setCompletion(e.target.value); }} className="select-field">
                <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
                <option value="INCOMPLETE">{lang === 'ar' ? 'غير مُكتمل' : 'Incomplete'}</option>
                <option value="COMPLETED">{lang === 'ar' ? 'مُكتمل' : 'Completed'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="department-filter">{t('requests.filters.department')}</label>
              <select id="department-filter" value={departmentId} onChange={(e) => { setPage(1); setDepartmentId(e.target.value); }} className="select-field">
                <option value="">{t('requests.filters.department.all')}</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="technician-filter">{t('requests.filters.technician')}</label>
              <select id="technician-filter" value={assignedTechnicianId} onChange={(e) => { setPage(1); setAssignedTechnicianId(e.target.value); }} className="select-field">
                <option value="">{t('requests.filters.technician.all')}</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="limit-filter">{t('requests.filters.limit')}</label>
              <select id="limit-filter" value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="select-field">
                {[10, 20, 50].map((count) => (
                  <option key={count} value={count}>{t('requests.filters.limit.option', { count })}</option>
                ))}
              </select>
            </div>

            <div className="form-group flex items-end">
              <label className="flex items-center space-x-2 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                <input
                  type="checkbox"
                  checked={isOverdue}
                  onChange={(e) => { setPage(1); setIsOverdue(e.target.checked); }}
                  className="rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-red-700 font-medium">{t('requests.filters.overdueOnly')}</span>
              </label>
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-blue-800">
                <span className="font-semibold">{t('requests.summary.total', { count: total })}</span>
                {requests.filter(r => r.isOverdue).length > 0 && (
                  <span className="mr-4 text-red-600">
                    {t('requests.summary.separator')} <span className="font-semibold">{t('requests.summary.overdue', { count: requests.filter(r => r.isOverdue).length })}</span>
                  </span>
                )}
              </div>
              {loading && <div className="loading-spinner"></div>}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {/* Requests Cards/Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p className="text-gray-500">جاري تحميل الطلبات...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات</h3>
              <p className="text-gray-500 mb-4">لم يتم العثور على طلبات تطابق المعايير المحددة</p>
              <Link to="/requests/new" className="btn-primary">إنشاء طلب جديد</Link>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">رقم الطلب</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">العميل</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">القسم</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الفني</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الحالة</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الأولوية</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRequests.map(req => (
                      <tr 
                        key={req.id} 
                        className={`cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-md ${req.isOverdue ? 'bg-red-50 border-l-4 border-red-400' : ''}`}
                        onClick={() => navigate(`/requests/${req.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-blue-600">{req.requestNumber}</div>
                          {req.isOverdue && <div className="text-xs text-red-600 font-medium">متأخر</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{req.customer?.name}</div>
                          <div className="text-sm text-gray-500">{req.customer?.phone}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{req.department?.name}</td>
                        <td className="px-6 py-4">
                          {req.assignedTechnician ? (
                            <div className="text-gray-900">{req.assignedTechnician.firstName} {req.assignedTechnician.lastName}</div>
                          ) : (
                            <div className="text-gray-400 italic">{lang === 'ar' ? 'غير مُعيّن' : 'Unassigned'}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const statusDisplay = getStatusDisplay(req.status);
                            return (
                              <span className="table-status-display status-gray">
                                {statusDisplay.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            req.priority === 'LOW' ? 'bg-green-100 text-green-700' :
                            req.priority === 'NORMAL' ? 'bg-blue-100 text-blue-700' :
                            req.priority === 'HIGH' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {PRIORITY_LABELS[req.priority]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(req.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredRequests.map(req => (
                  <Link
                    key={req.id}
                    to={`/requests/${req.id}`}
                    className={`block p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      req.isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-blue-600">{req.requestNumber}</div>
                        <div className="text-sm text-gray-600">{req.customer?.name}</div>
                      </div>
                      <div className="text-left">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          req.status === 'NEW' ? 'bg-gray-100 text-gray-800' :
                          req.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                          req.status === 'UNDER_INSPECTION' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === 'WAITING_PARTS' ? 'bg-orange-100 text-orange-800' :
                          req.status === 'IN_REPAIR' ? 'bg-purple-100 text-purple-800' :
                          req.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {REQUEST_STATUS_LABELS[req.status]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div>{req.department?.name}</div>
                      <div>{new Date(req.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</div>
                    </div>
                    {req.isOverdue && (
                      <div className="mt-2 text-xs text-red-600 font-medium">⚠️ طلب متأخر</div>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  صفحة <span className="font-semibold">{page}</span> من <span className="font-semibold">{totalPages}</span>
                  {' '}• إجمالي <span className="font-semibold">{total}</span> طلب
                </div>
                <div className="flex gap-2">
                  <button 
                    className="btn-secondary" 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    ← السابق
                  </button>
                  <div className="hidden sm:flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            pageNum === page 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    className="btn-secondary" 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    التالي →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsPage;
