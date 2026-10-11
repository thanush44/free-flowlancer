import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  X,
  User,
  Mail,
  DollarSign,
  Sparkles,
  CheckCircle,
  Briefcase,
  FolderKanban,
  Clock,
  ShieldCheck,
  TrendingUp,
  Save,
  LogOut,
  Zap,
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
      setMessage('Failed to switch plan');
    } finally {
      setIsTogglingPlan(false);
    }
  }

  const summary = dashboardStats?.summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-white border border-stone-200/90 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative my-auto">
        {/* Header Close */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h3 className="text-lg font-bold text-stone-900 font-heading">Freelancer Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Section: Portrait & User Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 my-6">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 p-1 shadow-md shadow-amber-500/20 border-2 border-amber-400 overflow-hidden">
              <img
                src="/profile-picture.png"
                alt="Profile"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
              PRO
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-extrabold text-stone-900 font-heading">{user?.name || 'Alex Rivera'}</h2>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  user?.plan === 'pro'
                    ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-stone-950 shadow-sm shadow-amber-500/20 font-black'
                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                }`}
              >
                {user?.plan === 'pro' ? 'Pro Unlimited' : 'Free Tier'}
              </span>
            </div>

            <p className="text-xs text-stone-600 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-500" />
              <span>{user?.email || 'alex.freelancer@persevex.io'}</span>
            </p>

            <p className="text-[11px] text-stone-500 mt-1">
              B2B SaaS Developer & Technology Consultant
            </p>

            <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
              <button
                onClick={handleTogglePlan}
                disabled={isTogglingPlan}
                className="inline-flex items-center space-x-1.5 bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 hover:border-amber-400 text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {isTogglingPlan
                    ? 'Switching...'
                    : user?.plan === 'pro'
                    ? 'Switch to Free Tier'
                    : 'Upgrade to Pro'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Lifetime Account Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Projects</span>
            <span className="text-lg font-black text-stone-900 font-heading">
              {summary.active_projects || 4}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-orange-600 block">Hours</span>
            <span className="text-lg font-black text-stone-900 font-heading">
              {Number(summary.unbilled_hours || 27).toFixed(0)}h
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Invoices</span>
            <span className="text-lg font-black text-stone-900 font-heading">
              {summary.pending_invoices || 3}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-orange-600 block">Revenue</span>
            <span className="text-lg font-black text-amber-600 font-heading">
              ${Number(summary.total_revenue || 5192).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Profile Settings Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-stone-200">
          {message && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Default Hourly Billing Rate ($/hr)
              </label>
              <input
                type="number"
                min="10"
                step="5"
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5 transition font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
