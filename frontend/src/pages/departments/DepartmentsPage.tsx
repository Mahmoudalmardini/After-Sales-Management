import React, { useEffect, useState } from 'react';
import { departmentsAPI } from '../../services/api';
import { Department, UserRole } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';

const DepartmentsPage: React.FC = () => {
  const { t } = useI18n();
  const { hasRole } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  // Check if user can manage departments
  const canManageDepartments = hasRole([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR,
  ]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await departmentsAPI.getDepartments();
      setDepartments(resp.data?.departments || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageDepartments) {
      setError('You do not have permission to manage departments');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (editingDepartment) {
        // Update existing department
        await departmentsAPI.updateDepartment(editingDepartment.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
      } else {
        // Create new department
        await departmentsAPI.createDepartment({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
      }

      setShowForm(false);
      setEditingDepartment(null);
      setForm({ name: '', description: '' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setForm({
      name: department.name,
      description: department.description || '',
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (department: Department) => {
    if (!canManageDepartments) {
      setError('You do not have permission to delete departments');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the department "${department.name}"?\n\nThis action cannot be undone and will fail if the department is currently in use.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);
      await departmentsAPI.deleteDepartment(department.id);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to delete department');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDepartment(null);
    setForm({ name: '', description: '' });
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('departments.title') || 'Departments'}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('departments.subtitle') || 'Manage departments in your organization'}
          </p>
        </div>
        {canManageDepartments && (
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm((v) => !v);
              if (showForm) {
                handleCancel();
              }
            }}
          >
            {showForm
              ? t('common.cancel') || 'Cancel'
              : t('departments.add') || 'Add Department'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingDepartment
                ? t('departments.edit') || 'Edit Department'
                : t('departments.create') || 'Create New Department'}
            </h3>
            <form className="grid grid-cols-1 gap-4" onSubmit={submit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('departments.name') || 'Department Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder={t('departments.namePlaceholder') || 'Enter department name'}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('departments.description') || 'Description'}
                </label>
                <textarea
                  id="description"
                  className="input"
                  rows={3}
                  placeholder={t('departments.descriptionPlaceholder') || 'Enter department description (optional)'}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading
                    ? t('common.loading') || 'Saving...'
                    : editingDepartment
                    ? t('departments.update') || 'Update Department'
                    : t('departments.create') || 'Create Department'}
                </button>
                <button className="btn" type="button" onClick={handleCancel}>
                  {t('common.cancel') || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-content">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">{t('departments.name') || 'Name'}</th>
                  <th className="th">{t('departments.description') || 'Description'}</th>
                  <th className="th">{t('departments.createdAt') || 'Created'}</th>
                  {canManageDepartments && (
                    <th className="th">{t('common.actions') || 'Actions'}</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && departments.length === 0 ? (
                  <tr>
                    <td colSpan={canManageDepartments ? 4 : 3} className="py-8 text-center text-gray-500">
                      {t('common.loading') || 'Loading...'}
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={canManageDepartments ? 4 : 3} className="py-8 text-center text-gray-500">
                      {t('departments.empty') || 'No departments found'}
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50">
                      <td className="td font-medium">{dept.name}</td>
                      <td className="td text-gray-600">{dept.description || '-'}</td>
                      <td className="td text-gray-600">
                        {new Date(dept.createdAt).toLocaleDateString()}
                      </td>
                      {canManageDepartments && (
                        <td className="td">
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              onClick={() => handleEdit(dept)}
                              disabled={loading}
                            >
                              {t('common.edit') || 'Edit'}
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                              onClick={() => handleDelete(dept)}
                              disabled={loading}
                            >
                              {t('common.delete') || 'Delete'}
                            </button>
                          </div>
                        </td>
                      )}
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

export default DepartmentsPage;

