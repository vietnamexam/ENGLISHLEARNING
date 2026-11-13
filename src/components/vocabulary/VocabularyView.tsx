import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
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
import { VOCAB_TOPICS, type VocabTopicMeta } from '../../constants/topics';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type { VocabGenerationResult, VocabItem } from '../../types';
import { apiRequest } from '../../utils/api';
import { speakEnglish, speakVietnamese } from '../../utils/speech';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';

export function VocabularyView() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedTopic, setSelectedTopic] = useState<VocabTopicMeta | null>(null);
  const [inputWords, setInputWords] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState<VocabGenerationResult[]>([]);
  const [savedVocab, setSavedVocab] = useState<VocabItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMode, setActiveMode] = useState<'learn' | 'saved' | 'review'>('learn');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VocabItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Flashcard review state
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (!user) {
      setSavedVocab([]);
      return;
    }
    const q = query(collection(db, 'vocabularies'), where('teacherId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VocabItem);
        setSavedVocab(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'vocabularies');
      }
    );
    return () => unsub();
  }, [user]);

  const topicSavedVocab = useMemo(() => {
    const base = selectedTopic
      ? savedVocab.filter((v) => v.topic === selectedTopic.name)
      : savedVocab;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (v) =>
        v.english.toLowerCase().includes(q) ||
        v.vietnamese.toLowerCase().includes(q) ||
        v.ipa.toLowerCase().includes(q)
    );
  }, [savedVocab, selectedTopic, searchQuery]);

  const handleTranslateWords = async (overrideInput?: string) => {
    const raw = (overrideInput ?? inputWords).trim();
    if (!raw) {
      showToast('Vui lòng nhập từ tiếng Việt cần học.', 'error');
      return;
    }
    const words = raw
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter(Boolean);

    if (words.length === 0) return;

    setGenerating(true);
    try {
      const data = await apiRequest<{ items: VocabGenerationResult[] }>('/api/gemini/vocab', {
        method: 'POST',
        body: JSON.stringify({
          words,
          topic: selectedTopic?.name || 'Tổng hợp',
        }),
      });
      setGeneratedList(data.items || []);
      if ((data.items || []).length > 0) {
        showToast(`Đã phân tích ${data.items.length} từ vựng thành công.`, 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể dịch từ vựng.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveWord = async (item: VocabGenerationResult) => {
    if (!user) {
      showToast('Vui lòng đăng nhập ở mục Tài khoản để lưu từ vựng vào Firebase.', 'error');
      return;
    }
    const key = `${item.english}-${item.vietnamese}`;
    const alreadyExists = savedVocab.some(
      (v) =>
        v.english.toLowerCase() === item.english.toLowerCase() &&
        v.topic === (selectedTopic?.name || 'Các chủ đề khác')
    );
    if (alreadyExists) {
      showToast('Từ vựng này đã có trong danh sách của bạn.', 'info');
      return;
    }

    setSavingKey(key);
    try {
      await addDoc(collection(db, 'vocabularies'), {
        teacherId: user.uid,
        topic: selectedTopic?.name || 'Các chủ đề khác',
        vietnamese: item.vietnamese,
        english: item.english,
        ipa: item.ipa,
        partOfSpeech: item.partOfSpeech,
        exampleEn: item.exampleEn,
        exampleVi: item.exampleVi,
        mastered: false,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Đã lưu "${item.english}" vào danh sách cá nhân.`, 'success');
    } catch (error) {
      showToast('Lưu từ vựng thất bại. Kiểm tra kết nối Firebase.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'vocabularies');
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteVocab = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'vocabularies', deleteTarget.id));
      showToast(`Đã xóa từ "${deleteTarget.english}".`, 'success');
      setDeleteTarget(null);
    } catch (error) {
      showToast('Không thể xóa từ vựng.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `vocabularies/${deleteTarget.id}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkReviewed = async (item: VocabItem, mastered: boolean) => {
    try {
      await updateDoc(doc(db, 'vocabularies', item.id), {
        mastered,
        reviewCount: (item.reviewCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
      setShowBack(false);
      setReviewIndex((prev) => (prev + 1) % Math.max(topicSavedVocab.length, 1));
    } catch (error) {
      showToast('Không thể cập nhật tiến độ ôn tập.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `vocabularies/${item.id}`);
    }
  };

  // Topic selection view
  if (!selectedTopic) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Học từ vựng theo chủ đề
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Chọn 1 trong 15 chủ đề để mở không gian học từ vựng riêng, dịch từ tiếng Việt kèm IPA
              và ôn tập.
            </p>
          </div>
          {user && (
            <div className="text-sm text-slate-600 tabular-nums">
              Đã lưu cá nhân: <strong className="text-slate-900">{savedVocab.length}</strong> từ
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VOCAB_TOPICS.map((topic, idx) => {
            const countInTopic = savedVocab.filter((v) => v.topic === topic.name).length;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  setSelectedTopic(topic);
                  setGeneratedList([]);
                  setInputWords('');
                  setActiveMode('learn');
                }}
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-sky-300 hover:shadow-sm transition-all flex flex-col justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span>
                      {topic.englishName}
                      {user ? ` · ${countInTopic} từ đã lưu` : ''}
                    </span>
                  </div>

                  <div
                    className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-sm font-bold ${topic.accentBg} ${topic.accentText} ${topic.accentBorder}`}
                  >
                    {topic.name}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{topic.description}</p>
                </div>

                <div className="text-xs font-medium text-sky-700 group-hover:underline">
                  Mở giao diện học chủ đề →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentReviewItem = topicSavedVocab[reviewIndex % Math.max(topicSavedVocab.length, 1)];

  return (
    <div className="space-y-6">
      {/* Topic-specific Header */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 ${selectedTopic.accentBg} ${selectedTopic.accentBorder}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setSelectedTopic(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại 15 chủ đề
            </button>
            <h1 className={`font-display text-2xl font-bold ${selectedTopic.accentText}`}>
              Chủ đề: {selectedTopic.name} ({selectedTopic.englishName})
            </h1>
            <p className="text-sm text-slate-700">{selectedTopic.description}</p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white/80 p-1 border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => setActiveMode('learn')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeMode === 'learn'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Học từ mới
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('saved')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeMode === 'saved'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã lưu ({topicSavedVocab.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('review');
                setReviewIndex(0);
                setShowBack(false);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeMode === 'review'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ôn tập
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Learn New Words */}
      {activeMode === 'learn' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="vocab-input" className="text-sm font-semibold text-slate-900">
                Nhập từ hoặc cụm từ tiếng Việt (có thể nhập nhiều từ liên tiếp, mỗi từ một dòng
                hoặc cách nhau bằng dấu phẩy)
              </label>
            </div>

            <textarea
              id="vocab-input"
              rows={3}
              value={inputWords}
              onChange={(e) => setInputWords(e.target.value)}
              placeholder={`Ví dụ:\n${selectedTopic.samplePrompts.join('\n')}`}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Gợi ý nhanh:</span>
                {selectedTopic.samplePrompts.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() =>
                      setInputWords((prev) => (prev.trim() ? `${prev.trim()}, ${sample}` : sample))
                    }
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    + {sample}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={generating}
                onClick={() => handleTranslateWords()}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-sky-400 transition-colors whitespace-nowrap cursor-pointer"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? 'Đang dịch với Gemini...' : 'Dịch & Tạo thẻ từ vựng'}
              </button>
            </div>
          </div>

          {generatedList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedList.map((item) => {
                const key = `${item.english}-${item.vietnamese}`;
                const isSaved = savedVocab.some(
                  (v) =>
                    v.english.toLowerCase() === item.english.toLowerCase() &&
                    v.topic === selectedTopic.name
                );

                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2.5 flex-wrap">
                          <h3 className="font-display text-xl font-bold text-slate-900">
                            {item.english}
                          </h3>
                          <span className="font-mono text-sm text-sky-700">{item.ipa}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.partOfSpeech} · Nghĩa: <strong className="text-slate-800">{item.vietnamese}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={savingKey === key || isSaved}
                        onClick={() => handleSaveWord(item)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          isSaved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <BookmarkCheck className="h-3.5 w-3.5" />
                            Đã lưu
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="h-3.5 w-3.5" />
                            Lưu từ
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speakEnglish(item.english)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-colors cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Nghe tiếng Anh
                      </button>
                      <button
                        type="button"
                        onClick={() => speakVietnamese(item.vietnamese)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Nghe tiếng Việt
                      </button>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3.5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{item.exampleEn}</p>
                        <button
                          type="button"
                          onClick={() => speakEnglish(item.exampleEn)}
                          className="p-1 text-slate-500 hover:text-sky-700 shrink-0 cursor-pointer"
                          aria-label="Nghe câu ví dụ tiếng Anh"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600">{item.exampleVi}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Saved Vocabulary List */}
      {activeMode === 'saved' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm trong danh sách từ đã lưu..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {!user ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              Vui lòng đăng nhập tại mục <strong>Tài khoản</strong> để xem và quản lý danh sách từ
              vựng cá nhân trên Firebase.
            </div>
          ) : topicSavedVocab.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              Chưa có từ vựng nào được lưu trong chủ đề <strong>{selectedTopic.name}</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topicSavedVocab.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="font-display text-lg font-bold text-slate-900">
                          {item.english}
                        </h3>
                        <span className="font-mono text-xs text-sky-700">{item.ipa}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {item.vietnamese}{' '}
                        <span className="text-xs text-slate-400">({item.partOfSpeech})</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      aria-label={`Xóa từ ${item.english}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {item.exampleEn && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 space-y-0.5">
                      <p className="font-medium text-slate-800">{item.exampleEn}</p>
                      <p>{item.exampleVi}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speakEnglish(item.english)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        EN
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => speakVietnamese(item.vietnamese)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        VI
                      </button>
                    </div>

                    <span className="text-xs text-slate-500 tabular-nums">
                      {item.mastered ? 'Đã thuộc' : 'Đang ôn'} · {item.reviewCount || 0} lượt
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Flashcard Review */}
      {activeMode === 'review' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          {!user || topicSavedVocab.length === 0 ? (
            <div className="text-center text-sm text-slate-600 py-8">
              Hãy lưu ít nhất 1 từ vựng trong chủ đề này để bắt đầu ôn tập bằng thẻ ghi nhớ.
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                <span>
                  Thẻ {(reviewIndex % topicSavedVocab.length) + 1} / {topicSavedVocab.length}
                </span>
                <span>Lượt ôn: {currentReviewItem.reviewCount || 0}</span>
              </div>

              <div
                onClick={() => setShowBack((v) => !v)}
                className="min-h-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-sky-300 transition-colors select-none"
              >
                {!showBack ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Nhấn vào thẻ để xem nghĩa tiếng Việt</p>
                    <h3 className="font-display text-3xl font-bold text-slate-900">
                      {currentReviewItem.english}
                    </h3>
                    <p className="font-mono text-sm text-sky-700">{currentReviewItem.ipa}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakEnglish(currentReviewItem.english);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-sky-50"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Nghe phát âm
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-display text-2xl font-bold text-emerald-700">
                      {currentReviewItem.vietnamese}
                    </h3>
                    <p className="text-xs text-slate-500">{currentReviewItem.partOfSpeech}</p>
                    {currentReviewItem.exampleEn && (
                      <div className="pt-2 text-sm text-slate-700 max-w-md">
                        <p className="font-medium">{currentReviewItem.exampleEn}</p>
                        <p className="text-xs text-slate-500 mt-1">{currentReviewItem.exampleVi}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleMarkReviewed(currentReviewItem, false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Cần ôn thêm
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkReviewed(currentReviewItem, true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Đã ghi nhớ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa từ vựng"
        message={`Bạn có chắc muốn xóa từ "${deleteTarget?.english}" khỏi danh sách cá nhân?`}
        confirmLabel="Xóa từ"
        loading={deleting}
        onConfirm={handleDeleteVocab}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
