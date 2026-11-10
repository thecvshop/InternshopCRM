import React, { useState } from 'react';
import { Search, Plus, Database, Sparkles, Trash2, ShieldCheck, ChevronDown, Check, RefreshCw, LogIn, LogOut, User as UserIcon, UploadCloud } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { UserRole } from '../../types/crm';
import { seedDemoData, clearDemoData } from '../../services/demoDataService';
import { importActualDatabase } from '../../services/actualDataService';
import { runFirebaseConnectionTest } from '../../lib/firebase/testConnection';

interface NavbarProps {
  onOpenQuickCreate: () => void;
  onOpenCommandPalette: () => void;
  activeViewTitle: string;
}

const ALL_ROLES: UserRole[] = [
  'Administrator',
  'Operations',
  'Trainer',
  'Placement Team',
  'HR',
  'Finance',
  'Company POC',
  'Student',
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQuickCreate,
  onOpenCommandPalette,
  activeViewTitle,
}) => {
  const { profile, role, setRole, currentUser, signInWithGoogle, signOut } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string | null>(null);

  const handleSyncActualDatabase = async () => {
    setIsSeeding(true);
    try {
      const stats = await importActualDatabase();
      setDbStatusMsg(`Synced Actual Database! ${stats.studentsCount} Students, ${stats.leadsCount} Leads, ${stats.placementsCount} Placements, ${stats.companiesCount} Companies`);
      setTimeout(() => setDbStatusMsg(null), 6000);
    } catch (err) {
      console.error(err);
      alert('Error syncing actual database: ' + err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeed = async () => {
    if (confirm('Load realistic demo data (Students, Leads, Companies, Roles, Invoices) into live Firestore?')) {
      setIsSeeding(true);
      try {
        await seedDemoData();
        setDbStatusMsg('Demo data seeded into Firestore!');
        setTimeout(() => setDbStatusMsg(null), 3000);
      } catch (err) {
        console.error(err);
        alert('Seeding error: ' + err);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const handleClearDemo = async () => {
    if (confirm('Remove all demo tagged records from live Firestore?')) {
      setIsSeeding(true);
      try {
        await clearDemoData();
        setDbStatusMsg('Demo records removed from Firestore.');
        setTimeout(() => setDbStatusMsg(null), 3000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTestingDb(true);
    const result = await runFirebaseConnectionTest();
    setIsTestingDb(false);
    if (result.success) {
      setDbStatusMsg('Firestore live ping cycle verified (Write -> Read -> Delete)!');
    } else {
      setDbStatusMsg(`Connection warning: ${result.error}`);
    }
    setTimeout(() => setDbStatusMsg(null), 4000);
  };

  return (
    <header className="h-16 border-b border-zinc-200/80 bg-white/95 backdrop-blur-xs px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Title & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{activeViewTitle}</h2>
        {dbStatusMsg && (
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full animate-fade-in flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            {dbStatusMsg}
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Search / Command trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 transition cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick Search...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-zinc-200 rounded font-mono text-zinc-400">
            ⌘K
          </kbd>
        </button>

        {/* Live Firestore status ping button */}
        <button
          onClick={handleTestConnection}
          disabled={isTestingDb}
          title="Verify real-time read/write sync with Firestore"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs text-zinc-600 transition cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          <span className="font-medium">Live Firestore</span>
          {isTestingDb && <RefreshCw className="w-3 h-3 animate-spin text-zinc-500" />}
        </button>

        {/* Database Sync Controls */}
        <button
          onClick={handleSyncActualDatabase}
          disabled={isSeeding}
          title="Import and synchronize all 77 real applicants, batches, partner companies, and placements"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{isSeeding ? 'Syncing Real Data...' : 'Sync Real Database (77)'}</span>
        </button>

        {/* Demo Data management (for Administrator) */}
        {role === 'Administrator' && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearDemo}
              disabled={isSeeding}
              title="Purge all records"
              className="p-1.5 text-xs text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Create Button */}
        <button
          onClick={onOpenQuickCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Quick Create</span>
        </button>

        {/* RBAC Role Selector */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>{role}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Switch RBAC Role (Live)
              </div>
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left cursor-pointer transition ${
                    role === r ? 'bg-zinc-100 font-semibold text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span>{r}</span>
                  {role === r && <Check className="w-3.5 h-3.5 text-zinc-900" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Account / Google Sign In */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs text-zinc-700 transition cursor-pointer"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-[10px]">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="max-w-[100px] truncate font-medium">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 border-b border-zinc-100 mb-1">
                  <p className="text-xs font-semibold text-zinc-900 truncate">
                    {currentUser.displayName || 'Authenticated User'}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">{currentUser.email}</p>
                </div>
                <button
                  onClick={async () => {
                    setUserDropdownOpen(false);
                    await signOut();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            title="Sign in with your Google Workspace / Google Account"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition cursor-pointer shadow-2xs"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
