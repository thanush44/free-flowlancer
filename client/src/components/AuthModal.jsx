import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, loadDemoUser } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    hourly_rate: 1500,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register(
          formData.name,
          formData.email,
          formData.password,
          'pro',
          parseFloat(formData.hourly_rate) || 1500
        );
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemo() {
    setError('');
    setLoading(true);
    try {
      await loadDemoUser();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to initialize demo account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#fbf9f5] border border-[#e8e1d3] rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-dropdown relative my-auto">
        {/* Header */}
        <div className="text-center pb-4 border-b border-[#e8e1d3]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-[#e8e1d3] shadow-subtle mb-3">
            <ShieldCheck className="w-6 h-6 text-[#4d6b53]" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1c1917] font-heading">
            {mode === 'login' ? 'Sign In to FreelanceFlow' : 'Create Your Freelancer Account'}
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            {mode === 'login'
              ? 'Access your saved clients, projects, and invoices'
              : 'Isolated workspace backed by persistent SQLite storage'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#efe9de] p-1 rounded-xl my-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-[#1c1917] shadow-subtle'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-[#1c1917] shadow-subtle'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#fdf6f4] border border-[#f5d3ca] text-[#86341f] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#c05638]" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#44403c] mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Thanush Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#b45309]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#44403c] mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" />
              <input
                type="email"
                required
                placeholder="developer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#b45309]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44403c] mb-1">
              Password * {mode === 'register' && <span className="text-[#a8a29e]">(min 6 chars)</span>}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#b45309]"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#44403c] mb-1">
                Default Billing Rate (₹/hr)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                placeholder="1500"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#b45309] font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center space-x-2 bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold py-2.5 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Account Quick Access */}
        <div className="mt-4 pt-4 border-t border-[#e8e1d3] text-center">
          <p className="text-[11px] text-[#78716c] mb-2">Want to evaluate without typing?</p>
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="w-full inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-[#efe9de] text-[#44403c] border border-[#e8e1d3] text-xs font-semibold py-2 rounded-xl transition shadow-subtle disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#b45309]" />
            <span>Load Demo Account (Alex Rivera)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
