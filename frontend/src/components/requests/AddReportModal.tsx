import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../contexts/I18nContext';
import { CreateTechnicianReportForm } from '../../types';

interface AddReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  onReportCreated: () => void;
}

const AddReportModal: React.FC<AddReportModalProps> = ({
  isOpen,
  onClose,
  requestId,
  onReportCreated,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateTechnicianReportForm>({
    requestId,
    reportContent: '',
    currentStatus: '',
    partsUsed: '',
    sendToSupervisor: true,
    sendToAdmin: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.reportContent.trim()) {
      setError(t('reports.description') + ' is required');
      return;
    }

    try {
      setLoading(true);
      const { technicianReportsAPI } = await import('../../services/api');
      await technicianReportsAPI.createTechnicianReport({
        ...form,
        sendToSupervisor: true,
        sendToAdmin: true,
      });
      onReportCreated();
      onClose();
      setForm({
        requestId,
        reportContent: '',
        currentStatus: '',
        partsUsed: '',
        sendToSupervisor: true,
        sendToAdmin: true,
      });
    } catch (e: any) {
      setError(e.message || t('reports.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                {t('reports.add')}
              </Dialog.Title>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={onClose}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reports.description')} *
                </label>
                <textarea
                  name="reportContent"
                  value={form.reportContent}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('reports.enterDescription')}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Status
                  </label>
                  <select
                    name="currentStatus"
                    value={form.currentStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select status (optional)</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING_PARTS">Pending Parts</option>
                    <option value="WAITING_CUSTOMER">Waiting for Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parts Used
                  </label>
                  <input
                    type="text"
                    name="partsUsed"
                    value={form.partsUsed}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="List parts used (optional)"
                  />
                </div>
              </div>

              {/* Sending is automatic to Admin and Supervisor */}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? t('common.creating') : t('reports.add')}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

export default AddReportModal;
