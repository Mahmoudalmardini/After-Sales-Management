import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { technicianReportsAPI, usersAPI } from '../../services/api';
import { TechnicianReport, UserRole } from '../../types';

const TechnicianReportsPage: React.FC = () => {
  console.log('🚀 TechnicianReportsPage component rendering...');
  const { t } = useI18n();
  const { hasRole, user } = useAuth();
  console.log('👤 Current user:', user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<TechnicianReport[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'all',
    requestId: undefined as number | undefined,
    technicianId: undefined as number | undefined
  });
  const [selectedReport, setSelectedReport] = useState<TechnicianReport | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');

  const loadTechnicians = useCallback(async () => {
    try {
      console.log('🔍 Loading technicians...');
      const response = await usersAPI.getUsers({ role: 'TECHNICIAN' });
      console.log('📊 Technicians response:', response);
      setTechnicians(response.data || []);
    } catch (e: any) {
      console.error('❌ Failed to load technicians:', e);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert status filter to isApproved boolean
      let isApproved: boolean | undefined;
      if (filters.status === 'approved') isApproved = true;
      else if (filters.status === 'rejected') isApproved = false;
      else if (filters.status === 'pending') isApproved = undefined;
      
      const apiFilters = {
        ...filters,
        isApproved,
        status: undefined // Remove status as we're using isApproved
      };
      
      console.log('🔍 Loading technician reports with filters:', apiFilters);
      const response = await technicianReportsAPI.getTechnicianReports(apiFilters);
      console.log('📊 API Response:', response);
      console.log('📊 Response data:', (response as any)?.data);
      
      setReports((response as any)?.data || []);
    } catch (e: any) {
      console.error('❌ Error loading technician reports:', e);
      setError(e.message || 'Failed to load technician reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    console.log('🔄 useEffect triggered - loading data...');
    loadTechnicians();
    loadReports();
  }, [loadTechnicians, loadReports]);

  const handleApprove = async (report: TechnicianReport) => {
    try {
      setLoading(true);
      await technicianReportsAPI.approveTechnicianReport(report.id, approvalComment);
      await loadReports();
      setShowApprovalModal(false);
      setSelectedReport(null);
      setApprovalComment('');
    } catch (e: any) {
      setError(e.message || 'Failed to approve report');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !approvalComment.trim()) return;

    try {
      setLoading(true);
      await technicianReportsAPI.rejectTechnicianReport(selectedReport.id, approvalComment);
      await loadReports();
      setShowRejectionModal(false);
      setSelectedReport(null);
      setApprovalComment('');
    } catch (e: any) {
      setError(e.message || 'Failed to reject report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isApproved: boolean | null | undefined) => {
    if (isApproved === null || isApproved === undefined) return 'bg-yellow-100 text-yellow-800';
    if (isApproved === true) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusText = (isApproved: boolean | null | undefined) => {
    if (isApproved === null || isApproved === undefined) return 'Pending';
    if (isApproved === true) return 'Approved';
    return 'Rejected';
  };

  // Check if user can manage technician reports
  const canManage = hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]);
  
  console.log('🔐 User role check - canManage:', canManage);
  console.log('🔐 User roles:', [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]);

  if (!canManage) {
    console.log('❌ Access denied - user does not have required role');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('technicianReports.title') || 'Technician Reports'}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('technicianReports.subtitle') || 'View and manage reports from technicians'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Reports</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              value={filters.technicianId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, technicianId: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Technicians</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request ID</label>
            <input
              type="number"
              value={filters.requestId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, requestId: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter request ID"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadReports}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="p-8 text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading technician reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No technician reports found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{report.request?.requestNumber || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.request?.customerName || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.technician?.firstName} {report.technician?.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {report.reportContent}
                      </div>
                      {report.currentStatus && (
                        <div className="text-sm text-gray-500">
                          Status: {report.currentStatus}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.isApproved)}`}>
                        {getStatusText(report.isApproved)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {report.isApproved === null && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowApprovalModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowRejectionModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {report.isApproved === false && report.approvalComment && (
                        <div className="text-xs text-red-600">
                          Reason: {report.approvalComment}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Approve Technician Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to approve the report from {selectedReport.technician?.firstName} {selectedReport.technician?.lastName}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Comment (Optional)</label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a comment about the approval..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalComment('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedReport)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Technician Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting the report from {selectedReport.technician?.firstName} {selectedReport.technician?.lastName}.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter rejection reason..."
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setApprovalComment('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !approvalComment.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianReportsPage;
