import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AppSection } from '../../types';

interface NavbarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'vocabulary', label: 'Từ vựng' },
  { id: 'grammar', label: 'Ngữ pháp' },
  { id: 'translate', label: 'Dịch thuật' },
  { id: 'games', label: 'Trò chơi' },
  { id: 'exams', label: 'Đề kiểm tra' },
];

export function Navbar({ activeSection, onNavigate }: NavbarProps) {
  const { user, teacherProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (section: AppSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-sky-700 transition-colors cursor-pointer"
        >
          ENGLISH LEARNING
        </button>

        {/* Zone 2: Concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive ? 'text-sky-700 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[21px] h-0.5 bg-sky-600" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => handleNav('admin')}
            className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeSection === 'admin' ? 'text-sky-700 font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Admin
            {activeSection === 'admin' && (
              <span className="absolute inset-x-0 -bottom-[21px] h-0.5 bg-sky-600" />
            )}
          </button>
        </nav>

        {/* Zone 3: 1 primary action + mobile menu trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('account')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'account'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {user ? teacherProfile?.fullName || 'Tài khoản' : 'Tài khoản'}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium ${
              activeSection === 'home' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Trang chủ
          </button>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium ${
                activeSection === item.id
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNav('account')}
            className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium ${
              activeSection === 'account'
                ? 'bg-sky-50 text-sky-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Tài khoản cá nhân &amp; Học sinh
          </button>
          <button
            type="button"
            onClick={() => handleNav('admin')}
            className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium ${
              activeSection === 'admin'
                ? 'bg-sky-50 text-sky-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Quản trị Admin
          </button>
        </div>
      )}
    </header>
  );
}
