import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { storageAPI, requestPartsAPI } from '../../services/api';
import { SparePart } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';

interface AddPartToRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  onPartAdded: () => void;
}

const AddPartToRequestModal: React.FC<AddPartToRequestModalProps> = ({
  isOpen,
  onClose,
  requestId,
  onPartAdded,
}) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      loadSpareParts();
    }
  }, [isOpen]);

  const loadSpareParts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await storageAPI.getSpareParts({ limit: 100 });
      setSpareParts(response.data?.spareParts || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load spare parts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !user) return;

    try {
      setLoading(true);
      await requestPartsAPI.addPartToRequest({
        requestId,
        sparePartId: selectedPart.id,
        quantityUsed: quantity,
        addedById: user.id,
      });
      onPartAdded();
      onClose();
      setSelectedPart(null);
      setQuantity(1);
    } catch (e: any) {
      setError(e.message || 'Failed to add part to request');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (part: SparePart): 'IN_STOCK' | 'OUT_OF_STOCK' => {
    if (part.presentPieces === 0) return 'OUT_OF_STOCK';
    return 'IN_STOCK';
  };

  const getStockStatusColor = (status: 'IN_STOCK' | 'OUT_OF_STOCK') => {
    switch (status) {
      case 'IN_STOCK': return 'text-green-600 bg-green-100';
      case 'OUT_OF_STOCK': return 'text-red-600 bg-red-100';
    }
  };

  const availableParts = spareParts.filter(part => part.presentPieces > 0);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {t('storage.addToRequest')}
            </h2>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={onClose}
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('storage.name')}
                </label>
                <select
                  className="w-full input"
                  value={selectedPart?.id || ''}
                  onChange={(e) => {
                    const part = spareParts.find(p => p.id === Number(e.target.value));
                    setSelectedPart(part || null);
                  }}
                  required
                  title={t('storage.name')}
                >
                  <option value="">{t('common.selectOption')}</option>
                  {availableParts.map(part => (
                    <option key={part.id} value={part.id}>
                      {part.name} - {part.partNumber} ({part.presentPieces} {t('storage.inStock')})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPart && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('storage.partNumber')}
                    </label>
                    <input
                      type="text"
                      className="w-full input"
                      value={selectedPart.partNumber}
                      disabled
                      title={t('storage.partNumber')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('storage.unitPrice')}
                    </label>
                    <input
                      type="text"
                      className="w-full input"
                      value={`${selectedPart.unitPrice} SYP`}
                      disabled
                      title={t('storage.unitPrice')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('storage.quantity')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedPart.presentPieces}
                      className="w-full input"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      required
                      title={t('storage.quantity')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      الحد الأقصى المتاح: {selectedPart.presentPieces} قطعة
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('storage.totalCost')}
                    </label>
                    <input
                      type="text"
                      className="w-full input"
                      value={`${(quantity * selectedPart.unitPrice).toFixed(2)} SYP`}
                      disabled
                      title={t('storage.totalCost')}
                    />
                  </div>
                </div>
              )}

              {selectedPart && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{t('storage.stockStatus')}:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(getStockStatus(selectedPart))}`}>
                    {t(`storage.${getStockStatus(selectedPart).toLowerCase()}`)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                className="btn"
                onClick={onClose}
              >
                {t('storage.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !selectedPart}
              >
                {loading ? t('common.loading') : t('storage.addToRequest')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default AddPartToRequestModal;
