import React, { useEffect, useState } from 'react';
import { customersAPI } from '../../services/api';
import { Customer, UserRole } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { SYRIAN_CITIES } from '../../utils/currency';

const CustomersPage: React.FC = () => {
  const { t } = useI18n();
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '' });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await customersAPI.getCustomers({ limit: 100 });
      setCustomers(resp.data?.customers || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await customersAPI.createCustomer(form);
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', address: '', city: '' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('customers.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('customers.subtitle')}</p>
        </div>
        {hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]) && (
          <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
            {t('customers.add')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <form className="card-content grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={submit}>
            <input className="input" placeholder={t('customers.name') || 'Name'} value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} required />
            <input className="input" placeholder="09XX XXX XXX" value={form.phone} onChange={e=>setForm(f=>({...f, phone: e.target.value}))} required />
            <input className="input" placeholder={t('customers.email') || 'Email'} value={form.email} onChange={e=>setForm(f=>({...f, email: e.target.value}))} />
            <select className="input" value={form.city} onChange={e=>setForm(f=>({...f, city: e.target.value}))} title={t('customers.city') || 'City'}>
              <option value="">اختر المحافظة...</option>
              {SYRIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <input className="input md:col-span-2" placeholder={t('customers.address') || 'Address'} value={form.address} onChange={e=>setForm(f=>({...f, address: e.target.value}))} required />
            <div className="md:col-span-2 flex gap-2">
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? t('requests.loading') : (t('customers.save') || 'Save')}</button>
              <button className="btn" type="button" onClick={()=>setShowForm(false)}>{t('customers.cancel') || 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-content">
          {error && <div className="text-red-600 mb-3">{error}</div>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">{t('customers.name') || 'Name'}</th>
                  <th className="th">{t('customers.phone') || 'Phone'}</th>
                  <th className="th">{t('customers.email') || 'Email'}</th>
                  <th className="th">{t('customers.city') || 'City'}</th>
                  <th className="th">{t('customers.address') || 'Address'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t('customers.loading')}</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t('customers.empty')}</td></tr>
                ) : (
                  customers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="td font-medium">{c.name}</td>
                      <td className="td ltr-text whitespace-nowrap">{c.phone}</td>
                      <td className="td ltr-text whitespace-nowrap">{c.email || '-'}</td>
                      <td className="td">{c.city || '-'}</td>
                      <td className="td">{c.address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomersPage;
