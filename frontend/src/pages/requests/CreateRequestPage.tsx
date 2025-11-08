import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI, productsAPI, requestsAPI } from '../../services/api';
import { CreateRequestForm, Customer, Product } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
// import { SYRIAN_CITIES } from '../../utils/currency';

const CreateRequestPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [form, setForm] = useState<CreateRequestForm>({
    customerId: '',
    productId: '',
    issueDescription: '',
    executionMethod: 'ON_SITE',
    warrantyStatus: 'UNDER_WARRANTY',
    purchaseDate: '',
    requestDate: '',
    priority: 'NORMAL',
    serialNumber: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [custResp, prodResp] = await Promise.all([
          customersAPI.getCustomers({ limit: 100 }),
          productsAPI.getProducts({ limit: 100 }),
        ]);
        setCustomers(custResp.data.customers || []);
        setProducts(prodResp.data.products || []);
      } catch (e: any) {
        setError(e.message || t('error.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value } as any));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!form.customerId) {
        setError('يجب اختيار العميل');
        setLoading(false);
        return;
      }
      
      if (!form.productId) {
        setError('يجب اختيار المنتج');
        setLoading(false);
        return;
      }
      
      if (!form.requestDate) {
        setError('يجب إدخال تاريخ الطلب');
        setLoading(false);
        return;
      }
      
      // Check for future request date (not allowed for anyone)
      const requestDate = new Date(form.requestDate);
      requestDate.setHours(0, 0, 0, 0); // Reset time to start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      if (requestDate > today) {
        setError('لا يمكن إدخال تاريخ طلب في المستقبل. يجب أن يكون تاريخ الطلب اليوم أو تاريخ سابق.');
        setLoading(false);
        return;
      }
      
      const payload = {
        ...form,
        customerId: Number(form.customerId),
        productId: Number(form.productId),
        // Send undefined when empty to avoid backend validation
        purchaseDate: form.purchaseDate || undefined,
      };
      const resp = await requestsAPI.createRequest(payload as any);
      const newId = resp.request?.id;
      navigate(newId ? `/requests/${newId}` : '/requests');
    } catch (e: any) {
      setError(e.message || t('error.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('create.title') || 'إنشاء طلب جديد'}</h1>
        <p className="mt-2 text-lg text-gray-600">{t('create.subtitle') || 'أدخل تفاصيل الطلب الجديد'}</p>
      </div>

      <div className="card shadow-medium">
        <div className="card-header">
          <h2>{t('create.cardTitle') || 'Request Information'}</h2>
          <p>{t('create.cardSubtitle') || 'Please fill in all required fields'}</p>
        </div>
        <form className="card-content space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label required" id="customerId-label" htmlFor="customerId">{t('create.customer')}</label>
              <select id="customerId" name="customerId" value={form.customerId} onChange={handleChange} className="select-field" required aria-labelledby="customerId-label">
                <option value="" disabled>{t('create.customerPlaceholder')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required" id="productId-label" htmlFor="productId">{t('create.product') || 'المنتج'}</label>
              <select id="productId" name="productId" value={form.productId} onChange={handleChange} className="select-field" required aria-labelledby="productId-label">
                <option value="" disabled>{t('create.productPlaceholder') || 'اختر المنتج...'}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.model} {p.serialNumber ? `(${p.serialNumber})` : ''} — {p.department?.name || 'غير محدد'}
                  </option>
                ))}
              </select>
              <p className="form-help">{t('create.productHelp') || 'يجب اختيار المنتج المراد صيانته'}</p>
            </div>

            <div className="form-group">
              <label className="form-label required" id="executionMethod-label" htmlFor="executionMethod">{t('create.executionMethod') || 'طريقة التنفيذ'}</label>
              <select id="executionMethod" name="executionMethod" value={form.executionMethod} onChange={handleChange} className="select-field" required aria-labelledby="executionMethod-label">
                <option value="ON_SITE">{t('create.executionOnsite') || 'On-site visit'}</option>
                <option value="WORKSHOP">{t('create.executionWorkshop') || 'Workshop'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required" id="warrantyStatus-label" htmlFor="warrantyStatus">{t('create.warrantyStatus') || 'حالة الكفالة'}</label>
              <select id="warrantyStatus" name="warrantyStatus" value={form.warrantyStatus} onChange={handleChange} className="select-field" required aria-labelledby="warrantyStatus-label">
                <option value="UNDER_WARRANTY">{t('create.warrantyUnder') || 'Under warranty'}</option>
                <option value="OUT_OF_WARRANTY">{t('create.warrantyOut') || 'Out of warranty'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required" id="priority-label" htmlFor="priority">{t('create.priority') || 'الأولوية'}</label>
              <select id="priority" name="priority" value={form.priority} onChange={handleChange} className="select-field" required aria-labelledby="priority-label">
                <option value="LOW">{t('create.priorityLow') || 'Low'}</option>
                <option value="NORMAL">{t('create.priorityNormal') || 'Normal'}</option>
                <option value="HIGH">{t('create.priorityHigh') || 'High'}</option>
                <option value="URGENT">{t('create.priorityUrgent') || 'Urgent'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="purchaseDate">{t('create.purchaseDate') || 'تاريخ الشراء'}</label>
              <input 
                id="purchaseDate" 
                type="date" 
                name="purchaseDate" 
                value={form.purchaseDate} 
                onChange={handleChange} 
                className="input-field"
              />
              <p className="form-help">
                {t('create.purchaseDateHelp') || 'تاريخ شراء المنتج (اختياري)'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label required" htmlFor="requestDate">{t('create.requestDate') || 'تاريخ الطلب'}</label>
              <input 
                id="requestDate" 
                type="date" 
                name="requestDate" 
                value={form.requestDate} 
                onChange={handleChange} 
                className="input-field"
                required
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="form-help">
                {t('create.requestDateHelp') || 'تاريخ الطلب - لا يمكن إدخال تاريخ في المستقبل'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="serialNumber">{t('create.serialNumber') || 'الرقم التسلسلي'}</label>
              <input 
                id="serialNumber" 
                type="text" 
                name="serialNumber" 
                value={form.serialNumber || ''} 
                onChange={handleChange} 
                className="input-field"
                placeholder={t('create.serialNumberPlaceholder') || 'أدخل الرقم التسلسلي (أرقام وحروف)'}
                pattern="[A-Za-z0-9]*"
                title={t('create.serialNumberHelp') || 'يمكن إدخال أرقام وحروف فقط'}
              />
              <p className="form-help">
                {t('create.serialNumberHelp') || 'الرقم التسلسلي للمنتج (اختياري - أرقام وحروف فقط)'}
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required" htmlFor="issueDescription">{t('create.issue') || 'Issue description'}</label>
            <textarea id="issueDescription" name="issueDescription" value={form.issueDescription} onChange={handleChange} className="textarea-field" rows={5} required placeholder={t('create.issue.placeholder') || 'Describe the issue...'} />
            <p className="form-help">{t('create.issueHelp') || 'Provide detailed information about the issue or required service'}</p>
          </div>

          <div className="card-footer bg-gradient-to-r from-gray-50 to-white">
            <div className="flex gap-4 justify-end">
              <button type="button" className="btn-secondary" onClick={() => navigate('/requests')}>
                {t('create.cancel') || 'إلغاء'}
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <div className="loading-spinner ml-2"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  t('create.submit') || 'إنشاء الطلب'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestPage;
