import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Save,
  Clock,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  GoogleSheetsConfig,
  getSavedGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  fetchSpreadsheetTabs,
  extractSpreadsheetId,
} from '../../services/googleSheetsSyncService';

interface GoogleSheetsSettingsTabProps {
  onOpenSyncModal: () => void;
}

export const GoogleSheetsSettingsTab: React.FC<GoogleSheetsSettingsTabProps> = ({
  onOpenSyncModal,
}) => {
  const { googleAccessToken, requestGoogleSheetsAccess } = useAuth();

  const [sheetUrl, setSheetUrl] = useState('');
  const [selectedTab, setSelectedTab] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detectedTabs, setDetectedTabs] = useState<string[]>([]);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    const saved = await getSavedGoogleSheetsConfig();
    if (saved) {
      setConfig(saved);
      if (saved.spreadsheetUrl) setSheetUrl(saved.spreadsheetUrl);
      else if (saved.spreadsheetId) setSheetUrl(`https://docs.google.com/spreadsheets/d/${saved.spreadsheetId}/edit`);
      if (saved.sheetTabName) setSelectedTab(saved.sheetTabName);
      if (saved.autoSyncEnabled !== undefined) setAutoSync(saved.autoSyncEnabled);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setFeedback(null);
    try {
      const token = await requestGoogleSheetsAccess();
      if (token) {
        setFeedback({ type: 'success', text: 'Google Account authorized with Spreadsheets scope!' });
      } else {
        setFeedback({ type: 'error', text: 'Authorization cancelled.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Authorization failed.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestAndFetch = async () => {
    if (!sheetUrl.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a Google Sheet URL or ID first.' });
      return;
    }
    const cleanId = extractSpreadsheetId(sheetUrl);
    if (!cleanId) {
      setFeedback({ type: 'error', text: 'Invalid Google Sheet URL format.' });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const meta = await fetchSpreadsheetTabs(cleanId, googleAccessToken);
      setDetectedTabs(meta.sheets);
      if (meta.sheets.length > 0 && !selectedTab) {
        setSelectedTab(meta.sheets[0]);
      }
      setFeedback({
        type: 'success',
        text: `Connection verified! Found sheet "${meta.title}" with tabs: ${meta.sheets.join(', ')}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Connection test failed. Ensure Google Account is connected and spreadsheet ID is valid.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const cleanId = extractSpreadsheetId(sheetUrl);
      await saveGoogleSheetsConfig({
        spreadsheetId: cleanId,
        spreadsheetUrl: sheetUrl,
        sheetTabName: selectedTab || 'Sheet1',
        autoSyncEnabled: autoSync,
      });
      await loadSaved();
      setFeedback({ type: 'success', text: 'Google Sheets sync configuration saved successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">Google Sheets Sync Integration</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Bidirectional synchronization between your main Intern CRM Sheet and Firestore Leads pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSyncModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Launch Sync Inspector</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* Account Auth Card */}
      <div className="bg-white rounded-xl border border-zinc-200/80 p-5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${googleAccessToken ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Google Workspace Authorization</h4>
              <p className="text-[11px] text-zinc-500">
                {googleAccessToken
                  ? 'Access token active in memory. Endpoints authorized for spreadsheets.readonly & spreadsheets.'
                  : 'Connect your Google account to enable live sheet reads and updates.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              googleAccessToken
                ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {isConnecting && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>{googleAccessToken ? 'Re-Authorize Google' : 'Connect Google Account'}</span>
          </button>
        </div>
      </div>

      {/* Sync Configuration Form */}
      <div className="bg-white rounded-xl border border-zinc-200/80 p-5 space-y-4 shadow-2xs">
        <h4 className="text-xs font-bold text-zinc-900">Main Intern CRM Sheet Settings</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Google Spreadsheet URL or Sheet ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <button
                onClick={handleTestAndFetch}
                disabled={isTesting || !sheetUrl.trim()}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test Connection</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Paste the link from your browser address bar when viewing your InternsHome applicant spreadsheet.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Sheet Tab Name</label>
              {detectedTabs.length > 0 ? (
                <select
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none"
                >
                  {detectedTabs.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value)}
                  placeholder="e.g. Form Responses 1 or Leads"
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none"
                />
              )}
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-xs font-medium text-zinc-700">Enable automated parity checks on Leads view</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          <div className="text-[11px] text-zinc-500">
            {config?.lastSyncedAt && (
              <span>Last Synced: {new Date(config.lastSyncedAt).toLocaleString('en-IN')}</span>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
