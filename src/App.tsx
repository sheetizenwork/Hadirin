import React, { useState } from 'react';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AddGuestModal } from './components/AddGuestModal';
import { AuthPage } from './components/pages/AuthPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { EventAndGuestsPage } from './components/pages/EventAndGuestsPage';
import { QRScannerPage } from './components/pages/QRScannerPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { EventSettingsPage } from './components/pages/EventSettingsPage';
import { MonitorDisplayPage } from './components/pages/MonitorDisplayPage';
import { MonitorSettingsPage } from './components/pages/MonitorSettingsPage';

const MainAppContent: React.FC = () => {
  const { user, activeTab, setActiveTab, isLoading } = useAttendance();
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);

  // Sync URL path /monitor with activeTab on initial mount & popstate
  React.useEffect(() => {
    const checkPath = () => {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/monitor' || pathname.startsWith('/monitor')) {
        setActiveTab('monitor');
      }
    };
    checkPath();
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, [setActiveTab]);

  // Keep window.location.pathname in sync when user switches tabs
  React.useEffect(() => {
    if (activeTab === 'monitor') {
      if (window.location.pathname !== '/monitor') {
        window.history.pushState({}, '', '/monitor');
      }
    } else {
      if (window.location.pathname === '/monitor') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [activeTab]);

  // If loading session
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-mono tracking-wider">Menghubungkan ke Supabase...</p>
      </div>
    );
  }

  // If user is accessing /monitor or 'monitor' tab, show immersive full screen without login or with login
  if (activeTab === 'monitor' || window.location.pathname === '/monitor') {
    return (
      <MonitorDisplayPage
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setActiveTab('dashboard');
        }}
        onOpenSettings={() => {
          window.history.pushState({}, '', '/');
          setActiveTab('monitor_settings');
        }}
      />
    );
  }

  // If user is not logged in, render clean AuthPage
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* 1. Desktop Left Sidebar */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <HeaderBar onOpenAddGuest={() => setIsAddGuestModalOpen(true)} />

        {/* Dynamic Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage onOpenAddGuest={() => setIsAddGuestModalOpen(true)} />
          )}

          {activeTab === 'guests' && (
            <EventAndGuestsPage
              onOpenAddGuest={() => setIsAddGuestModalOpen(true)}
            />
          )}

          {activeTab === 'scanner' && <QRScannerPage />}

          {activeTab === 'reports' && <ReportsPage />}

          {activeTab === 'monitor_settings' && <MonitorSettingsPage />}

          {activeTab === 'event_settings' && <EventSettingsPage />}
        </main>
      </div>

      {/* 3. Global Add Guest Modal (Can open from Beranda, Header, and Tamu) */}
      <AddGuestModal
        isOpen={isAddGuestModalOpen}
        onClose={() => setIsAddGuestModalOpen(false)}
      />

      {/* 4. Mobile Thumb Bottom Bar */}
      <MobileBottomNav />
    </div>
  );
};

export default function App() {
  return (
    <AttendanceProvider>
      <MainAppContent />
    </AttendanceProvider>
  );
}
