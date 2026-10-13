import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  X,
  Mail,
  Sparkles,
  CheckCircle,
  Save,
  LogOut,
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, togglePlan, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [hourlyRate, setHourlyRate] = useState(user?.hourly_rate || 85);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingPlan, setIsTogglingPlan] = useState(false);
  const [message, setMessage] = useState('');
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setHourlyRate(user.hourly_rate || 85);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      api.getDashboardStats().then((data) => setDashboardStats(data)).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSave(e) {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      await updateProfile({
        name: name.trim(),
        hourly_rate: parseFloat(hourlyRate),
      });
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePlan() {
    setIsTogglingPlan(true);
    try {
      const nextPlan = user?.plan === 'free' ? 'pro' : 'free';
      await togglePlan(nextPlan);
      setMessage(`Switched to ${nextPlan.toUpperCase()} tier!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message || 'Failed to switch plan');
    } finally {
      setIsTogglingPlan(false);
    }
  }

  const summary = dashboardStats?.summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#fbf9f5] border border-[#e8e1d3] rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-dropdown relative my-auto">
        {/* Header Close */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e8e1d3]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#4d6b53]"></span>
            <h3 className="text-base font-bold text-[#1c1917] font-heading">Freelancer Profile & Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#78716c] hover:text-[#1c1917] p-1.5 rounded-xl hover:bg-[#efe9de] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Section: Portrait & User Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 my-5">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-subtle border border-[#e8e1d3] overflow-hidden">
              <img
                src="/profile-picture.png"
                alt="Profile"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#4d6b53] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border-2 border-white shadow-subtle">
              {user?.plan === 'pro' ? 'PRO' : 'FREE'}
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-bold text-[#1c1917] font-heading">{user?.name || 'Alex Rivera'}</h2>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                  user?.plan === 'pro'
                    ? 'bg-[#f4f7f4] text-[#304434] border-[#cedece]'
                    : 'bg-[#fdfcf9] text-[#78716c] border-[#e8e1d3]'
                }`}
              >
                {user?.plan === 'pro' ? 'Pro Plan' : 'Free Tier'}
              </span>
            </div>

            <p className="text-xs text-[#57534e] mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#b45309]" />
              <span>{user?.email || 'alex.freelancer@persevex.io'}</span>
            </p>

            <p className="text-[11px] text-[#78716c] mt-0.5">
              Independent Technology Consultant & Developer
            </p>

            <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
              <button
                onClick={handleTogglePlan}
                disabled={isTogglingPlan}
                className="inline-flex items-center space-x-1.5 bg-white hover:bg-[#efe9de] text-[#44403c] border border-[#e8e1d3] hover:border-[#c2b6a3] text-xs font-medium px-3 py-1 rounded-xl transition shadow-subtle"
              >
                <Sparkles className="w-3 h-3 text-[#b45309]" />
                <span>
                  {isTogglingPlan
                    ? 'Switching...'
                    : user?.plan === 'pro'
                    ? 'Switch to Free Tier'
                    : 'Switch to Pro Unlimited'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Lifetime Account Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-white border border-[#e8e1d3]">
            <span className="text-[10px] uppercase font-bold text-[#78716c] block">Projects</span>
            <span className="text-base font-bold text-[#1c1917] font-mono">
              {summary.active_projects || 4}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#e8e1d3]">
            <span className="text-[10px] uppercase font-bold text-[#78716c] block">Unbilled</span>
            <span className="text-base font-bold text-[#b45309] font-mono">
              {Number(summary.unbilled_hours || 0).toFixed(1)}h
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#e8e1d3]">
            <span className="text-[10px] uppercase font-bold text-[#78716c] block">Pending Inv</span>
            <span className="text-base font-bold text-[#c05638] font-mono">
              {summary.pending_invoices || 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#e8e1d3]">
            <span className="text-[10px] uppercase font-bold text-[#78716c] block">Revenue</span>
            <span className="text-base font-bold text-[#4d6b53] font-mono">
              ${Number(summary.total_revenue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Profile Settings Form */}
        <form onSubmit={handleSave} className="space-y-3.5 pt-3.5 border-t border-[#e8e1d3]">
          {message && (
            <div className="p-2.5 rounded-xl bg-[#f4f7f4] border border-[#cedece] text-[#304434] text-xs flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-[#4d6b53] shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44403c] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44403c] mb-1">
                Default Hourly Rate ($/hr)
              </label>
              <input
                type="number"
                min="10"
                step="5"
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-[#a74328] hover:text-[#86341f] flex items-center gap-1.5 transition font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
