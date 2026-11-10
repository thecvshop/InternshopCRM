import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Key,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  Sliders,
  History,
  FileCode,
  Check,
  X,
  Eye,
  EyeOff,
  Trash2,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  getGeminiConfig,
  testGeminiConnection,
  saveGeminiConfig,
  GeminiConfigState,
  AiOperationLog,
} from '../../services/geminiService';
import { AI_PROMPT_TEMPLATES } from '../../services/aiPromptTemplates';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';

const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recommended)', desc: 'Fastest latency, best for real-time brief parsing and WhatsApp synthesis' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', desc: 'Highest reasoning capability for complex client instructions' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Stable previous generation workhorse' },
];

export const GeminiSettingsView: React.FC = () => {
  const { role, user } = useAuth();

  // Settings State
  const [config, setConfig] = useState<GeminiConfigState>({
    status: 'Connected',
    model: 'gemini-3.8-flash',
    hasKey: true,
    maskedKey: '••••••••••••••••',
  });
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKeyInput, setModalKeyInput] = useState('');
  const [modalModelInput, setModalModelInput] = useState('gemini-3.8-flash');
  const [showKeyText, setShowKeyText] = useState(false);
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestStatus, setModalTestStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Operations Audit Log
  const [operationsLog, setOperationsLog] = useState<AiOperationLog[]>([]);

  // RBAC Access Check
  const isAdmin = role === 'Administrator';

  useEffect(() => {
    loadConfig();

    // Subscribe to Firestore aiOperations log
    try {
      const q = query(
        collection(db, 'aiOperations'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const logs: AiOperationLog[] = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...(doc.data() as any) });
        });
        setOperationsLog(logs);
      }, (err) => {
        console.debug('aiOperations listener info:', err.message);
      });
      return () => unsub();
    } catch (e) {
      // Ignore initial setup errors
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await getGeminiConfig();
      setConfig(data);
      if (data.model) setSelectedModel(data.model);
    } catch (err) {
      console.warn('Config fetch fallback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTest = async (keyToTest?: string, modelToTest?: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiConnection(keyToTest, modelToTest || selectedModel);
      setTestResult(res);
      if (res.success) {
        showToast('✓ Gemini API connection test passed');
        setConfig((prev) => ({ ...prev, status: 'Connected' }));
      } else {
        showToast(`Connection test failed: ${res.message}`);
        setConfig((prev) => ({ ...prev, status: 'Error', error: res.message }));
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      showToast(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleModalTest = async () => {
    setModalTesting(true);
    setModalTestStatus(null);
    try {
      const res = await testGeminiConnection(modalKeyInput || undefined, modalModelInput);
      if (res.success) {
        setModalTestStatus('✓ Gemini connected successfully');
      } else {
        setModalTestStatus(`✕ Connection failed: ${res.message}`);
      }
    } catch (err: any) {
      setModalTestStatus(`✕ Error: ${err.message}`);
    } finally {
      setModalTesting(false);
    }
  };

  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveGeminiConfig({
        apiKey: modalKeyInput.trim() || undefined,
        model: modalModelInput,
        userEmail: user?.email || 'admin@internshome.com',
      });

      if (res.success) {
        showToast('✓ Gemini configuration updated successfully');
        setIsModalOpen(false);
        setModalKeyInput('');
        setModalTestStatus(null);
        await loadConfig();
      } else {
        showToast(`Failed to save: ${res.message}`);
      }
    } catch (err: any) {
      showToast(`Error saving configuration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // RBAC Barrier
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs mt-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-zinc-900">Administrator Access Required</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Gemini API credentials, service keys, and server architecture settings can only be accessed and modified by an Administrator role.
        </p>
        <div className="pt-2">
          <span className="text-[11px] font-mono px-3 py-1 bg-zinc-100 rounded-full text-zinc-600">
            Current role: {role}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION (Section 15) */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                <Cpu className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                AI Configuration
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Job Creator &gt; Settings &gt; Gemini API
            </p>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                config.status === 'Connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : config.status === 'Error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  config.status === 'Connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : config.status === 'Error'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              <span>{config.status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* GEMINI INTEGRATION CARD (Section 15 & 16) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Gemini</h2>
              <p className="text-[11px] text-zinc-500">Google Gemini GenAI TS SDK Integration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting}
              onClick={() => handleRunTest()}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalModelInput(config.model || selectedModel);
                setModalKeyInput('');
                setModalTestStatus(null);
                setIsModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Configure Key</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Security Notice */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-2.5 text-xs text-zinc-600">
            <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-zinc-800">Server-Side Security Enforced</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Raw Gemini API keys are never stored in Firestore and never transmitted to client JavaScript. AI brief parsing is executed through secured server routes.
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Active Gemini Model
              </label>
              <select
                value={selectedModel}
                onChange={async (e) => {
                  const newModel = e.target.value;
                  setSelectedModel(newModel);
                  await saveGeminiConfig({
                    model: newModel,
                    userEmail: user?.email || 'admin@internshome.com',
                  });
                  showToast(`Model switched to ${newModel}`);
                }}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-medium"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                API Key Configuration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="Gemini API: ••••••••••••••••"
                  className="flex-1 px-3 py-2 text-xs bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 font-mono select-none"
                />
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
                >
                  Replace Key
                </button>
              </div>
            </div>
          </div>

          {/* Connection Test Output */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span className="font-semibold">{testResult.message}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">
                Tested on server: {selectedModel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CENTRALIZED AI PROMPT TEMPLATES (Section 19) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-zinc-700" />
            <h2 className="text-sm font-bold text-zinc-900">AI Prompt Templates</h2>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Centralized prompt library used by Gemini for Rent an Intern parsing
          </p>
        </div>

        <div className="divide-y divide-zinc-100">
          {Object.entries(AI_PROMPT_TEMPLATES).map(([key, template]) => (
            <div key={key} className="p-4 space-y-2 hover:bg-zinc-50/50 transition">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-900">{template.name}</span>
                  <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                    v{template.version}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500">{template.description}</p>
              <pre className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-mono text-zinc-700 whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
                {template.template}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* AI OPERATIONS HISTORY AUDIT LOG (Section 20) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-700" />
              <h2 className="text-sm font-bold text-zinc-900">AI Operations History</h2>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Live audit trail of Gemini operations from Firestore (no sensitive keys stored)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Operation Type</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Requested By</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {operationsLog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    <History className="w-6 h-6 mx-auto mb-1 text-zinc-300" />
                    No recent AI operations recorded. Analyze a brief in AI Form to see audit records.
                  </td>
                </tr>
              ) : (
                operationsLog.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-zinc-50">
                    <td className="py-2.5 px-4 font-semibold text-zinc-900">
                      {log.operationType}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600">
                      {log.model}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600">
                      {log.requestedBy}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'Success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">
                      {log.latencyMs ? `${log.latencyMs}ms` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIGURE GEMINI API MODAL (Section 16) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Configure Gemini API</h3>
                <p className="text-xs text-zinc-500">Provide an API key to update the server AI engine</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Gemini Model
                </label>
                <select
                  value={modalModelInput}
                  onChange={(e) => setModalModelInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    placeholder="Enter AIzaSy... (leave blank to keep current server key)"
                    value={modalKeyInput}
                    onChange={(e) => setModalKeyInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  The key is passed directly to the secure server process and never written to Firestore.
                </p>
              </div>

              {/* In-dialog test connection status */}
              {modalTestStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold ${
                    modalTestStatus.startsWith('✓')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {modalTestStatus}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  disabled={modalTesting}
                  onClick={handleModalTest}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${modalTesting ? 'animate-spin' : ''}`} />
                  <span>{modalTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-xs transition cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
