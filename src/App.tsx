import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AccountView } from './components/account/AccountView';
import { AdminView } from './components/admin/AdminView';
import { ToastProvider } from './components/common/ToastProvider';
import { ExamsView } from './components/exams/ExamsView';
import { GamesView } from './components/games/GamesView';
import { GrammarView } from './components/grammar/GrammarView';
import { HomeView } from './components/home/HomeView';
import { Navbar } from './components/layout/Navbar';
import { TranslateView } from './components/translate/TranslateView';
import { VocabularyView } from './components/vocabulary/VocabularyView';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { AppSection } from './types';

function getInitialSection(): AppSection {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return 'admin';
  }
  return 'home';
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
          <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-6 space-y-3 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Đã xảy ra lỗi ứng dụng
            </h2>
            <p className="text-sm text-slate-600 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const { firebaseStatus } = useAuth();
  const [activeSection, setActiveSection] = useState<AppSection>(getInitialSection);

  useEffect(() => {
    const handlePopState = () => {
      setActiveSection(getInitialSection());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (section: AppSection) => {
    setActiveSection(section);
    const nextPath = section === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar activeSection={activeSection} onNavigate={navigate} />

      {!firebaseStatus.connected && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-center text-xs sm:text-sm font-medium text-rose-900">
          {firebaseStatus.error || 'Mất kết nối tới Firebase. Một số dữ liệu có thể chưa được đồng bộ.'}
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeSection === 'home' && <HomeView onNavigate={navigate} />}
        {activeSection === 'vocabulary' && <VocabularyView />}
        {activeSection === 'grammar' && <GrammarView />}
        {activeSection === 'translate' && <TranslateView />}
        {activeSection === 'games' && <GamesView />}
        {activeSection === 'exams' && <ExamsView />}
        {activeSection === 'account' && <AccountView />}
        {activeSection === 'admin' && <AdminView />}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>ENGLISH LEARNING · Hệ thống học tập &amp; giảng dạy tiếng Anh Lớp 1–12</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="hover:text-slate-800 cursor-pointer"
            >
              Trang chủ
            </button>
            <button
              type="button"
              onClick={() => navigate('account')}
              className="hover:text-slate-800 cursor-pointer"
            >
              Tài khoản
            </button>
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="hover:text-slate-800 cursor-pointer"
            >
              Trang Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}
