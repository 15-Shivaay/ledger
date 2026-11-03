import React, { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useLanguage } from './context/LanguageContext';
import { setAuthTokenProvider } from './services/api';
import DashboardPage from './pages/DashboardPage';
import CallQueuePage from './pages/CallQueuePage';
import SignInPage from './pages/SignInPage';
import AccessDenied from './components/AccessDenied';
import SettingsModal from './components/SettingsModal';
import BackupModal from './components/BackupModal';

export default function App() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const [currentView, setCurrentView] = useState('ledger'); // 'ledger' | 'calls'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [settings, setSettings] = useState({ zeroBalanceAction: 'delete', currency: 'INR' });

  useEffect(() => {
    if (getToken) {
      setAuthTokenProvider(getToken);
    }
  }, [getToken]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-pulse mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-300">
          {t('app.loading')}
        </p>
      </div>
    );
  }

  // Unauthenticated user -> Show official Clerk sign in
  if (!isSignedIn) {
    return <SignInPage />;
  }

  // Check admin authorization
  // Evaluates user.publicMetadata.role === 'admin', unsafeMetadata, or org admin
  const publicRole = user?.publicMetadata?.role;
  const unsafeRole = user?.unsafeMetadata?.role;
  const isOrgAdmin = user?.organizationMemberships?.some(
    (m) => m.role === 'admin' || m.role === 'org:admin'
  );

  const isAdmin = publicRole === 'admin' || unsafeRole === 'admin' || isOrgAdmin;

  // Signed in but lacking admin role -> Show bilingual Access Denied screen
  if (!isAdmin) {
    return <AccessDenied />;
  }

  // Authorized Admin -> Show Dashboard or Call Queue
  return (
    <>
      {currentView === 'calls' ? (
        <CallQueuePage
          onBackToLedger={() => setCurrentView('ledger')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenBackup={() => setIsBackupOpen(true)}
        />
      ) : (
        <DashboardPage
          currentView={currentView}
          onToggleView={setCurrentView}
        />
      )}

      {/* Shared Modals accessible from Call Queue & Ledger */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSave={async (newSet) => {
          const res = await api.updateSettings(newSet);
          if (res.success) setSettings(res.data);
        }}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />
    </>
  );
}

