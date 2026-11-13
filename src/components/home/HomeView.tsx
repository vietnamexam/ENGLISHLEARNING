import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Gamepad2,
  GraduationCap,
  Languages,
  UserCheck,
} from 'lucide-react';
import heroEnglishImg from '../../assets/images/hero_english_learning_1794580198925.jpg';
import { useAuth } from '../../context/AuthContext';
import type { AppSection } from '../../types';

interface HomeViewProps {
  onNavigate: (section: AppSection) => void;
}

const HERO_IMAGE_PATH = heroEnglishImg;

const MODULES: {
  id: AppSection;
  index: string;
  title: string;
  meta: string;
  description: string;
  icon: typeof BookOpen;
}[] = [
  {
    id: 'vocabulary',
    index: '01',
    title: 'Học từ vựng',
    meta: '15 chủ đề · IPA · Phát âm Song ngữ',
    description:
      'Tra cứu nhanh từ tiếng Việt sang tiếng Anh theo 15 chủ đề quen thuộc, xem phiên âm IPA, ví dụ thực tế và ôn tập thẻ ghi nhớ.',
    icon: BookOpen,
  },
  {
    id: 'grammar',
    index: '02',
    title: 'Học ngữ pháp',
    meta: 'Lớp 1–12 · 13 chuyên đề trọng tâm',
    description:
      'Hệ thống công thức, cách dùng, lỗi thường gặp và phân tích câu tiếng Việt trực tiếp cùng trợ lý AI kèm câu mẫu ngẫu nhiên.',
    icon: GraduationCap,
  },
  {
    id: 'translate',
    index: '03',
    title: 'Dịch văn bản',
    meta: 'Anh ↔ Việt · Giữ nguyên cấu trúc',
    description:
      'Dịch chính xác từng từ, câu hoặc đoạn văn dài hai chiều, tích hợp đọc phát âm bản ngữ và giải thích từ khó.',
    icon: Languages,
  },
  {
    id: 'games',
    index: '04',
    title: 'Trò chơi tiếng Anh',
    meta: '6 dạng trò chơi · Chơi tương tác',
    description:
      'Giáo viên tạo và lưu trữ trò chơi ghép từ, điền khuyết, sắp xếp câu, nhìn hình đoán từ và nghe phát âm chọn đáp án.',
    icon: Gamepad2,
  },
  {
    id: 'exams',
    index: '05',
    title: 'Đề kiểm tra',
    meta: 'Nhập Word/PDF · Chấm điểm tự động',
    description:
      'Tải lên đề Word hoặc PDF để chuyển thành bài kiểm tra trực tuyến, kiểm duyệt đáp án, cài đặt thời gian và giới hạn làm bài.',
    icon: ClipboardCheck,
  },
  {
    id: 'account',
    index: '06',
    title: 'Tài khoản cá nhân',
    meta: 'Giáo viên · Quản lý & Import Excel',
    description:
      'Quản lý hồ sơ giáo viên, bảo mật tài khoản Firebase và nhập nhanh danh sách học sinh theo lớp từ tệp Excel.',
    icon: UserCheck,
  },
];

export function HomeView({ onNavigate }: HomeViewProps) {
  const { user, teacherProfile, vipConfig } = useAuth();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span>Nền tảng giáo dục Lớp 1–12</span>
                <span aria-hidden="true">·</span>
                <span>Giáo viên &amp; Học sinh</span>
                {vipConfig.vipModeEnabled && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-700 font-semibold">Chế độ VIP đang bật</span>
                  </>
                )}
              </div>

              <h1
                className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-[1.15]"
                style={{ textWrap: 'balance' }}
              >
                Học tiếng Anh thông minh từ Lớp 1 đến Lớp 12
              </h1>

              <p className="text-base leading-relaxed text-slate-600 max-w-2xl">
                Không gian học tập và giảng dạy toàn diện: tra cứu từ vựng kèm IPA, làm chủ ngữ
                pháp phổ thông, dịch thuật hai chiều, tổ chức trò chơi tương tác và số hóa đề kiểm
                tra từ Word, PDF.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('vocabulary')}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Bắt đầu học từ vựng
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate(user ? 'exams' : 'account')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                {user
                  ? `Không gian giáo viên (${teacherProfile?.accountType || 'FREE'})`
                  : 'Đăng nhập giáo viên'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-100 border-t lg:border-t-0 lg:border-l border-slate-200 min-h-[220px] relative">
            {!imgError ? (
              <img
                src={HERO_IMAGE_PATH}
                alt="Sách giáo khoa tiếng Anh và dụng cụ học tập"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-emerald-50 p-8 text-center">
                <GraduationCap className="h-12 w-12 text-sky-600 mb-3" />
                <p className="font-display text-base font-semibold text-slate-800">
                  ENGLISH LEARNING
                </p>
                <p className="text-xs text-slate-500 mt-1">Từ vựng · Ngữ pháp · Đề kiểm tra</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6 Core Modules Grid */}
      <section aria-labelledby="modules-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 id="modules-heading" className="font-display text-2xl font-bold text-slate-900">
              Chức năng chính
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Chọn mô-đun học tập hoặc công cụ giảng dạy phù hợp với nhu cầu của bạn.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className="group text-left rounded-2xl border border-slate-200 bg-white p-6 hover:border-sky-300 hover:shadow-sm transition-all flex flex-col justify-between gap-5 cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-slate-400 tabular-nums">
                      {mod.index}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{mod.meta}</p>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-600">{mod.description}</p>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-semibold text-sky-700">
                  <span>Mở chức năng</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
