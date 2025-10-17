import React, { useState, useEffect, useCallback } from 'react';
// import { useI18n } from '../../contexts/I18nContext'; // Will be used for future translations
import { useAuth } from '../../contexts/AuthContext';
import { sparePartRequestsAPI } from '../../services/api';
import { SparePartRequest, SparePartRequestFilters, SPARE_PART_REQUEST_STATUS_LABELS, SPARE_PART_REQUEST_URGENCY_LABELS, UserRole } from '../../types';

const SparePartRequestsPage: React.FC = () => {
  // const { t } = useI18n(); // Will be used for future translations
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sparePartRequests, setSparePartRequests] = useState<SparePartRequest[]>([]);
  const [filters, setFilters] = useState<SparePartRequestFilters>({
    page: 1,
    limit: 20,
    status: 'PENDING'
  });
  const [selectedRequest, setSelectedRequest] = useState<SparePartRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadSparePartRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sparePartRequestsAPI.getSparePartRequests(filters);
      setSparePartRequests(response.data?.sparePartRequests || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load spare part requests');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSparePartRequests();
  }, [loadSparePartRequests]);

  const handleApprove = async (request: SparePartRequest) => {
    try {
      setLoading(true);
      await sparePartRequestsAPI.approveSparePartRequest(request.id);
      await loadSparePartRequests();
      setShowApprovalModal(false);
      setSelectedRequest(null);
    } catch (e: any) {
      setError(e.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    try {
      setLoading(true);
      await sparePartRequestsAPI.rejectSparePartRequest(selectedRequest.id, rejectionReason);
      await loadSparePartRequests();
      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (e: any) {
      setError(e.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'FULFILLED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if user can manage spare part requests
  const canManage = hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]);

  if (!canManage) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Spare Part Requests</h1>
          <p className="mt-2 text-sm text-gray-700">Manage spare part requests from technicians</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FULFILLED">Fulfilled</option>
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
              onClick={loadSparePartRequests}
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

      {/* Requests List */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="p-8 text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading spare part requests...</p>
          </div>
        ) : sparePartRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No spare part requests found
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
                    Part Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgency
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
                {sparePartRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{request.request.requestNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.request.customer?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {request.partName}
                      </div>
                      {request.partNumber && (
                        <div className="text-sm text-gray-500">
                          Part #: {request.partNumber}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Qty: {request.quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.technician.firstName} {request.technician.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {SPARE_PART_REQUEST_STATUS_LABELS[request.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(request.urgency)}`}>
                        {SPARE_PART_REQUEST_URGENCY_LABELS[request.urgency]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApprovalModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectionModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <div className="text-xs text-red-600">
                          Reason: {request.rejectionReason}
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
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Approve Spare Part Request</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to approve the request for <strong>{selectedRequest.partName}</strong> 
              (Qty: {selectedRequest.quantity}) by {selectedRequest.technician.firstName} {selectedRequest.technician.lastName}?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedRequest)}
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
      {showRejectionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Spare Part Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting the request for <strong>{selectedRequest.partName}</strong>.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
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

export default SparePartRequestsPage;
