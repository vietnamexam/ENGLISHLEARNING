import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Gamepad2,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  XCircle,
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
import { GAME_TYPES, VOCAB_TOPICS } from '../../constants/topics';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type { GameDifficulty, GameQuestion, GameRecord, GameType } from '../../types';
import { apiRequest } from '../../utils/api';
import { speakEnglish } from '../../utils/speech';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';

export function GamesView() {
  const { user, canUseVipFeatures, vipConfig } = useAuth();
  const { showToast } = useToast();

  const [games, setGames] = useState<GameRecord[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  // Mode: 'list' | 'editor' | 'play'
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'play'>('list');
  const [editingGameId, setEditingGameId] = useState<string | null>(null);

  // Editor state
  const [title, setTitle] = useState('');
  const [gameType, setGameType] = useState<GameType>('multiple_choice');
  const [topic, setTopic] = useState(VOCAB_TOPICS[0].name);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<GameRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Play state
  const [playingGame, setPlayingGame] = useState<GameRecord | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [sentenceTokens, setSentenceTokens] = useState<string[]>([]);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [gameFinished, setGameFinished] = useState(false);

  // Match game state
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setGames([]);
      return;
    }
    setLoadingGames(true);
    const q = query(collection(db, 'games'), where('teacherId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRecord);
        setGames(list);
        setLoadingGames(false);
      },
      (error) => {
        setLoadingGames(false);
        handleFirestoreError(error, OperationType.LIST, 'games');
      }
    );
    return () => unsub();
  }, [user]);

  const resetEditor = () => {
    setEditingGameId(null);
    setTitle('');
    setGameType('multiple_choice');
    setTopic(VOCAB_TOPICS[0].name);
    setQuestionCount(5);
    setDifficulty('medium');
    setQuestions([]);
  };

  const openCreateEditor = () => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản giáo viên để tạo trò chơi.', 'error');
      return;
    }
    resetEditor();
    setViewMode('editor');
  };

  const openEditEditor = (game: GameRecord) => {
    setEditingGameId(game.id);
    setTitle(game.title);
    setGameType(game.gameType);
    setTopic(game.topic);
    setQuestionCount(game.questionCount);
    setDifficulty(game.difficulty);
    setQuestions(game.questions || []);
    setViewMode('editor');
  };

  const handleGenerateQuestionsAi = async () => {
    if (!user) {
      showToast('Vui lòng đăng nhập để sử dụng tính năng này.', 'error');
      return;
    }
    if (vipConfig.vipModeEnabled && !canUseVipFeatures) {
      showToast(
        'Chế độ VIP đang bật. Vui lòng nâng cấp tài khoản VIP để dùng AI tạo trò chơi.',
        'error'
      );
      return;
    }

    setGeneratingAi(true);
    try {
      const data = await apiRequest<{ questions: GameQuestion[] }>('/api/gemini/generate-game', {
        method: 'POST',
        body: JSON.stringify({
          gameType,
          topic,
          difficulty,
          questionCount,
        }),
      });
      setQuestions(data.questions || []);
      if (!title.trim()) {
        const label = GAME_TYPES.find((t) => t.id === gameType)?.label || 'Trò chơi';
        setTitle(`${label} — ${topic}`);
      }
      showToast(`Đã tạo ${data.questions?.length || 0} câu hỏi trò chơi.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tạo câu hỏi.', 'error');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleAddManualQuestion = () => {
    const newQ: GameQuestion = {
      id: `q-${Date.now()}`,
      prompt: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      hint: '',
      explanation: '',
      visualCue: gameType === 'image_guess' ? '📘' : '',
      audioText: '',
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleSaveGame = async () => {
    if (!user) return;
    if (!title.trim()) {
      showToast('Vui lòng nhập tên trò chơi.', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('Trò chơi cần có ít nhất 1 câu hỏi.', 'error');
      return;
    }
    const invalidQ = questions.find((q) => !q.prompt.trim() || !q.correctAnswer.trim());
    if (invalidQ) {
      showToast('Vui lòng điền đầy đủ nội dung câu hỏi và đáp án đúng.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingGameId) {
        await updateDoc(doc(db, 'games', editingGameId), {
          title: title.trim(),
          gameType,
          topic,
          difficulty,
          questionCount: questions.length,
          questions,
          updatedAt: serverTimestamp(),
        });
        showToast('Đã cập nhật trò chơi trên Firebase.', 'success');
      } else {
        await addDoc(collection(db, 'games'), {
          teacherId: user.uid,
          title: title.trim(),
          gameType,
          topic,
          difficulty,
          questionCount: questions.length,
          questions,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Đã lưu trò chơi mới lên Firebase.', 'success');
      }
      setViewMode('list');
      resetEditor();
    } catch (error) {
      showToast('Lỗi khi lưu trò chơi lên Firebase.', 'error');
      handleFirestoreError(
        error,
        editingGameId ? OperationType.UPDATE : OperationType.CREATE,
        'games'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'games', deleteTarget.id));
      showToast(`Đã xóa trò chơi "${deleteTarget.title}".`, 'success');
      setDeleteTarget(null);
    } catch (error) {
      showToast('Không thể xóa trò chơi.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `games/${deleteTarget.id}`);
    } finally {
      setDeleting(false);
    }
  };

  const startPlayGame = (game: GameRecord) => {
    setPlayingGame(game);
    setCurrentIdx(0);
    setScore(0);
    setUserAnswer('');
    setSentenceTokens([]);
    setAnswered(null);
    setGameFinished(false);
    setSelectedLeft(null);
    setMatchedIds([]);
    setViewMode('play');
  };

  const currentQuestion = playingGame?.questions?.[currentIdx];

  const shuffledMatchRight = useMemo(() => {
    if (!playingGame || playingGame.gameType !== 'match') return [];
    const list = playingGame.questions.map((q) => ({
      id: q.id,
      text: q.correctAnswer,
    }));
    return [...list].sort((a, b) => a.text.localeCompare(b.text));
  }, [playingGame]);

  const submitAnswer = (choice: string) => {
    if (!currentQuestion || answered !== null) return;
    const isCorrect =
      choice.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    setUserAnswer(choice);
    setAnswered(isCorrect);
    if (isCorrect) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    if (!playingGame) return;
    if (currentIdx + 1 >= playingGame.questions.length) {
      setGameFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setUserAnswer('');
      setSentenceTokens([]);
      setAnswered(null);
    }
  };

  const handleMatchRightClick = (rightId: string) => {
    if (!selectedLeft || matchedIds.includes(rightId)) return;
    if (selectedLeft === rightId) {
      const next = [...matchedIds, rightId];
      setMatchedIds(next);
      setScore((s) => s + 1);
      setSelectedLeft(null);
      if (playingGame && next.length === playingGame.questions.length) {
        setGameFinished(true);
      }
    } else {
      showToast('Chưa khớp nghĩa, hãy thử lại!', 'error');
      setSelectedLeft(null);
    }
  };

  // PLAY MODE UI
  if (viewMode === 'play' && playingGame) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách game
          </button>

          <div className="text-sm font-semibold text-slate-700 tabular-nums">
            Điểm: <span className="text-sky-700">{score}</span> / {playingGame.questions.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="text-xs text-slate-500">
              {GAME_TYPES.find((t) => t.id === playingGame.gameType)?.label} · {playingGame.topic}
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
              {playingGame.title}
            </h2>
          </div>

          {gameFinished ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Hoàn thành trò chơi!
              </h3>
              <p className="text-base text-slate-600 tabular-nums">
                Kết quả của bạn:{' '}
                <strong className="text-emerald-700">
                  {score}/{playingGame.questions.length}
                </strong>{' '}
                điểm
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startPlayGame(playingGame)}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Chơi lại
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Danh sách trò chơi
                </button>
              </div>
            </div>
          ) : playingGame.gameType === 'match' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Chọn một từ tiếng Anh ở cột trái rồi chọn nghĩa tiếng Việt tương ứng ở cột phải.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  {playingGame.questions.map((q) => {
                    const matched = matchedIds.includes(q.id);
                    const active = selectedLeft === q.id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        disabled={matched}
                        onClick={() => {
                          setSelectedLeft(q.id);
                          speakEnglish(q.prompt);
                        }}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                          matched
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : active
                              ? 'bg-sky-600 border-sky-600 text-white'
                              : 'bg-white border-slate-200 text-slate-900 hover:border-sky-300'
                        }`}
                      >
                        {q.prompt}
                        {q.hint && (
                          <span className={`ml-2 font-mono text-xs ${active ? 'text-sky-100' : 'text-slate-400'}`}>
                            {q.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2.5">
                  {shuffledMatchRight.map((item) => {
                    const matched = matchedIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={matched}
                        onClick={() => handleMatchRightClick(item.id)}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                          matched
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-sky-50 hover:border-sky-300'
                        }`}
                      >
                        {item.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-5">
              <div className="text-xs font-medium text-slate-500 tabular-nums">
                Câu {currentIdx + 1} / {playingGame.questions.length}
              </div>

              {/* Image Guess visual cue */}
              {playingGame.gameType === 'image_guess' && (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 p-8 gap-2">
                  <span className="text-6xl" aria-hidden="true">
                    {currentQuestion.visualCue || '📘'}
                  </span>
                  <p className="text-sm font-medium text-slate-600 mt-2">
                    {currentQuestion.prompt}
                  </p>
                </div>
              )}

              {/* Listening Choice audio button */}
              {playingGame.gameType === 'listening_choice' && (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-sky-50 border border-sky-200 p-6 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      speakEnglish(currentQuestion.audioText || currentQuestion.correctAnswer)
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer"
                  >
                    <Volume2 className="h-5 w-5" />
                    Nghe phát âm tiếng Anh
                  </button>
                  <p className="text-xs text-sky-800">
                    Nghe kỹ và chọn đúng từ tiếng Anh bạn vừa nghe được.
                  </p>
                </div>
              )}

              {playingGame.gameType !== 'image_guess' && (
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {currentQuestion.prompt}
                </h3>
              )}

              {/* Sentence order interactive token builder */}
              {playingGame.gameType === 'sentence_order' ? (
                <div className="space-y-4">
                  <div className="min-h-[60px] rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap gap-2">
                    {sentenceTokens.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        Nhấn vào các từ bên dưới theo đúng thứ tự câu...
                      </span>
                    ) : (
                      sentenceTokens.map((tok, i) => (
                        <button
                          key={`${tok}-${i}`}
                          type="button"
                          disabled={answered !== null}
                          onClick={() =>
                            setSentenceTokens((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white cursor-pointer"
                        >
                          {tok}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.options.map((tok, i) => (
                      <button
                        key={`${tok}-${i}`}
                        type="button"
                        disabled={answered !== null}
                        onClick={() => setSentenceTokens((prev) => [...prev, tok])}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        {tok}
                      </button>
                    ))}
                  </div>

                  {answered === null && (
                    <button
                      type="button"
                      onClick={() => submitAnswer(sentenceTokens.join(' '))}
                      disabled={sentenceTokens.length === 0}
                      className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    >
                      Kiểm tra câu
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = userAnswer === opt;
                    const isCorrectOpt =
                      opt.trim().toLowerCase() ===
                      currentQuestion.correctAnswer.trim().toLowerCase();
                    let style = 'border-slate-200 bg-white text-slate-800 hover:border-sky-300';
                    if (answered !== null) {
                      if (isCorrectOpt) {
                        style = 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (isSelected) {
                        style = 'border-rose-300 bg-rose-50 text-rose-900';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={answered !== null}
                        onClick={() => submitAnswer(opt)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {answered !== null && (
                <div
                  className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    answered
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {answered ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Chính xác!
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-rose-600" />
                          Chưa đúng. Đáp án: {currentQuestion.correctAnswer}
                        </>
                      )}
                    </div>
                    {currentQuestion.explanation && (
                      <p className="text-xs opacity-90">{currentQuestion.explanation}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={nextQuestion}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 shrink-0 cursor-pointer"
                  >
                    {currentIdx + 1 >= playingGame.questions.length
                      ? 'Xem kết quả'
                      : 'Câu tiếp theo'}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // EDITOR MODE UI
  if (viewMode === 'editor') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              resetEditor();
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveGame}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editingGameId ? 'Cập nhật game' : 'Lưu game vào Firebase'}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <h2 className="font-display text-xl font-bold text-slate-900">
            {editingGameId ? 'Chỉnh sửa trò chơi tiếng Anh' : 'Tạo trò chơi tiếng Anh mới'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Tên trò chơi
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Ghép từ chủ đề Động vật lớp 4"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Dạng trò chơi
              </label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as GameType)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
              >
                {GAME_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Chủ đề</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
              >
                {VOCAB_TOPICS.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Số lượng câu hỏi
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value) || 5)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm tabular-nums focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Độ khó</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as GameDifficulty)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
              >
                <option value="easy">Dễ (Cơ bản)</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó (Nâng cao)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={generatingAi}
              onClick={handleGenerateQuestionsAi}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
            >
              {generatingAi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generatingAi ? 'Đang tạo câu hỏi bằng Gemini...' : 'Tạo câu hỏi tự động với Gemini'}
            </button>

            <button
              type="button"
              onClick={handleAddManualQuestion}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Thêm câu hỏi thủ công
            </button>
          </div>
        </div>

        {/* Question list editor */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  Câu {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Xóa câu này
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nội dung / Câu hỏi</label>
                  <input
                    type="text"
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
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Đáp án đúng</label>
                  <input
                    type="text"
                    value={q.correctAnswer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, correctAnswer: val } : item))
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {gameType !== 'match' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Các lựa chọn / Thẻ từ (cách nhau bằng dấu | )
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // LIST MODE UI
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Trò chơi tiếng Anh
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tạo, lưu trữ và tổ chức 6 dạng trò chơi tiếng Anh tương tác cho học sinh trên Firebase.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateEditor}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors self-start cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Tạo game mới
        </button>
      </div>

      {/* 6 Game Types Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GAME_TYPES.map((gt, idx) => (
          <div key={gt.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="text-xs font-mono text-slate-400 tabular-nums">0{idx + 1}</div>
            <h3 className="text-sm font-bold text-slate-900">{gt.label}</h3>
            <p className="text-xs text-slate-500">{gt.description}</p>
          </div>
        ))}
      </div>

      {!user ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Vui lòng đăng nhập tài khoản giáo viên tại mục <strong>Tài khoản</strong> để tạo và quản
          lý danh sách trò chơi trên Firebase.
        </div>
      ) : loadingGames ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải danh sách trò chơi từ Firebase...
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <Gamepad2 className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-600">
            Bạn chưa tạo trò chơi nào. Nhấn <strong>Tạo game mới</strong> để bắt đầu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((game) => {
            const typeLabel =
              GAME_TYPES.find((t) => t.id === game.gameType)?.label || game.gameType;
            return (
              <div
                key={game.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500">
                    {typeLabel} · {game.topic} ·{' '}
                    <span className="tabular-nums">{game.questionCount} câu</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{game.title}</h3>
                  <p className="text-xs text-slate-500">
                    Độ khó:{' '}
                    {game.difficulty === 'easy'
                      ? 'Dễ'
                      : game.difficulty === 'medium'
                        ? 'Trung bình'
                        : 'Khó'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => startPlayGame(game)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Mở &amp; Chơi
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditEditor(game)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(game)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa trò chơi"
        message={`Bạn có chắc muốn xóa vĩnh viễn trò chơi "${deleteTarget?.title}"?`}
        confirmLabel="Xóa trò chơi"
        loading={deleting}
        onConfirm={handleDeleteGame}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
