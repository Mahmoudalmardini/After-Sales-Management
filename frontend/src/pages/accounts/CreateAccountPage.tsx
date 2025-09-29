import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI, departmentsAPI } from '../../services/api';
import { Department, UserRole } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';

const CreateAccountPage: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin (Company Manager or Deputy Manager)
  const isAdmin = user?.role === UserRole.COMPANY_MANAGER || user?.role === UserRole.DEPUTY_MANAGER;

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, navigate]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: UserRole.TECHNICIAN,
    departmentId: '',
  });

  // Only allow creating supervisors, technicians, and warehouse keeper
  const allowedRoles: UserRole[] = [UserRole.SECTION_SUPERVISOR, UserRole.TECHNICIAN, UserRole.WAREHOUSE_KEEPER];

  const roleLabels: Record<UserRole, string> = {
    COMPANY_MANAGER: t('users.roles.companyManager'),
    DEPUTY_MANAGER: t('users.roles.deputyManager'),
    DEPARTMENT_MANAGER: t('users.roles.departmentManager'),
    SECTION_SUPERVISOR: t('users.roles.sectionSupervisor'),
    TECHNICIAN: t('users.roles.technician'),
    WAREHOUSE_KEEPER: t('users.roles.warehouseKeeper'),
  };

  const loadDepartments = useCallback(async () => {
    try {
      const response = await departmentsAPI.getDepartments();
      setDepartments(response.data?.departments || []);
      
      // Only admins can create accounts now
    } catch (e: any) {
      console.error('Error loading departments:', e);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Don't render anything if not admin
  if (!user || !isAdmin) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.username || !formData.email || !formData.password || 
        !formData.firstName || !formData.lastName || !formData.role || !formData.departmentId) {
      setError('جميع الحقول المطلوبة يجب ملؤها');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      setLoading(true);
      await usersAPI.createUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        role: formData.role,
        departmentId: parseInt(formData.departmentId),
      });
      
      navigate('/accounts');
    } catch (e: any) {
      setError(e.message || 'فشل في إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">إضافة حساب جديد</h1>
          <p className="mt-2 text-sm text-gray-700">إنشاء حساب جديد للمشرفين والفنيين</p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => navigate('/accounts')}
        >
          {t('common.back')}
        </button>
      </div>

      <div className="card">
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label required">اسم المستخدم</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="اسم المستخدم"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="example@company.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">كلمة المرور</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="كلمة المرور (6 أحرف على الأقل)"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="تأكيد كلمة المرور"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">الاسم الأول</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="الاسم الأول"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">الاسم الأخير</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="الاسم الأخير"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="+963 911 234 567"
                />
              </div>

              <div className="form-group">
                <label className="form-label required" htmlFor="role">الدور</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="select-field"
                  aria-label="اختر الدور"
                  title="اختر الدور"
                  required
                >
                  <option value="">اختر الدور</option>
                  {allowedRoles.map(role => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label required" htmlFor="departmentId">القسم</label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  className="select-field"
                  aria-label="اختر القسم"
                  title="اختر القسم"
                  required={formData.role !== UserRole.WAREHOUSE_KEEPER}
                  disabled={user?.role === UserRole.DEPARTMENT_MANAGER}
                >
                  <option value="">اختر القسم</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {user?.role === UserRole.DEPARTMENT_MANAGER && (
                  <p className="text-xs text-gray-500 mt-1">
                    سيتم إنشاء الحساب في قسمك الحالي
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                className="btn"
                onClick={() => navigate('/accounts')}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner ml-2"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء الحساب'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAccountPage;
