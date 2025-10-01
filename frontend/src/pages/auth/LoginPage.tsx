import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.username || !formData.password) {
      setError(t('login.fillAllFields'));
      setIsLoading(false);
      return;
    }

    try {
      await login(formData.username, formData.password);
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check for 401 (Unauthorized) or login failure
      const is401 = error?.response?.status === 401;
      const errorMsg = error?.message || error?.response?.data?.message || '';
      
      // Show specific message for wrong credentials
      let errorMessage = '';
      if (is401 || errorMsg.toLowerCase().includes('invalid') || 
          errorMsg.toLowerCase().includes('incorrect') || 
          errorMsg.toLowerCase().includes('wrong')) {
        errorMessage = t('login.wrongCredentials');
      } else {
        errorMessage = error?.message || t('login.failed');
      }
      
      setError(errorMessage);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-center text-gray-900">
          {t('login.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('login.subtitle')}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            {t('login.username')}
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={formData.username}
              onChange={handleChange}
              className="input-field"
              placeholder={t('login.usernamePlaceholder')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            {t('login.password')}
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="input-field pr-10"
              placeholder={t('login.passwordPlaceholder')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('login.signingIn')}
              </div>
            ) : (
              t('login.signin')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
