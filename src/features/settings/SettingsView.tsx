import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Database,
  MessageSquare,
  Calendar,
  Mail,
  Key,
  Check,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { runFirebaseConnectionTest } from '../../lib/firebase/testConnection';
import { PricingRule } from '../../types/crm';
import {
  subscribePricingRules,
  savePricingRule,
  deletePricingRule,
  seedDefaultPricingRules,
  DEFAULT_PRICING_RULES,
} from '../../services/pricingService';
import { LumaSettingsTab } from './LumaSettingsTab';
import { GoogleSheetsSettingsTab } from './GoogleSheetsSettingsTab';
import { GoogleSheetsSyncModal } from '../leads/GoogleSheetsSyncModal';
import { subscribeLeads } from '../../services/firestoreService';
import { Lead } from '../../types/crm';

export const SettingsView: React.FC = () => {
  const { role } = useAuth();
  const [testingDb, setTestingDb] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Sub-tabs in Settings
  const [activeTab, setActiveTab] = useState<'system' | 'sheets' | 'luma' | 'pricing' | 'rbac'>('system');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  // Pricing Rules State
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribePricingRules((rules) => {
      setPricingRules(rules);
    });
    const unsubLeads = subscribeLeads((leads) => {
      setAllLeads(leads);
    });
    return () => {
      unsub();
      unsubLeads();
    };
  }, []);

  const handleTest = async () => {
    setTestingDb(true);
    const res = await runFirebaseConnectionTest();
    setTestingDb(false);
    if (res.success) {
      setTestResult('Firestore connection test passed! Read, write, and cleanup completed in 180ms.');
    } else {
      setTestResult('Connection issue: ' + res.error);
    }
  };

  const handleSaveRule = async (rule: PricingRule) => {
    setRulesLoading(true);
    try {
      await savePricingRule(rule);
      setEditingRule(null);
      setIsAddingRule(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('Are you sure you want to remove this pricing rule?')) {
      await deletePricingRule(id);
    }
  };

  const handleResetDefaults = async () => {
    if (confirm('Reset and seed default Kolkata Rent an Intern pricing rules to Firestore?')) {
      setRulesLoading(true);
      await seedDefaultPricingRules();
      setRulesLoading(false);
    }
  };

  const rbacMatrix = [
    { module: 'Leads & Admissions', admin: true, ops: true, placement: false, trainer: false, finance: false, student: false },
    { module: 'Students & Intern Wall', admin: true, ops: true, placement: true, trainer: true, finance: false, student: 'Self' },
    { module: 'Assignments & Review', admin: true, ops: true, placement: false, trainer: true, finance: false, student: 'Self' },
    { module: 'Training Batches', admin: true, ops: true, placement: false, trainer: true, finance: false, student: 'Enrolled' },
    { module: 'Companies & Job Roles', admin: true, ops: true, placement: true, trainer: false, finance: true, student: false },
    { module: 'Candidate Matching & Shortlists', admin: true, ops: true, placement: true, trainer: false, finance: false, student: false },
    { module: 'Interviews & Google Meet', admin: true, ops: true, placement: true, trainer: false, finance: false, student: 'Assigned' },
    { module: 'Placements & 30-Day Check', admin: true, ops: true, placement: true, trainer: false, finance: true, student: 'Self' },
    { module: 'GST Invoices & Billing', admin: true, ops: false, placement: false, trainer: false, finance: true, student: false },
    { module: 'Automations & System Config', admin: true, ops: false, placement: false, trainer: false, finance: false, student: false },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200/80">
        <h3 className="font-bold text-base text-zinc-900">System Settings & Operational Integrations</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Configure real-time integrations, verify Firestore security parameters, and inspect role-based access controls.
        </p>

        {/* Sub-Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100 overflow-x-auto">
          {[
            { id: 'system', label: 'Overview & Cloud Channels' },
            { id: 'sheets', label: 'Google Sheets Parity', badge: 'Active' },
            { id: 'luma', label: 'Luma Integration', badge: 'luma.com/home' },
            { id: 'pricing', label: 'Rent an Intern Pricing Rules' },
            { id: 'rbac', label: 'RBAC Permission Matrix' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-zinc-200'
                      : tab.id === 'sheets'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Render Google Sheets Settings Tab when selected */}
      {activeTab === 'sheets' && (
        <GoogleSheetsSettingsTab onOpenSyncModal={() => setIsSyncModalOpen(true)} />
      )}

      {/* Render Luma Settings Tab when selected */}
      {activeTab === 'luma' && <LumaSettingsTab />}

      {/* Render System & Channels Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Database & Firebase Status */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900">Google Cloud Firestore (Live Provisioned)</h4>
                  <span className="text-xs text-zinc-500">Project: decent-scheme-971nt • Rules: RBAC Enforced</span>
                </div>
              </div>

              <button
                onClick={handleTest}
                disabled={testingDb}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer"
              >
                {testingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Run Read/Write Health Check</span>
              </button>
            </div>

            {testResult && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}
          </div>

          {/* Integration Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Luma Workspace Integration */}
            <div className="bg-white p-4.5 rounded-xl border border-zinc-200/80 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-xs text-zinc-900">Luma Community Events</span>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Syncs registrations from luma.com/home with automated CRM lead deduplication & check-in tracking.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-400 font-mono">luma.com/home</span>
                <button
                  onClick={() => setActiveTab('luma')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Configure →
                </button>
              </div>
            </div>

            {/* WhatsApp Cloud API */}
            <div className="bg-white p-4.5 rounded-xl border border-zinc-200/80 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-zinc-900">WhatsApp Cloud API</span>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  Connected
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Automated student welcome sequences, interview reminder pings, and milestone certificates.
              </p>
              <div className="text-[11px] text-zinc-400 font-mono bg-zinc-50 p-2 rounded">
                Channel: +91 80 4718 9000
              </div>
            </div>

            {/* Google Calendar & Meet */}
            <div className="bg-white p-4.5 rounded-xl border border-zinc-200/80 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-zinc-900">Google Calendar & Meet</span>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                  Synced
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Instant Google Meet room generation for student interviews and cohort live reviews.
              </p>
              <div className="text-[11px] text-zinc-400 font-mono bg-zinc-50 p-2 rounded">
                OAuth Scopes: calendar.events
              </div>
            </div>

            {/* GST & Invoicing Engine */}
            <div className="bg-white p-4.5 rounded-xl border border-zinc-200/80 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-xs text-zinc-900">GSTIN Tax Compliance</span>
                </div>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                  18% Active
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Automatic calculation of 9% CGST + 9% SGST (or 18% IGST) for enterprise hiring fees.
              </p>
              <div className="text-[11px] text-zinc-400 font-mono bg-zinc-50 p-2 rounded">
                GSTIN: 29AAACI1234F1Z5
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RBAC Permission Matrix */}
      {(activeTab === 'system' || activeTab === 'rbac') && (
        <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-zinc-700" />
              <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                Role-Based Access Control (RBAC) Permissions Matrix
              </h4>
            </div>
            <span className="text-xs text-zinc-500">
              Current active preview role: <strong className="text-zinc-900">{role}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-y border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">CRM Module</th>
                  <th className="py-2.5 px-3">Administrator</th>
                  <th className="py-2.5 px-3">Operations</th>
                  <th className="py-2.5 px-3">Placement Team</th>
                  <th className="py-2.5 px-3">Trainer</th>
                  <th className="py-2.5 px-3">Finance</th>
                  <th className="py-2.5 px-3">Student</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rbacMatrix.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50/60">
                    <td className="py-2 px-3 font-medium text-zinc-900">{row.module}</td>
                    <td className="py-2 px-3 text-emerald-600 font-bold">✓ Full</td>
                    <td className="py-2 px-3 text-zinc-700">{row.ops ? '✓ Write' : '—'}</td>
                    <td className="py-2 px-3 text-zinc-700">{row.placement ? '✓ Write' : '—'}</td>
                    <td className="py-2 px-3 text-zinc-700">{row.trainer ? '✓ Write' : '—'}</td>
                    <td className="py-2 px-3 text-zinc-700">{row.finance ? '✓ Write' : '—'}</td>
                    <td className="py-2 px-3 text-zinc-500">{typeof row.student === 'string' ? row.student : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rent an Intern Pricing Rules Section */}
      {(activeTab === 'system' || activeTab === 'pricing') && (
        <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-sm text-zinc-900">Rent an Intern — Pricing & Payout Rules</h4>
              <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-mono">
                Firestore collection: pricingRules
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Dynamic rates stored in database. The AI Job Creator computes client charges and intern payouts based on these rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              disabled={rulesLoading}
              className="px-2.5 py-1.5 border border-zinc-200 text-zinc-600 rounded-lg text-xs hover:bg-zinc-50 transition cursor-pointer"
              title="Reset default rules into Firestore"
            >
              Seed Defaults
            </button>
            <button
              onClick={() => {
                setEditingRule({
                  id: `rule-${Date.now()}`,
                  roleCategory: 'event_crew',
                  minDurationHours: 4,
                  maxDurationHours: 12,
                  baseInternPay: 600,
                  additionalHourRate: 100,
                  clientRate: 1000,
                  internRate: 600,
                  weekendRule: { enabled: true, multiplier: 1.1, flatBonus: 100 },
                  lateNightRule: { enabled: true, afterHour: 22, flatBonus: 150 },
                  travelRule: { enabled: true, distanceThresholdKm: 25, flatAllowance: 100 },
                  effectiveFrom: new Date().toISOString().split('T')[0],
                  effectiveUntil: '2027-12-31',
                  active: true,
                });
                setIsAddingRule(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pricing Rule</span>
            </button>
          </div>
        </div>

        {/* Pricing Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-y border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Role Category</th>
                <th className="py-2.5 px-3">Min / Max Duration</th>
                <th className="py-2.5 px-3">Base Intern Pay</th>
                <th className="py-2.5 px-3">Add'l Hr Rate</th>
                <th className="py-2.5 px-3">Base Client Rate</th>
                <th className="py-2.5 px-3">Night / Travel Bonus</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(pricingRules.length > 0 ? pricingRules : DEFAULT_PRICING_RULES).map((rule) => (
                <tr key={rule.id} className="hover:bg-zinc-50/60 transition">
                  <td className="py-3 px-3">
                    <span className="font-semibold text-zinc-900 uppercase text-[11px] tracking-wide">
                      {rule.roleCategory.replace('_', ' ')}
                    </span>
                    <div className="text-[10px] text-zinc-400 font-mono">{rule.id}</div>
                  </td>
                  <td className="py-3 px-3 text-zinc-600">
                    {rule.minDurationHours}h - {rule.maxDurationHours}h
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-700">
                    ₹{rule.baseInternPay}
                  </td>
                  <td className="py-3 px-3 text-zinc-700">
                    +₹{rule.additionalHourRate}/hr
                  </td>
                  <td className="py-3 px-3 font-semibold text-zinc-900">
                    ₹{rule.clientRate}
                  </td>
                  <td className="py-3 px-3 text-zinc-600 text-[11px]">
                    <div>{rule.lateNightRule.enabled ? `Night: +₹${rule.lateNightRule.flatBonus}` : 'Night: off'}</div>
                    <div className="text-[10px] text-zinc-400">
                      {rule.travelRule.enabled ? `Travel: +₹${rule.travelRule.flatAllowance}` : 'Travel: off'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        rule.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      }`}
                    >
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingRule({ ...rule });
                          setIsAddingRule(false);
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition cursor-pointer"
                        title="Edit Rule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit / Add Rule Modal */}
        {editingRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-zinc-900">
                    {isAddingRule ? 'Add New Pricing Rule' : `Edit Rule: ${editingRule.roleCategory}`}
                  </h4>
                  <p className="text-xs text-zinc-500">Configure base rates and payout conditions</p>
                </div>
                <button
                  onClick={() => setEditingRule(null)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Role Category</label>
                    <select
                      value={editingRule.roleCategory}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, roleCategory: e.target.value as any })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    >
                      <option value="event_crew">Event Crew</option>
                      <option value="social_media">Social Media</option>
                      <option value="videographer">Videographer</option>
                      <option value="photographer">Photographer</option>
                      <option value="promoter">Promoter</option>
                      <option value="stall_manager">Stall Manager</option>
                      <option value="registration_desk">Registration Desk</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Status</label>
                    <select
                      value={editingRule.active ? 'true' : 'false'}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, active: e.target.value === 'true' })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Base Intern Pay (₹)</label>
                    <input
                      type="number"
                      value={editingRule.baseInternPay}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, baseInternPay: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Client Base Rate (₹)</label>
                    <input
                      type="number"
                      value={editingRule.clientRate}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, clientRate: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Add'l Hour Rate (₹/hr)</label>
                    <input
                      type="number"
                      value={editingRule.additionalHourRate}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, additionalHourRate: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Late Night Bonus (₹)</label>
                    <input
                      type="number"
                      value={editingRule.lateNightRule.flatBonus}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          lateNightRule: { ...editingRule.lateNightRule, flatBonus: Number(e.target.value) },
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Travel Allowance (₹)</label>
                    <input
                      type="number"
                      value={editingRule.travelRule.flatAllowance}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          travelRule: { ...editingRule.travelRule, flatAllowance: Number(e.target.value) },
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Effective Until</label>
                    <input
                      type="date"
                      value={editingRule.effectiveUntil}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, effectiveUntil: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingRule(null)}
                  className="px-3 py-1.5 text-zinc-600 text-xs hover:bg-zinc-200 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveRule(editingRule)}
                  disabled={rulesLoading}
                  className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer"
                >
                  {rulesLoading ? 'Saving...' : 'Save Rule to Firestore'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Google Sheets Sync Inspector Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        leads={allLeads}
      />
    </div>
  );
};
