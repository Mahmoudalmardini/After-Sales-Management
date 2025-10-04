import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../contexts/I18nContext';
import { CreateSparePartRequestForm } from '../../types';

interface RequestSparePartModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  onRequestCreated: () => void;
}

const RequestSparePartModal: React.FC<RequestSparePartModalProps> = ({
  isOpen,
  onClose,
  requestId,
  onRequestCreated,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSparePartRequestForm>({
    requestId,
    partName: '',
    partNumber: '',
    description: '',
    quantity: 1,
    urgency: 'NORMAL',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.partName.trim() || !form.description.trim()) {
      setError(t('sparePartRequests.partName') + ' and ' + t('sparePartRequests.description') + ' are required');
      return;
    }

    if (form.quantity < 1) {
      setError(t('sparePartRequests.quantity') + ' must be at least 1');
      return;
    }

    try {
      setLoading(true);
      const { sparePartRequestsAPI } = await import('../../services/api');
      await sparePartRequestsAPI.createSparePartRequest(form);
      onRequestCreated();
      onClose();
      setForm({
        requestId,
        partName: '',
        partNumber: '',
        description: '',
        quantity: 1,
        urgency: 'NORMAL',
      });
    } catch (e: any) {
      setError(e.message || t('sparePartRequests.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
             <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
               {t('sparePartRequests.requestNew')}
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
                   {t('sparePartRequests.partName')} *
                 </label>
                 <input
                   type="text"
                   name="partName"
                   value={form.partName}
                   onChange={handleChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder={t('sparePartRequests.enterPartName')}
                   required
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   {t('sparePartRequests.partNumber')} ({t('common.optional')})
                 </label>
                 <input
                   type="text"
                   name="partNumber"
                   value={form.partNumber}
                   onChange={handleChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder={t('sparePartRequests.enterPartNumber')}
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   {t('sparePartRequests.description')} *
                 </label>
                 <textarea
                   name="description"
                   value={form.description}
                   onChange={handleChange}
                   rows={3}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder={t('sparePartRequests.describeWhy')}
                   required
                 />
               </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     {t('sparePartRequests.quantity')} *
                   </label>
                   <input
                     type="number"
                     name="quantity"
                     value={form.quantity}
                     onChange={handleChange}
                     min="1"
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     {t('sparePartRequests.urgency')}
                   </label>
                   <select
                     name="urgency"
                     value={form.urgency}
                     onChange={handleChange}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     <option value="LOW">{t('sparePartRequests.urgency.low')}</option>
                     <option value="NORMAL">{t('sparePartRequests.urgency.normal')}</option>
                     <option value="URGENT">{t('sparePartRequests.urgency.urgent')}</option>
                   </select>
                 </div>
              </div>

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
                   {loading ? t('common.creating') : t('sparePartRequests.requestNew')}
                 </button>
               </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

export default RequestSparePartModal;
