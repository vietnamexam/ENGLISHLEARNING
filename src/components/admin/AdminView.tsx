import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit3,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type { TeacherProfile } from '../../types';
import { apiRequest } from '../../utils/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';
import { AdminSampleBankManager } from './AdminSampleBankManager';

const PAGE_SIZE = 10;

export function AdminView() {
  const { user, vipConfig, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [checkingSession, setCheckingSession] = useState(true);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Firestore data
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [firestoreAdminError, setFirestoreAdminError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ students: 0, games: 0, exams: 0 });

  // Search & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Edit teacher modal
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingTeacher, setSavingTeacher] = useState(false);

  // Delete teacher confirm
  const [deleteTarget, setDeleteTarget] = useState<TeacherProfile | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState(false);

  // Change admin password
  const [currAdminPass, setCurrAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Check server-side HttpOnly Admin session
  useEffect(() => {
    apiRequest<{ authenticated: boolean }>('/api/admin/session')
      .then((res) => setAdminAuthenticated(res.authenticated))
      .catch(() => setAdminAuthenticated(false))
      .finally(() => setCheckingSession(false));
  }, []);

  const loadAdminCounts = useCallback(async () => {
    try {
      const [stSnap, gmSnap, exSnap] = await Promise.all([
        getCountFromServer(collection(db, 'students')),
        getCountFromServer(collection(db, 'games')),
        getCountFromServer(collection(db, 'exams')),
      ]);
      setCounts({
        students: stSnap.data().count,
        games: gmSnap.data().count,
        exams: exSnap.data().count,
      });
    } catch {
      // Ignore if Firestore rules require admin Firebase sign-in
    }
  }, []);

  useEffect(() => {
    if (!adminAuthenticated) return;
    setFirestoreAdminError(null);
    loadAdminCounts();

    const unsub = onSnapshot(
      collection(db, 'teachers'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as TeacherProfile);
        setTeachers(list);
        setFirestoreAdminError(null);
      },
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
          setFirestoreAdminError(
            'Để đọc và sửa dữ liệu giáo viên theo Firestore Security Rules, vui lòng xác thực bằng tài khoản Google Admin (vanhayd2@gmail.com).'
          );
        } else {
          setFirestoreAdminError('Không thể kết nối Firestore để tải danh sách giáo viên.');
        }
      }
    );
    return () => unsub();
  }, [adminAuthenticated, user, loadAdminCounts]);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        (t.fullName || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));
  const paginatedTeachers = filteredTeachers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      await apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: adminPasswordInput }),
      });
      setAdminAuthenticated(true);
      setAdminPasswordInput('');
      showToast('Đăng nhập Admin thành công.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Mật khẩu Admin không đúng.', 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    await apiRequest('/api/admin/logout', { method: 'POST' });
    setAdminAuthenticated(false);
    showToast('Đã đăng xuất khỏi trang Admin.', 'info');
  };

  const handleToggleVipMode = async () => {
    try {
      const nextVal = !vipConfig.vipModeEnabled;
      await setDoc(
        doc(db, 'systemConfig', 'vipSettings'),
        {
          vipModeEnabled: nextVal,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || 'admin',
        },
        { merge: true }
      );
      showToast(
        nextVal ? 'Đã BẬT chế độ VIP toàn hệ thống.' : 'Đã TẮT chế độ VIP toàn hệ thống.',
        'success'
      );
    } catch (error) {
      showToast('Không thể cập nhật cấu hình VIP trên Firebase. Hãy kiểm tra quyền Admin Firestore.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'systemConfig/vipSettings');
    }
  };

  const handleToggleTeacherVip = async (teacher: TeacherProfile) => {
    const nextType = teacher.accountType === 'VIP' ? 'FREE' : 'VIP';
    try {
      await updateDoc(doc(db, 'teachers', teacher.uid), {
        accountType: nextType,
        updatedAt: serverTimestamp(),
      });
      showToast(`Đã chuyển tài khoản "${teacher.fullName}" sang ${nextType}.`, 'success');
    } catch (error) {
      showToast('Không thể cập nhật loại tài khoản.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `teachers/${teacher.uid}`);
    }
  };

  const handleToggleTeacherLock = async (teacher: TeacherProfile) => {
    const nextStatus = teacher.status === 'locked' ? 'active' : 'locked';
    try {
      await updateDoc(doc(db, 'teachers', teacher.uid), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      showToast(
        nextStatus === 'locked'
          ? `Đã khóa tài khoản "${teacher.fullName}".`
          : `Đã mở khóa tài khoản "${teacher.fullName}".`,
        'success'
      );
    } catch (error) {
      showToast('Không thể cập nhật trạng thái tài khoản.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `teachers/${teacher.uid}`);
    }
  };

  const handleSaveTeacherEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setSavingTeacher(true);
    try {
      await updateDoc(doc(db, 'teachers', editingTeacher.uid), {
        fullName: editName.trim(),
        phone: editPhone.replace(/\D/g, ''),
        updatedAt: serverTimestamp(),
      });
      showToast('Đã cập nhật thông tin giáo viên.', 'success');
      setEditingTeacher(null);
    } catch (error) {
      showToast('Không thể cập nhật giáo viên.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `teachers/${editingTeacher.uid}`);
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTarget) return;
    setDeletingTeacher(true);
    try {
      await deleteDoc(doc(db, 'teachers', deleteTarget.uid));
      showToast(`Đã xóa hồ sơ giáo viên "${deleteTarget.fullName}".`, 'success');
      setDeleteTarget(null);
    } catch (error) {
      showToast('Không thể xóa tài khoản giáo viên.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `teachers/${deleteTarget.uid}`);
    } finally {
      setDeletingTeacher(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    try {
      await apiRequest('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currAdminPass,
          newPassword: newAdminPass,
        }),
      });
      setCurrAdminPass('');
      setNewAdminPass('');
      showToast('Đổi mật khẩu Admin thành công.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Đổi mật khẩu Admin thất bại.', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang kiểm tra phiên quản trị...
      </div>
    );
  }

  // Dedicated Admin Login Page
  if (!adminAuthenticated) {
    return (
      <div className="max-w-md mx-auto space-y-6 py-4">
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Đăng nhập Quản trị Admin
          </h1>
          <p className="text-sm text-slate-600">
            Trang quản trị hệ thống ENGLISH LEARNING được xác thực riêng ở phía máy chủ.
          </p>
        </div>

        <form
          onSubmit={handleAdminLogin}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <div>
            <label htmlFor="admin-pass" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Mật khẩu Admin
            </label>
            <input
              id="admin-pass"
              type="password"
              required
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              placeholder="Nhập mật khẩu quản trị..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {loggingIn ? 'Đang xác thực...' : 'Đăng nhập Admin'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Bảng điều khiển Admin
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Quản lý tài khoản giáo viên, cấu hình chế độ VIP toàn hệ thống và thống kê dữ liệu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdminLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 self-start cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Đăng xuất Admin
        </button>
      </div>

      {/* Firestore Admin Auth Prompt if needed */}
      {firestoreAdminError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-amber-950">{firestoreAdminError}</p>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            Đăng nhập Google Admin
          </button>
        </div>
      )}

      {/* System Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Số lượng giáo viên', value: teachers.length },
          { label: 'Số lượng học sinh', value: counts.students },
          { label: 'Số lượng trò chơi', value: counts.games },
          { label: 'Số lượng đề thi', value: counts.exams },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">{stat.label}</div>
            <div className="font-display text-3xl font-bold text-slate-900 mt-1 tabular-nums">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Global VIP Configuration */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Cấu hình VIP toàn hệ thống
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            {vipConfig.vipModeEnabled
              ? 'ĐANG BẬT: Chỉ tài khoản giáo viên VIP mới sử dụng được tính năng nâng cao (AI tạo game, đọc đề Word/PDF, Import Excel). Giáo viên FREE bị chặn ở cả giao diện và máy chủ.'
              : 'ĐANG TẮT: Tất cả giáo viên (VIP và FREE) đều được sử dụng đầy đủ các tính năng.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleVipMode}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
            vipConfig.vipModeEnabled
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {vipConfig.vipModeEnabled ? 'BẬT CHẾ ĐỘ VIP (Nhấn để TẮT)' : 'TẮT CHẾ ĐỘ VIP (Nhấn để BẬT)'}
        </button>
      </div>

      {/* Teachers Management Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Danh sách giáo viên ({filteredTeachers.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Mật khẩu</th>
                <th className="px-4 py-3">Loại tài khoản</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Chưa có giáo viên nào trong danh sách.
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((teacher, idx) => (
                  <tr key={teacher.uid} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 tabular-nums text-slate-500">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{teacher.fullName}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {teacher.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">Không hiển thị</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold text-xs ${
                          teacher.accountType === 'VIP' ? 'text-amber-700' : 'text-slate-600'
                        }`}
                      >
                        {teacher.accountType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          teacher.status === 'locked' ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {teacher.status === 'locked' ? 'Đã khóa' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTeacherVip(teacher)}
                        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
                      >
                        {teacher.accountType === 'VIP' ? 'Tắt VIP' : 'Bật VIP'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTeacherLock(teacher)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        {teacher.status === 'locked' ? (
                          <>
                            <Unlock className="h-3 w-3" />
                            Mở khóa
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            Khóa
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeacher(teacher);
                          setEditName(teacher.fullName);
                          setEditPhone(teacher.phone || '');
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(teacher)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
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
              Trang {page} / {totalPages}
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

      {/* Admin Sample Exam Question Bank (Permanent Firebase Storage) */}
      <AdminSampleBankManager
        adminUid={user?.uid}
        adminEmail={user?.email}
        onRequireGoogleAdmin={loginWithGoogle}
      />

      {/* Change Admin Password */}
      <form
        onSubmit={handleChangeAdminPassword}
        className="rounded-2xl border border-slate-200 bg-white p-6 max-w-lg space-y-4"
      >
        <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-700" />
          Đổi mật khẩu Admin
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Mật khẩu Admin hiện tại
          </label>
          <input
            type="password"
            required
            value={currAdminPass}
            onChange={(e) => setCurrAdminPass(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Mật khẩu Admin mới (tối thiểu 8 ký tự)
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={newAdminPass}
            onChange={(e) => setNewAdminPass(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={changingPass}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
        >
          {changingPass ? 'Đang đổi mật khẩu...' : 'Cập nhật mật khẩu Admin'}
        </button>
      </form>

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveTeacherEdit}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-lg font-bold text-slate-900">
              Sửa thông tin giáo viên
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingTeacher}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer"
              >
                {savingTeacher ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa giáo viên"
        message={`Bạn có chắc muốn xóa tài khoản giáo viên "${deleteTarget?.fullName}"?`}
        confirmLabel="Xóa giáo viên"
        loading={deletingTeacher}
        onConfirm={handleDeleteTeacher}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
