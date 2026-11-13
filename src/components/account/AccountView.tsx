import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type { StudentRecord } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';

const PAGE_SIZE = 10;

export function AccountView() {
  const {
    user,
    teacherProfile,
    vipConfig,
    canUseVipFeatures,
    loading: authLoading,
    registerTeacher,
    loginWithPhone,
    loginWithGoogle,
    logout,
    updateTeacherInfo,
    changePassword,
  } = useAuth();
  const { showToast } = useToast();

  // Auth form state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Dashboard sub-tab
  const [activeTab, setActiveTab] = useState<'profile' | 'students'>('profile');

  // Profile edit & password change
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // Students management
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Add/Edit student modal state
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [stOrder, setStOrder] = useState(1);
  const [stName, setStName] = useState('');
  const [stClass, setStClass] = useState('');
  const [stDob, setStDob] = useState('');
  const [stCode, setStCode] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  // Excel import preview
  const [importPreview, setImportPreview] = useState<
    { orderNumber: number; fullName: string; className: string; dateOfBirth: string; studentCode: string }[]
  >([]);
  const [importingExcel, setImportingExcel] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  useEffect(() => {
    if (teacherProfile) {
      setEditName(teacherProfile.fullName || '');
      setEditPhone(teacherProfile.phone || '');
    }
  }, [teacherProfile]);

  useEffect(() => {
    if (!user) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    const q = query(collection(db, 'students'), where('teacherId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as StudentRecord)
          .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
        setStudents(list);
        setLoadingStudents(false);
      },
      (error) => {
        setLoadingStudents(false);
        handleFirestoreError(error, OperationType.LIST, 'students');
      }
    );
    return () => unsub();
  }, [user]);

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.className).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      const classOk = classFilter === 'all' || s.className === classFilter;
      if (!classOk) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    });
  }, [students, studentSearch, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAuth(true);
    try {
      if (authTab === 'register') {
        await registerTeacher(fullName, phone, password);
        showToast('Đăng ký tài khoản giáo viên thành công!', 'success');
      } else {
        await loginWithPhone(phone, password);
        showToast('Đăng nhập thành công!', 'success');
      }
      setPassword('');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Xác thực thất bại. Vui lòng kiểm tra lại.',
        'error'
      );
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSubmittingAuth(true);
    try {
      await loginWithGoogle();
      showToast('Đăng nhập Google thành công!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Đăng nhập Google thất bại.', 'error');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateTeacherInfo(editName, editPhone);
      showToast('Đã cập nhật thông tin cá nhân.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật thông tin.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPass(true);
    try {
      await changePassword(currPass, newPass);
      setCurrPass('');
      setNewPass('');
      showToast('Đổi mật khẩu thành công!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đổi mật khẩu.', 'error');
    } finally {
      setSavingPass(false);
    }
  };

  const openAddStudent = () => {
    setEditingStudent(null);
    setStOrder(students.length + 1);
    setStName('');
    setStClass('');
    setStDob('');
    setStCode(`HS${String(students.length + 1).padStart(3, '0')}`);
    setStudentModalOpen(true);
  };

  const openEditStudent = (st: StudentRecord) => {
    setEditingStudent(st);
    setStOrder(st.orderNumber);
    setStName(st.fullName);
    setStClass(st.className);
    setStDob(st.dateOfBirth || '');
    setStCode(st.studentCode);
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!stName.trim() || !stClass.trim() || !stCode.trim()) {
      showToast('Vui lòng nhập đầy đủ Họ tên, Lớp và Mã học sinh.', 'error');
      return;
    }

    setSavingStudent(true);
    try {
      const payload = {
        teacherId: user.uid,
        orderNumber: Number(stOrder) || 1,
        fullName: stName.trim(),
        className: stClass.trim(),
        dateOfBirth: stDob.trim(),
        studentCode: stCode.trim(),
        updatedAt: serverTimestamp(),
      };
      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), payload);
        showToast('Đã cập nhật thông tin học sinh.', 'success');
      } else {
        await addDoc(collection(db, 'students'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        showToast('Đã thêm học sinh mới.', 'success');
      }
      setStudentModalOpen(false);
    } catch (error) {
      showToast('Không thể lưu học sinh lên Firebase.', 'error');
      handleFirestoreError(
        error,
        editingStudent ? OperationType.UPDATE : OperationType.CREATE,
        'students'
      );
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;
    setDeletingStudent(true);
    try {
      await deleteDoc(doc(db, 'students', deleteTarget.id));
      showToast(`Đã xóa học sinh "${deleteTarget.fullName}".`, 'success');
      setDeleteTarget(null);
    } catch (error) {
      showToast('Không thể xóa học sinh.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `students/${deleteTarget.id}`);
    } finally {
      setDeletingStudent(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleRows = [
      {
        STT: 1,
        'Họ và tên': 'Nguyễn Minh An',
        Lớp: '6A1',
        'Ngày sinh': '15/05/2014',
        'Mã học sinh': 'HS001',
      },
      {
        STT: 2,
        'Họ và tên': 'Trần Thảo Vy',
        Lớp: '6A1',
        'Ngày sinh': '22/09/2014',
        'Mã học sinh': 'HS002',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HocSinh');
    XLSX.writeFile(wb, 'mau_danh_sach_hoc_sinh.xlsx');
  };

  const handleExcelFileSelect = async (file: File | null) => {
    if (!file) return;
    if (vipConfig.vipModeEnabled && !canUseVipFeatures) {
      showToast(
        'Chế độ VIP đang bật. Vui lòng nâng cấp tài khoản VIP để Import danh sách từ Excel.',
        'error'
      );
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      const parsed = rawRows
        .map((row, idx) => {
          const name = String(row['Họ và tên'] || row['Ho va ten'] || row['fullName'] || '').trim();
          const cls = String(row['Lớp'] || row['Lop'] || row['className'] || '').trim();
          const dob = String(row['Ngày sinh'] || row['Ngay sinh'] || row['dateOfBirth'] || '').trim();
          const code = String(
            row['Mã học sinh'] || row['Ma hoc sinh'] || row['studentCode'] || `HS${idx + 1}`
          ).trim();
          const order = Number(row['STT'] || idx + 1);
          return {
            orderNumber: Number.isFinite(order) ? order : idx + 1,
            fullName: name,
            className: cls,
            dateOfBirth: dob,
            studentCode: code,
          };
        })
        .filter((r) => r.fullName && r.className);

      if (parsed.length === 0) {
        showToast(
          'Không tìm thấy dữ liệu hợp lệ. Cần có cột: STT, Họ và tên, Lớp, Ngày sinh, Mã học sinh.',
          'error'
        );
        return;
      }
      setImportPreview(parsed);
      showToast(`Đã đọc ${parsed.length} học sinh từ file Excel. Nhấn xác nhận để lưu.`, 'info');
    } catch {
      showToast('Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx/.xls.', 'error');
    }
  };

  const handleConfirmImportExcel = async () => {
    if (!user || importPreview.length === 0) return;
    setImportingExcel(true);
    try {
      const batch = writeBatch(db);
      for (const row of importPreview) {
        const ref = doc(collection(db, 'students'));
        batch.set(ref, {
          teacherId: user.uid,
          orderNumber: row.orderNumber,
          fullName: row.fullName,
          className: row.className,
          dateOfBirth: row.dateOfBirth,
          studentCode: row.studentCode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      showToast(`Đã import thành công ${importPreview.length} học sinh lên Firebase.`, 'success');
      setImportPreview([]);
    } catch (error) {
      showToast('Import học sinh thất bại.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'students');
    } finally {
      setImportingExcel(false);
    }
  };

  if (authLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  // Unauthenticated view
  if (!user) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Tài khoản giáo viên
          </h1>
          <p className="text-sm text-slate-600">
            Đăng nhập hoặc đăng ký để quản lý học sinh, từ vựng, trò chơi và đề kiểm tra trên
            Firebase.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAuthTab('login')}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer ${
                authTab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('register')}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer ${
                authTab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Đăng ký mới
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authTab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Họ và tên giáo viên
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingAuth}
              className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-sky-400 transition-colors cursor-pointer"
            >
              {submittingAuth
                ? 'Đang xử lý...'
                : authTab === 'register'
                  ? 'Đăng ký tài khoản giáo viên'
                  : 'Đăng nhập'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-3 text-xs text-slate-400">hoặc</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <button
            type="button"
            disabled={submittingAuth}
            onClick={handleGoogleAuth}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tiếp tục với Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Tài khoản giáo viên</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-bold ${
                teacherProfile?.accountType === 'VIP' ? 'text-amber-700' : 'text-slate-700'
              }`}
            >
              {teacherProfile?.accountType || 'FREE'}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-semibold ${
                teacherProfile?.status === 'locked' ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {teacherProfile?.status === 'locked' ? 'Đã khóa' : 'Đang hoạt động'}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {teacherProfile?.fullName || user.displayName || 'Giáo viên'}
          </h1>
          <p className="text-sm text-slate-600">
            SĐT: {teacherProfile?.phone || 'Chưa cập nhật'} · Email: {teacherProfile?.email || user.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Hồ sơ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'students' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Học sinh ({students.length})
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Tab 1: Profile & Password */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-900">
              Cập nhật thông tin cá nhân
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-600" />
              Đổi mật khẩu tài khoản
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={currPass}
                onChange={(e) => setCurrPass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPass}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {savingPass ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Student Management & Excel Import */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openAddStudent}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Thêm học sinh
                </button>
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Import Excel (.xlsx)
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => handleExcelFileSelect(e.target.files?.[0] || null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải file mẫu
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm tên hoặc mã HS..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-sm"
                  />
                </div>
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === 'all' ? 'Tất cả lớp' : `Lớp ${c}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Excel Import Preview */}
            {importPreview.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-sky-900">
                    Xem trước {importPreview.length} học sinh từ file Excel
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setImportPreview([])}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={importingExcel}
                      onClick={handleConfirmImportExcel}
                      className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer"
                    >
                      {importingExcel ? 'Đang lưu...' : 'Xác nhận lưu tất cả'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">STT</th>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Lớp</th>
                    <th className="px-4 py-3">Ngày sinh</th>
                    <th className="px-4 py-3">Mã học sinh</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Đang tải danh sách học sinh...
                      </td>
                    </tr>
                  ) : paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Chưa có học sinh nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 tabular-nums text-slate-500">
                          {st.orderNumber || (page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{st.fullName}</td>
                        <td className="px-4 py-3 text-slate-700">{st.className}</td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums">
                          {st.dateOfBirth || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {st.studentCode}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditStudent(st)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 cursor-pointer mr-1"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(st)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
                <span className="tabular-nums">
                  Trang {page} / {totalPages} ({filteredStudents.length} học sinh)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {studentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveStudent}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-lg font-bold text-slate-900">
              {editingStudent ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">STT</label>
                <input
                  type="number"
                  min={1}
                  value={stOrder}
                  onChange={(e) => setStOrder(Number(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mã học sinh
                </label>
                <input
                  type="text"
                  required
                  value={stCode}
                  onChange={(e) => setStCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={stName}
                onChange={(e) => setStName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Lớp</label>
                <input
                  type="text"
                  required
                  value={stClass}
                  onChange={(e) => setStClass(e.target.value)}
                  placeholder="VD: 7A2"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ngày sinh (tùy chọn)
                </label>
                <input
                  type="text"
                  value={stDob}
                  onChange={(e) => setStDob(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingStudent}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer"
              >
                {savingStudent ? 'Đang lưu...' : 'Lưu học sinh'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa học sinh"
        message={`Bạn có chắc muốn xóa học sinh "${deleteTarget?.fullName}" (${deleteTarget?.studentCode})?`}
        confirmLabel="Xóa học sinh"
        loading={deletingStudent}
        onConfirm={handleDeleteStudent}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
