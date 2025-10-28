import React, { useEffect, useState } from 'react';
import { productsAPI, departmentsAPI } from '../../services/api';
import { Department, Product, UserRole } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';

const ProductsPage: React.FC = () => {
  const { t } = useI18n();
  const { user, hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', model: '', serialNumber: '', category: '', departmentId: '' });

  // Check if user can create products (admin and supervisor roles)
  const canCreateProduct = hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]);
  // Check if user can view products (all roles including technician)
  const canViewProducts = hasRole([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.TECHNICIAN, UserRole.WAREHOUSE_KEEPER]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prods, deps] = await Promise.all([
        productsAPI.getProducts({ limit: 100 }),
        departmentsAPI.getDepartments(),
      ]);
      setProducts(prods.data?.products || []);
      setDepartments(deps.data?.departments || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateProduct) {
      setError('You do not have permission to create products');
      return;
    }

    try {
      setLoading(true);
      await productsAPI.createProduct({
        ...form,
        departmentId: Number(form.departmentId),
        serialNumber: form.serialNumber || undefined,
      });
      setShowForm(false);
      setForm({ name: '', model: '', serialNumber: '', category: '', departmentId: '' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('products.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('products.subtitle')}</p>
        </div>
        {canCreateProduct ? (
          <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
            {t('products.add')}
          </button>
        ) : canViewProducts && user?.role === UserRole.TECHNICIAN ? (
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 px-4 py-3 rounded-md flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {t('products.readOnlyAccess') || 'عرض المنتجات فقط - لا يمكن التعديل أو الحذف'}
          </div>
        ) : null}
      </div>

      {showForm && (
        <div className="card">
          <form className="card-content grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={submit}>
            <input className="input" placeholder={t('products.name') || 'Name'} value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} required />
            <input className="input" placeholder={t('products.model') || 'Model'} value={form.model} onChange={e=>setForm(f=>({...f, model: e.target.value}))} required />
            <input className="input" placeholder={t('products.serial') || 'Serial Number'} value={form.serialNumber} onChange={e=>setForm(f=>({...f, serialNumber: e.target.value}))} />
            <input className="input" placeholder={t('products.category') || 'Category'} value={form.category} onChange={e=>setForm(f=>({...f, category: e.target.value}))} required />
            <select className="input" value={form.departmentId} onChange={e=>setForm(f=>({...f, departmentId: e.target.value}))} required title={t('products.department') || 'Department'}>
              <option value="">{t('products.department') || 'Department'}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {/* warranty removed */}
            <div className="md:col-span-3 flex gap-2">
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? t('common.loading') : t('products.save')}</button>
              <button className="btn" type="button" onClick={()=>setShowForm(false)}>{t('products.cancel')}</button>
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
                  <th className="th">{t('products.name') || 'Name'}</th>
                  <th className="th">{t('products.model') || 'Model'}</th>
                  <th className="th">{t('products.serial') || 'Serial Number'}</th>
                  <th className="th">{t('products.category') || 'Category'}</th>
                  <th className="th">{t('products.department') || 'Department'}</th>
                  {/* warranty column removed */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t('products.loading')}</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t('products.empty')}</td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="td font-medium">{p.name}</td>
                      <td className="td">{p.model}</td>
                      <td className="td text-gray-600">{p.serialNumber || '-'}</td>
                      <td className="td">{p.category}</td>
                      <td className="td">{p.department?.name}</td>
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

export default ProductsPage;
