import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Database,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
  Check,
  UserMinus,
} from 'lucide-react';
import { Lead } from '../../types/crm';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  GoogleSheetsConfig,
  SyncDiffResult,
  getSavedGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  fetchSpreadsheetTabs,
  fetchSpreadsheetValues,
  parseSheetRowsToCandidates,
  computeSyncDiff,
  applySyncDiffToFirestore,
  extractSpreadsheetId,
  parseCsvToRows,
} from '../../services/googleSheetsSyncService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onSyncComplete?: (summary: { created: number; updated: number }) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  leads,
  onSyncComplete,
}) => {
  const { googleAccessToken, requestGoogleSheetsAccess, currentUser, profile } = useAuth();

  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('');
  
  // Tabs & Modes
  const [inputMode, setInputMode] = useState<'url' | 'paste'>('url');
  const [pastedData, setPastedData] = useState('');

  // Loading & State
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync Diff
  const [diffResult, setDiffResult] = useState<SyncDiffResult | null>(null);
  const [activeDiffTab, setActiveDiffTab] = useState<'new' | 'updates' | 'unchanged' | 'removed' | 'columns'>('new');

  // Sync Options
  const [updateStatus, setUpdateStatus] = useState(true);
  const [updateFields, setUpdateFields] = useState(true);
  const [updateStudents, setUpdateStudents] = useState(true);
  const [removeNotInSheet, setRemoveNotInSheet] = useState(true);
  const [rememberConfig, setRememberConfig] = useState(true);

  // Saved Config Info
  const [savedConfig, setSavedConfig] = useState<GoogleSheetsConfig | null>(null);

  // Load saved config on mount
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const config = await getSavedGoogleSheetsConfig();
      if (config) {
        setSavedConfig(config);
        if (config.spreadsheetUrl) setSheetUrl(config.spreadsheetUrl);
        else if (config.spreadsheetId) setSheetUrl(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`);
        if (config.sheetTabName) setSelectedTab(config.sheetTabName);
      }
    } catch (err) {
      console.warn('Could not load saved sheet config:', err);
    }
  };

  if (!isOpen) return null;

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const token = await requestGoogleSheetsAccess();
      if (!token) {
        setErrorMsg('Sign-in cancelled or permission was not granted. Please retry.');
      } else {
        setSuccessMsg('Google Sheets authorization successful! Ready to read sheets.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate with Google');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFetchTabsAndPreview = async (overrideTab?: string) => {
    if (!sheetUrl.trim()) {
      setErrorMsg('Please enter a Google Sheet URL or Spreadsheet ID.');
      return;
    }

    const cleanId = extractSpreadsheetId(sheetUrl);
    if (!cleanId) {
      setErrorMsg('Invalid Google Sheet URL or ID.');
      return;
    }

    setIsFetching(true);
    setErrorMsg(null);
    setDiffResult(null);

    try {
      // 1. Try to fetch tabs list
      let tabs: string[] = [];
      let title = 'Google Sheet';

      if (googleAccessToken) {
        try {
          const meta = await fetchSpreadsheetTabs(cleanId, googleAccessToken);
          tabs = meta.sheets;
          title = meta.title;
          setSpreadsheetTitle(title);
          setSheetTabs(tabs);
        } catch (tabErr: any) {
          console.warn('Could not fetch tabs list:', tabErr);
        }
      }

      // 2. Determine which tab to read
      const tabToUse = overrideTab || selectedTab || (tabs.length > 0 ? tabs[0] : 'Sheet1');
      setSelectedTab(tabToUse);

      // 3. Fetch values
      const rawRows = await fetchSpreadsheetValues(cleanId, tabToUse, googleAccessToken);
      if (!rawRows || rawRows.length < 2) {
        throw new Error(`The sheet tab "${tabToUse}" contains no data or fewer than 2 rows (header + 1 row needed).`);
      }

      // 4. Parse candidates & compute diff against current Firestore leads
      const { candidates, headers } = parseSheetRowsToCandidates(rawRows);
      const diff = computeSyncDiff(candidates, leads, headers);
      setDiffResult(diff);

      // Set default diff tab
      if (diff.toCreate.length > 0) setActiveDiffTab('new');
      else if (diff.toUpdate.length > 0) setActiveDiffTab('updates');
      else if (diff.toRemove.length > 0) setActiveDiffTab('removed');
      else setActiveDiffTab('unchanged');

      setSuccessMsg(`Successfully parsed ${diff.totalSheetRows} rows from tab "${tabToUse}".`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Fetch preview failed:', err);
      setErrorMsg(
        err.message ||
          'Failed to load sheet data. Ensure the sheet is shared or click "Connect with Google" to access private sheets.'
      );
    } finally {
      setIsFetching(false);
    }
  };

  const handleParsePastedData = () => {
    if (!pastedData.trim()) {
      setErrorMsg('Please paste tab-separated or comma-separated rows from Google Sheets.');
      return;
    }

    setErrorMsg(null);
    try {
      // Parse TSV/CSV
      const rows = parseCsvToRows(pastedData.replace(/\t/g, ','));
      if (rows.length < 2) {
        throw new Error('Please paste at least one header row and one data row.');
      }

      const { candidates, headers } = parseSheetRowsToCandidates(rows);
      const diff = computeSyncDiff(candidates, leads, headers);
      setDiffResult(diff);
      setSpreadsheetTitle('Pasted Sheet Data');

      if (diff.toCreate.length > 0) setActiveDiffTab('new');
      else if (diff.toUpdate.length > 0) setActiveDiffTab('updates');
      else if (diff.toRemove.length > 0) setActiveDiffTab('removed');
      else setActiveDiffTab('unchanged');

      setSuccessMsg(`Parsed ${diff.totalSheetRows} rows successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not parse pasted data.');
    }
  };

  const handlePrimaryButtonClick = async () => {
    if (isApplying || isFetching) return;

    // If diffResult hasn't been fetched yet, automatically run fetch/parse
    if (!diffResult) {
      if (inputMode === 'url') {
        if (!sheetUrl.trim()) {
          setErrorMsg('Please enter your Google Spreadsheet URL or ID above.');
          return;
        }
        await handleFetchTabsAndPreview();
        return;
      } else {
        if (!pastedData.trim()) {
          setErrorMsg('Please paste rows from your Google Sheet into the box above.');
          return;
        }
        handleParsePastedData();
        return;
      }
    }

    const pendingRemovals = removeNotInSheet ? diffResult.toRemove.length : 0;
    const totalChanges = diffResult.toCreate.length + diffResult.toUpdate.length + pendingRemovals;
    if (totalChanges === 0) {
      setSuccessMsg('Your CRM leads are already 100% in parity with the Google Sheet! No differences detected.');
      return;
    }

    setIsApplying(true);
    setErrorMsg(null);

    try {
      const summary = await applySyncDiffToFirestore(diffResult, {
        updateExistingStatus: updateStatus,
        updateExistingFields: updateFields,
        updateStudentRecords: updateStudents,
        removeLeadsNotInSheet: removeNotInSheet,
        sheetTitle: spreadsheetTitle || 'Google Sheet Master',
      });

      if (rememberConfig && sheetUrl) {
        await saveGoogleSheetsConfig({
          spreadsheetId: extractSpreadsheetId(sheetUrl),
          spreadsheetUrl: sheetUrl,
          sheetTabName: selectedTab,
        });
      }

      const details = [
        summary.createdCount > 0 ? `${summary.createdCount} new leads added` : null,
        summary.updatedCount > 0 ? `${summary.updatedCount} leads updated` : null,
        summary.removedCount > 0 ? `${summary.removedCount} non-sheet leads removed` : null,
      ].filter(Boolean).join(', ');

      setSuccessMsg(`Parity sync complete! ${details || 'CRM leads now strictly mirror Google Sheet.'}`);
      if (onSyncComplete) {
        onSyncComplete({ created: summary.createdCount, updated: summary.updatedCount });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Sync apply failed:', err);
      setErrorMsg(err.message || 'Failed to apply sync to Firestore database.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200/80 bg-zinc-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 text-base">Google Sheets Live Parity Sync</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Sync updated rows from your master Google Sheet directly into CRM Leads & Interns
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status Banners */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Sync Error:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Success:</span>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {/* Connection Card */}
          <div className="p-4 bg-zinc-50/80 border border-zinc-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${googleAccessToken ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-zinc-900">Google Account Authorization</span>
                  {googleAccessToken ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded-md">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {googleAccessToken
                    ? `Connected with Google Sheets API scope. Ready to sync private sheets.`
                    : `Sign in with Google to read your private Intern CRM Sheets securely.`}
                </p>
              </div>
            </div>

            <button
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                googleAccessToken
                  ? 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              {isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleAccessToken ? 'Re-authorize Account' : 'Connect with Google'}</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputMode('url')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  inputMode === 'url'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Sheet Link / ID</span>
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  inputMode === 'paste'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Quick Paste from Sheet</span>
              </button>
            </div>

            {savedConfig?.lastSyncedAt && (
              <span className="text-[11px] text-zinc-400">
                Last synced: {new Date(savedConfig.lastSyncedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
          </div>

          {/* Input Method: URL */}
          {inputMode === 'url' && (
            <div className="space-y-3 bg-zinc-50/50 p-4 border border-zinc-200/80 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  Google Spreadsheet URL or ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  />
                  <button
                    onClick={() => handleFetchTabsAndPreview()}
                    disabled={isFetching || !sheetUrl.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {isFetching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Fetch & Preview</span>
                  </button>
                </div>
              </div>

              {sheetTabs.length > 0 && (
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs font-medium text-zinc-600">Select Sheet Tab:</label>
                  <select
                    value={selectedTab}
                    onChange={(e) => {
                      setSelectedTab(e.target.value);
                      handleFetchTabsAndPreview(e.target.value);
                    }}
                    className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white font-medium text-zinc-800 focus:outline-none"
                  >
                    {sheetTabs.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-zinc-400">
                    {spreadsheetTitle ? `(${spreadsheetTitle})` : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Input Method: Quick Paste */}
          {inputMode === 'paste' && (
            <div className="space-y-3 bg-zinc-50/50 p-4 border border-zinc-200/80 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Paste Rows directly from Google Sheets
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">
                  In your Google Sheet, select the header row and candidate rows, copy (⌘C / Ctrl+C), and paste below:
                </p>
                <textarea
                  rows={4}
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder={`Name\tEmail\tPhone\tCity\tStatus\tResponsibilities\tCV Url\nTanvi Singh\tsinghtanvi787@gmail.com\t9113187952\tPatna\tTraining Period\tUX Design\thttps://...`}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleParsePastedData}
                  disabled={!pastedData.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Parse & Compare with CRM</span>
                </button>
              </div>
            </div>
          )}

          {/* Sync Diff Section */}
          {diffResult && (
            <div className="space-y-4 border border-zinc-200 rounded-xl p-4 bg-white">
              {/* Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-zinc-500 block">Total Sheet Rows</span>
                  <span className="text-xl font-bold text-zinc-900">{diffResult.totalSheetRows}</span>
                </div>

                <div
                  onClick={() => setActiveDiffTab('new')}
                  className={`p-3 border rounded-xl cursor-pointer transition ${
                    activeDiffTab === 'new'
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-800">New Leads</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="text-xl font-bold text-emerald-700">+{diffResult.toCreate.length}</span>
                </div>

                <div
                  onClick={() => setActiveDiffTab('updates')}
                  className={`p-3 border rounded-xl cursor-pointer transition ${
                    activeDiffTab === 'updates'
                      ? 'bg-blue-50/80 border-blue-300'
                      : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-800">Existing Updated</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  </div>
                  <span className="text-xl font-bold text-blue-700">{diffResult.toUpdate.length}</span>
                </div>

                <div
                  onClick={() => setActiveDiffTab('unchanged')}
                  className={`p-3 border rounded-xl cursor-pointer transition ${
                    activeDiffTab === 'unchanged'
                      ? 'bg-zinc-200/80 border-zinc-400'
                      : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-600">In Parity</span>
                    <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                  </div>
                  <span className="text-xl font-bold text-zinc-700">{diffResult.unchanged.length}</span>
                </div>

                <div
                  onClick={() => setActiveDiffTab('removed')}
                  className={`p-3 border rounded-xl cursor-pointer transition ${
                    activeDiffTab === 'removed'
                      ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-400'
                      : diffResult.toRemove.length > 0
                      ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/70'
                      : 'bg-zinc-50 border-zinc-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-800">Not in Sheet</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  </div>
                  <span className="text-xl font-bold text-rose-700">{diffResult.toRemove.length}</span>
                </div>
              </div>

              {/* Sub-tab selection */}
              <div className="flex items-center gap-2 border-b border-zinc-200 text-xs font-medium overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveDiffTab('new')}
                  className={`px-3 py-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                    activeDiffTab === 'new'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  New Leads to Add ({diffResult.toCreate.length})
                </button>
                <button
                  onClick={() => setActiveDiffTab('updates')}
                  className={`px-3 py-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                    activeDiffTab === 'updates'
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Status / Field Updates ({diffResult.toUpdate.length})
                </button>
                <button
                  onClick={() => setActiveDiffTab('unchanged')}
                  className={`px-3 py-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                    activeDiffTab === 'unchanged'
                      ? 'border-zinc-800 text-zinc-900 font-bold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  In Parity ({diffResult.unchanged.length})
                </button>
                <button
                  onClick={() => setActiveDiffTab('removed')}
                  className={`px-3 py-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                    activeDiffTab === 'removed'
                      ? 'border-rose-600 text-rose-700 font-bold'
                      : 'border-transparent text-rose-600 hover:text-rose-800'
                  }`}
                >
                  Not in Sheet ({diffResult.toRemove.length})
                </button>
              </div>

              {/* Diff Content Viewport */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {activeDiffTab === 'new' && (
                  <>
                    {diffResult.toCreate.length === 0 ? (
                      <div className="py-8 text-center text-zinc-400 text-xs">
                        No new leads found in this sheet. All applicants already exist in CRM!
                      </div>
                    ) : (
                      diffResult.toCreate.map((cand, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-emerald-50/40 border border-emerald-200/70 rounded-xl flex items-center justify-between text-xs gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900">{cand.name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">Row {cand.rawRowIndex}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                {cand.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                              <span>{cand.email || 'No email'}</span>
                              <span>•</span>
                              <span>{cand.phone || 'No phone'}</span>
                              <span>•</span>
                              <span>{cand.city}</span>
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-zinc-500 shrink-0">
                            <span>{cand.responsibilities}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeDiffTab === 'updates' && (
                  <>
                    {diffResult.toUpdate.length === 0 ? (
                      <div className="py-8 text-center text-zinc-400 text-xs">
                        No modified fields detected for existing leads.
                      </div>
                    ) : (
                      diffResult.toUpdate.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-blue-50/40 border border-blue-200/70 rounded-xl flex items-start justify-between text-xs gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900">{item.existingLead.name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                ({item.existingLead.leadId})
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {item.changes.map((chg, cIdx) => (
                                <div key={cIdx} className="text-[11px] font-medium text-blue-700 flex items-center gap-1.5">
                                  <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span>{chg}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                            Row {item.incoming.rawRowIndex}
                          </span>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeDiffTab === 'unchanged' && (
                  <div className="space-y-1.5">
                    {diffResult.unchanged.slice(0, 15).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-zinc-50 border border-zinc-200/60 rounded-lg flex items-center justify-between text-[11px] text-zinc-600"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-medium text-zinc-800">{item.existingLead.name}</span>
                          <span className="text-zinc-400">({item.existingLead.email})</span>
                        </div>
                        <span className="text-zinc-500">{item.existingLead.status}</span>
                      </div>
                    ))}
                    {diffResult.unchanged.length > 15 && (
                      <div className="text-center text-[11px] text-zinc-400 py-1">
                        + {diffResult.unchanged.length - 15} more leads already in perfect parity
                      </div>
                    )}
                  </div>
                )}

                {activeDiffTab === 'removed' && (
                  <div className="space-y-2">
                    {diffResult.toRemove.length === 0 ? (
                      <div className="py-8 text-center text-zinc-400 text-xs">
                        All leads in your CRM are present in the Google Sheet. Perfect 1-to-1 parity!
                      </div>
                    ) : (
                      <>
                        <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-lg text-[11px] text-rose-800 flex items-center justify-between">
                          <span>
                            These {diffResult.toRemove.length} leads were not found in this Google Sheet. In strict mirror mode, they will be pruned to match the {diffResult.totalSheetRows} sheet entries.
                          </span>
                        </div>
                        {diffResult.toRemove.map((lead) => (
                          <div
                            key={lead.id}
                            className="p-3 bg-rose-50/40 border border-rose-200/70 rounded-xl flex items-center justify-between text-xs gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-900">{lead.name}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">{lead.leadId}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                                  {lead.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                                <span>{lead.email || 'No email'}</span>
                                <span>•</span>
                                <span>{lead.phone || 'No phone'}</span>
                                <span>•</span>
                                <span>Source: {lead.source || 'Other'}</span>
                              </div>
                            </div>

                            <span className="text-[11px] text-rose-600 font-semibold px-2 py-0.5 bg-rose-100 rounded">
                              Will be removed
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Sync Preference Options */}
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 space-y-2 text-xs">
                <span className="font-bold text-zinc-900 block text-[11px] uppercase tracking-wider">
                  Sync Rules & Options
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-zinc-800 p-2.5 rounded-lg border border-amber-300 bg-amber-50/70 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={removeNotInSheet}
                      onChange={(e) => setRemoveNotInSheet(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-900">Strict Google Sheet Mirror (1:1 Exact Parity)</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900">Active</span>
                      </div>
                      <span className="text-[11px] text-amber-700 block mt-0.5">
                        Display only the {diffResult.totalSheetRows} leads from the Google Sheet and remove any leads not present in this sheet ({diffResult.toRemove.length} non-sheet leads).
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                    <input
                      type="checkbox"
                      checked={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                    />
                    <span>Update statuses to match Google Sheet</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                    <input
                      type="checkbox"
                      checked={updateFields}
                      onChange={(e) => setUpdateFields(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                    />
                    <span>Update phone, CV, city & brand assignment</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                    <input
                      type="checkbox"
                      checked={updateStudents}
                      onChange={(e) => setUpdateStudents(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                    />
                    <span>Sync matching Student records on Intern Wall</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                    <input
                      type="checkbox"
                      checked={rememberConfig}
                      onChange={(e) => setRememberConfig(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                    />
                    <span>Save sheet link for 1-click Quick Sync</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 text-zinc-700 hover:bg-zinc-100 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePrimaryButtonClick}
            disabled={isApplying}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm flex items-center justify-center gap-2 select-none touch-manipulation active:scale-[0.98] ${
              isApplying
                ? 'bg-emerald-700 text-white opacity-80 cursor-wait'
                : !diffResult
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-md'
                : diffResult.toCreate.length === 0 &&
                  diffResult.toUpdate.length === 0 &&
                  (!removeNotInSheet || diffResult.toRemove.length === 0)
                ? 'bg-zinc-800 hover:bg-zinc-900 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 hover:shadow-md'
            }`}
          >
            {isApplying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Applying Parity Changes...</span>
              </>
            ) : isFetching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Fetching Sheet Preview...</span>
              </>
            ) : !diffResult ? (
              <>
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>
                  {sheetUrl.trim() || pastedData.trim()
                    ? 'Fetch & Preview Sheet Mirror'
                    : 'Fetch & Sync with Google Sheet'}
                </span>
              </>
            ) : diffResult.toCreate.length === 0 &&
              diffResult.toUpdate.length === 0 &&
              (!removeNotInSheet || diffResult.toRemove.length === 0) ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>In 100% Parity ({diffResult.totalSheetRows} Leads)</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>
                  Confirm & Mirror Sheet ({diffResult.totalSheetRows} Leads in CRM)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
