import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Edit3,
  FileUp,
  Loader2,
  Play,
  Plus,
  Power,
  Trash2,
  Volume2,
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
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType, storage } from '../../lib/firebase';
import type { ExamQuestion, ExamQuestionType, ExamRecord } from '../../types';
import { apiRequest } from '../../utils/api';
import { speakEnglish } from '../../utils/speech';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';

const QUESTION_TYPE_LABELS: Record<ExamQuestionType, string> = {
  multiple_choice: 'Trắc nghiệm',
  fill_blank: 'Điền từ',
  sentence_order: 'Sắp xếp câu',
  reading: 'Đọc hiểu',
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  listening: 'Nghe hiểu',
  other: 'Dạng khác',
};

export function ExamsView() {
  const { user, canUseVipFeatures, vipConfig } = useAuth();
  const { showToast } = useToast();

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'take'>('list');

  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState(6);
  const [topic, setTopic] = useState('Kiểm tra định kỳ');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [allowViewAnswers, setAllowViewAnswers] = useState(true);
  const [allowRetake, setAllowRetake] = useState(true);
  const [sourceFileUrl, setSourceFileUrl] = useState('');
  const [sourceFileName, setSourceFileName] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [parsingFile, setParsingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ExamRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Student Exam Runner
  const [activeExam, setActiveExam] = useState<ExamRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attemptCount, setAttemptCount] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) {
      setExams([]);
      return;
    }
    setLoadingList(true);
    const q = query(collection(db, 'exams'), where('teacherId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExamRecord);
        setExams(list);
        setLoadingList(false);
      },
      (error) => {
        setLoadingList(false);
        handleFirestoreError(error, OperationType.LIST, 'exams');
      }
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (viewMode !== 'take' || submittedScore !== null || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [viewMode, submittedScore, secondsLeft]);

  const resetEditor = () => {
    setEditingId(null);
    setTitle('');
    setGradeLevel(6);
    setTopic('Kiểm tra định kỳ');
    setDurationMinutes(45);
    setOpenTime('');
    setCloseTime('');
    setMaxScore(10);
    setAllowViewAnswers(true);
    setAllowRetake(true);
    setSourceFileUrl('');
    setSourceFileName('');
    setQuestions([]);
  };

  const handleOpenCreate = () => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản giáo viên để tạo đề kiểm tra.', 'error');
      return;
    }
    resetEditor();
    setViewMode('editor');
  };

  const handleOpenEdit = (exam: ExamRecord) => {
    setEditingId(exam.id);
    setTitle(exam.title);
    setGradeLevel(exam.gradeLevel);
    setTopic(exam.topic);
    setDurationMinutes(exam.durationMinutes);
    setOpenTime(exam.openTime || '');
    setCloseTime(exam.closeTime || '');
    setMaxScore(exam.maxScore);
    setAllowViewAnswers(exam.allowViewAnswers);
    setAllowRetake(exam.allowRetake);
    setSourceFileUrl(exam.sourceFileUrl || '');
    setSourceFileName(exam.sourceFileName || '');
    setQuestions(exam.questions || []);
    setViewMode('editor');
  };

  const handleUploadWordOrPdf = async (file: File | null) => {
    if (!file || !user) return;
    if (vipConfig.vipModeEnabled && !canUseVipFeatures) {
      showToast(
        'Chế độ VIP đang bật. Vui lòng nâng cấp tài khoản VIP để nhập đề Word/PDF tự động.',
        'error'
      );
      return;
    }

    setParsingFile(true);
    try {
      // 1. Store original Word/PDF file in Firebase Storage
      let uploadedUrl = '';
      try {
        const storageRef = ref(storage, `exams/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        uploadedUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('Firebase Storage upload skipped or restricted:', storageErr);
      }

      // 2. Send file to server for Gemini parsing (no guessing!)
      const formData = new FormData();
      formData.append('file', file);
      const parsed = await apiRequest<{
        suggestedTitle: string;
        detectedSections: string[];
        questions: ExamQuestion[];
      }>('/api/gemini/parse-exam', {
        method: 'POST',
        body: formData,
      });

      setSourceFileName(file.name);
      if (uploadedUrl) setSourceFileUrl(uploadedUrl);
      if (!title.trim() && parsed.suggestedTitle) {
        setTitle(parsed.suggestedTitle);
      }
      setQuestions(parsed.questions || []);

      const needReviewCount = (parsed.questions || []).filter((q) => q.needsReview).length;
      if (needReviewCount > 0) {
        showToast(
          `Đã trích xuất ${parsed.questions.length} câu. Có ${needReviewCount} câu chưa rõ đáp án cần giáo viên kiểm tra và xác nhận.`,
          'info'
        );
      } else {
        showToast(`Đã phân tích ${parsed.questions?.length || 0} câu hỏi từ tệp.`, 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đọc tệp đề thi.', 'error');
    } finally {
      setParsingFile(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `eq-${Date.now()}`,
        section: 'Phần I: Trắc nghiệm',
        questionType: 'multiple_choice',
        prompt: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        needsReview: false,
        reviewNote: '',
      },
    ]);
  };

  const handleSaveExam = async () => {
    if (!user) return;
    if (!title.trim()) {
      showToast('Vui lòng nhập tên đề thi.', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('Đề thi phải có ít nhất 1 câu hỏi.', 'error');
      return;
    }

    const pendingReview = questions.filter((q) => q.needsReview || !q.correctAnswer.trim());
    if (pendingReview.length > 0) {
      showToast(
        `Còn ${pendingReview.length} câu hỏi chưa được giáo viên kiểm tra/xác nhận đáp án. Vui lòng hoàn tất trước khi lưu.`,
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        teacherId: user.uid,
        title: title.trim(),
        gradeLevel: Number(gradeLevel),
        topic: topic.trim() || 'Tổng hợp',
        durationMinutes: Number(durationMinutes) || 45,
        openTime,
        closeTime,
        maxScore: Number(maxScore) || 10,
        allowViewAnswers,
        allowRetake,
        isActive: true,
        sourceFileUrl,
        sourceFileName,
        questions,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'exams', editingId), payload);
        showToast('Đã cập nhật đề thi thành công.', 'success');
      } else {
        await addDoc(collection(db, 'exams'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        showToast('Đã lưu đề thi lên Firebase.', 'success');
      }
      setViewMode('list');
      resetEditor();
    } catch (error) {
      showToast('Lỗi khi lưu đề thi lên Firebase.', 'error');
      handleFirestoreError(
        error,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        'exams'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateExam = async (exam: ExamRecord) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'exams'), {
        teacherId: user.uid,
        title: `${exam.title} (Bản sao)`,
        gradeLevel: exam.gradeLevel,
        topic: exam.topic,
        durationMinutes: exam.durationMinutes,
        openTime: exam.openTime || '',
        closeTime: exam.closeTime || '',
        maxScore: exam.maxScore,
        allowViewAnswers: exam.allowViewAnswers,
        allowRetake: exam.allowRetake,
        isActive: exam.isActive,
        sourceFileUrl: exam.sourceFileUrl || '',
        sourceFileName: exam.sourceFileName || '',
        questions: exam.questions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('Đã sao chép đề thi.', 'success');
    } catch (error) {
      showToast('Không thể sao chép đề thi.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'exams');
    }
  };

  const handleToggleExamStatus = async (exam: ExamRecord) => {
    try {
      await updateDoc(doc(db, 'exams', exam.id), {
        isActive: !exam.isActive,
        updatedAt: serverTimestamp(),
      });
      showToast(
        !exam.isActive ? 'Đã bật trạng thái mở đề thi.' : 'Đã tạm đóng đề thi.',
        'success'
      );
    } catch (error) {
      showToast('Không thể thay đổi trạng thái đề thi.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `exams/${exam.id}`);
    }
  };

  const handleDeleteExam = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'exams', deleteTarget.id));
      showToast(`Đã xóa đề thi "${deleteTarget.title}".`, 'success');
      setDeleteTarget(null);
    } catch (error) {
      showToast('Không thể xóa đề thi.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `exams/${deleteTarget.id}`);
    } finally {
      setDeleting(false);
    }
  };

  const startExam = (exam: ExamRecord) => {
    if (!exam.isActive) {
      showToast('Đề thi này hiện đang tắt.', 'error');
      return;
    }
    const now = Date.now();
    if (exam.openTime && new Date(exam.openTime).getTime() > now) {
      showToast('Chưa tới thời gian mở đề thi.', 'error');
      return;
    }
    if (exam.closeTime && new Date(exam.closeTime).getTime() < now) {
      showToast('Đề thi đã hết thời gian mở.', 'error');
      return;
    }
    if (!exam.allowRetake && (attemptCount[exam.id] || 0) >= 1) {
      showToast('Đề thi này không cho phép làm lại.', 'error');
      return;
    }

    setActiveExam(exam);
    setAnswers({});
    setSubmittedScore(null);
    setSecondsLeft((exam.durationMinutes || 45) * 60);
    setViewMode('take');
  };

  const submitExam = () => {
    if (!activeExam) return;
    const totalPoints = activeExam.questions.reduce((acc, q) => acc + (Number(q.points) || 1), 0);
    let earned = 0;
    for (const q of activeExam.questions) {
      const userAns = (answers[q.id] || '').trim().toLowerCase();
      const rightAns = (q.correctAnswer || '').trim().toLowerCase();
      if (userAns && userAns === rightAns) {
        earned += Number(q.points) || 1;
      }
    }
    const scaled =
      totalPoints > 0 ? Math.round(((earned / totalPoints) * activeExam.maxScore) * 100) / 100 : 0;
    setSubmittedScore(scaled);
    setAttemptCount((prev) => ({ ...prev, [activeExam.id]: (prev[activeExam.id] || 0) + 1 }));
    showToast(`Đã nộp bài! Điểm đạt được: ${scaled}/${activeExam.maxScore}`, 'success');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // TAKE EXAM MODE
  if (viewMode === 'take' && activeExam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Thoát bài thi
          </button>

          <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
            Thời gian còn lại: <span className="text-sky-700">{formatTimer(secondsLeft)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="text-xs text-slate-500">
              Lớp {activeExam.gradeLevel} · {activeExam.topic} · Điểm tối đa {activeExam.maxScore}
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
              {activeExam.title}
            </h2>
          </div>

          {submittedScore !== null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-emerald-900">Kết quả bài làm</div>
                <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                  {submittedScore} / {activeExam.maxScore} điểm
                </p>
              </div>
              {activeExam.allowRetake && (
                <button
                  type="button"
                  onClick={() => startExam(activeExam)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  Làm lại bài thi
                </button>
              )}
            </div>
          )}

          <div className="space-y-5">
            {activeExam.questions.map((q, idx) => {
              const userVal = answers[q.id] || '';
              const isRight =
                userVal.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

              return (
                <div key={q.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {q.section} · {QUESTION_TYPE_LABELS[q.questionType]}
                    </span>
                    <span className="tabular-nums">{q.points} điểm</span>
                  </div>

                  {q.passage && (
                    <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                      {q.passage}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Câu {idx + 1}: {q.prompt}
                    </p>
                    {q.questionType === 'listening' && (
                      <button
                        type="button"
                        onClick={() => speakEnglish(q.prompt)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 shrink-0 cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5 inline mr-1" />
                        Nghe
                      </button>
                    )}
                  </div>

                  {q.options && q.options.filter(Boolean).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.filter(Boolean).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={submittedScore !== null}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                            userVal === opt
                              ? 'border-sky-500 bg-sky-50 text-sky-900 font-semibold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled={submittedScore !== null}
                      value={userVal}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Nhập câu trả lời của bạn..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  )}

                  {submittedScore !== null && activeExam.allowViewAnswers && (
                    <div
                      className={`text-xs font-medium ${
                        isRight ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isRight
                        ? 'Chính xác'
                        : `Chưa đúng · Đáp án đúng: ${q.correctAnswer}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {submittedScore === null && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitExam}
                className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer"
              >
                Nộp bài kiểm tra
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // EDITOR MODE
  if (viewMode === 'editor') {
    const needReviewCount = questions.filter((q) => q.needsReview || !q.correctAnswer.trim()).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              resetEditor();
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách đề
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveExam}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editingId ? 'Cập nhật đề thi' : 'Lưu đề thi lên Firebase'}
          </button>
        </div>

        {/* Word / PDF Import Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Nhập đề từ file Word (.docx) hoặc PDF (.pdf)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hệ thống lưu trữ file lên Firebase Storage và trích xuất câu hỏi. Mọi câu không có
                đáp án rõ ràng sẽ được đánh dấu để giáo viên tự kiểm tra.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer shrink-0">
              {parsingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              {parsingFile ? 'Đang đọc & phân tích...' : 'Chọn file Word / PDF'}
              <input
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={parsingFile}
                onChange={(e) => handleUploadWordOrPdf(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {sourceFileName && (
            <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3.5 py-2">
              Tệp đã tải lên: <strong>{sourceFileName}</strong>
            </div>
          )}
        </div>

        {/* Exam Config */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900">Cấu hình đề thi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên đề thi</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Kiểm tra giữa kỳ 1 - Tiếng Anh 8"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lớp (1–12)</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    Lớp {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chủ đề</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thời gian làm bài (phút)
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 45)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thời gian mở đề
              </label>
              <input
                type="datetime-local"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thời gian đóng đề
              </label>
              <input
                type="datetime-local"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Điểm tối đa
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value) || 10)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                id="allow-view-ans"
                type="checkbox"
                checked={allowViewAnswers}
                onChange={(e) => setAllowViewAnswers(e.target.checked)}
                className="rounded border-slate-300 text-sky-600"
              />
              <label htmlFor="allow-view-ans" className="text-sm text-slate-700 cursor-pointer">
                Cho phép xem đáp án sau khi nộp
              </label>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                id="allow-retake"
                type="checkbox"
                checked={allowRetake}
                onChange={(e) => setAllowRetake(e.target.checked)}
                className="rounded border-slate-300 text-sky-600"
              />
              <label htmlFor="allow-retake" className="text-sm text-slate-700 cursor-pointer">
                Cho phép làm lại
              </label>
            </div>
          </div>
        </div>

        {/* Review Alert */}
        {needReviewCount > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <strong>Yêu cầu xác nhận từ giáo viên:</strong> Hiện có{' '}
              <strong>{needReviewCount}</strong> câu hỏi chưa có đáp án rõ ràng hoặc cần kiểm tra
              lại cấu trúc. Vui lòng rà soát và nhấn &ldquo;Xác nhận câu hỏi&rdquo; trước khi lưu đề.
            </div>
          </div>
        )}

        {/* Questions Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Danh sách câu hỏi ({questions.length})
            </h3>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Thêm câu hỏi
            </button>
          </div>

          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={`rounded-2xl border p-5 space-y-3 bg-white ${
                q.needsReview || !q.correctAnswer.trim()
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-600 tabular-nums">
                  Câu {idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  {q.needsReview && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, needsReview: false, reviewNote: '' } : item
                          )
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Xác nhận câu hỏi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {q.reviewNote && (
                <p className="text-xs text-amber-800 bg-amber-100/70 rounded-lg px-3 py-1.5">
                  {q.reviewNote}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phần trong đề</label>
                  <input
                    type="text"
                    value={q.section}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, section: val } : item))
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Dạng câu hỏi</label>
                  <select
                    value={q.questionType}
                    onChange={(e) => {
                      const val = e.target.value as ExamQuestionType;
                      setQuestions((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, questionType: val } : item))
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  >
                    {Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Điểm câu này</label>
                  <input
                    type="number"
                    step="0.25"
                    min={0.25}
                    value={q.points}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setQuestions((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, points: val } : item))
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Nội dung câu hỏi</label>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, prompt: val } : item))
                    );
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Các lựa chọn (cách nhau bởi dấu | )
                  </label>
                  <input
                    type="text"
                    value={(q.options || []).join(' | ')}
                    onChange={(e) => {
                      const arr = e.target.value.split('|').map((s) => s.trim());
                      setQuestions((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, options: arr } : item))
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Đáp án đúng (bắt buộc)
                  </label>
                  <input
                    type="text"
                    value={q.correctAnswer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, correctAnswer: val, needsReview: false } : item
                        )
                      );
                    }}
                    placeholder="Nhập đáp án chính xác..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // LIST MODE
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Quản lý đề kiểm tra
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tải lên file Word/PDF để chuyển thành đề thi trực tuyến, kiểm duyệt đáp án và giao cho
            học sinh.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors self-start cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Tạo đề kiểm tra mới
        </button>
      </div>

      {!user ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Vui lòng đăng nhập tài khoản giáo viên tại mục <strong>Tài khoản</strong> để tạo và quản
          lý đề kiểm tra trên Firebase.
        </div>
      ) : loadingList ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải danh sách đề thi...
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-600">
            Chưa có đề kiểm tra nào. Nhấn <strong>Tạo đề kiểm tra mới</strong> để tải file
            Word/PDF hoặc tự soạn đề.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Lớp {exam.gradeLevel} · {exam.topic} ·{' '}
                    <span className="tabular-nums">{exam.durationMinutes} phút</span>
                  </span>
                  <span
                    className={`font-semibold ${
                      exam.isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {exam.isActive ? 'Đang mở' : 'Đang tắt'}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">{exam.title}</h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  {exam.questions?.length || 0} câu hỏi · Điểm tối đa {exam.maxScore} ·{' '}
                  {exam.allowViewAnswers ? 'Cho xem đáp án' : 'Ẩn đáp án'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => startExam(exam)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  Làm thử / Xem đề
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(exam)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateExam(exam)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Sao chép
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleExamStatus(exam)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Power className="h-3.5 w-3.5" />
                  {exam.isActive ? 'Tắt' : 'Bật'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(exam)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa đề kiểm tra"
        message={`Bạn có chắc muốn xóa đề thi "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa đề thi"
        loading={deleting}
        onConfirm={handleDeleteExam}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
