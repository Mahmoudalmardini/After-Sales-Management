import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TechnicianReport, UserRole } from '../../types';
import { technicianReportsAPI } from '../../services/api';

interface TechnicianReportsSectionProps {
  reports: TechnicianReport[];
  requestId: number;
  onReportsUpdated: () => void;
}

const TechnicianReportsSection: React.FC<TechnicianReportsSectionProps> = ({
  reports,
  requestId,
  onReportsUpdated,
}) => {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);

  const getStatusColor = (isApproved: boolean | null | undefined) => {
    if (isApproved === null || isApproved === undefined) return 'bg-yellow-100 text-yellow-800';
    if (isApproved) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusText = (isApproved: boolean | null | undefined) => {
    if (isApproved === null || isApproved === undefined) return 'Pending';
    if (isApproved) return 'Approved';
    return 'Rejected';
  };

  const handleApprove = async (reportId: number) => {
    try {
      setLoading(reportId);
      await technicianReportsAPI.approveTechnicianReport(reportId);
      onReportsUpdated();
    } catch (error) {
      console.error('Error approving report:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (reportId: number) => {
    const comment = prompt('Please provide a reason for rejection:');
    if (!comment) return;

    try {
      setLoading(reportId);
      await technicianReportsAPI.rejectTechnicianReport(reportId, comment);
      onReportsUpdated();
    } catch (error) {
      console.error('Error rejecting report:', error);
    } finally {
      setLoading(null);
    }
  };

  const canManage = hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <svg className="w-4 h-4 ml-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
          </svg>
          تقارير الفنيين
        </h4>
      </div>

      {reports && reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-purple-900">
                      {report.technician?.firstName} {report.technician?.lastName}
                    </span>
                    <span className="text-xs text-purple-600">
                      ({report.technician?.username})
                    </span>
                    <span className="text-xs text-gray-500">
                      • {new Date(report.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 mb-2 leading-relaxed">
                    {report.reportContent}
                  </p>

                  {report.currentStatus && (
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">الحالة المحددة:</span> {report.currentStatus}
                    </div>
                  )}

                  {report.partsUsed && (
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">القطع المستخدمة:</span> {report.partsUsed}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.isApproved)}`}>
                      {getStatusText(report.isApproved)}
                    </span>
                    
                    {report.isApproved !== null && report.approvedBy && (
                      <span className="text-xs text-gray-500">
                        بواسطة: {report.approvedBy.firstName} {report.approvedBy.lastName}
                      </span>
                    )}
                  </div>

                  {report.approvalComment && (
                    <div className="bg-gray-100 rounded p-2 mb-3">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">تعليق الموافقة:</span> {report.approvalComment}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Actions for Managers/Supervisors */}
              {canManage && (report.isApproved === null || report.isApproved === undefined) && (
                <div className="flex gap-2 pt-3 border-t border-purple-200">
                  <button
                    onClick={() => handleApprove(report.id)}
                    disabled={loading === report.id}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {loading === report.id ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                    موافقة
                  </button>
                  <button
                    onClick={() => handleReject(report.id)}
                    disabled={loading === report.id}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {loading === report.id ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    )}
                    رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p className="text-sm font-medium">لا توجد تقارير من الفنيين بعد</p>
          <p className="text-xs text-gray-400 mt-1">سيتم عرض تقارير الفنيين هنا عند إضافتها</p>
        </div>
      )}
    </div>
  );
};

export default TechnicianReportsSection;
