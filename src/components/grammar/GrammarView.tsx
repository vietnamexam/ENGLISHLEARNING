import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Loader2,
  RefreshCw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { GRAMMAR_CATEGORIES, GRAMMAR_TOPICS } from '../../constants/topics';
import type {
  GrammarAnalysisResult,
  GrammarSampleSentence,
  GrammarTopic,
} from '../../types';
import { apiRequest } from '../../utils/api';
import { speakEnglish, speakVietnamese } from '../../utils/speech';
import { useToast } from '../common/ToastProvider';

type GradeBand = 'all' | '1-5' | '6-9' | '10-12';

export function GrammarView() {
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả chuyên đề');
  const [gradeBand, setGradeBand] = useState<GradeBand>('all');
  const [activeTopic, setActiveTopic] = useState<GrammarTopic>(GRAMMAR_TOPICS[0]);

  const [viSentence, setViSentence] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GrammarAnalysisResult | null>(null);

  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleSentences, setSampleSentences] = useState<GrammarSampleSentence[]>([]);

  const filteredTopics = useMemo(() => {
    return GRAMMAR_TOPICS.filter((topic) => {
      const catMatch =
        selectedCategory === 'Tất cả chuyên đề' || topic.category === selectedCategory;
      if (!catMatch) return false;
      if (gradeBand === '1-5') return topic.minGrade <= 5;
      if (gradeBand === '6-9') return topic.minGrade <= 9 && topic.maxGrade >= 6;
      if (gradeBand === '10-12') return topic.maxGrade >= 10;
      return true;
    });
  }, [selectedCategory, gradeBand]);

  const handleAnalyzeSentence = async () => {
    const clean = viSentence.trim();
    if (!clean) {
      showToast('Vui lòng nhập một câu tiếng Việt để phân tích.', 'error');
      return;
    }
    setAnalyzing(true);
    try {
      const data = await apiRequest<GrammarAnalysisResult>('/api/gemini/grammar-analyze', {
        method: 'POST',
        body: JSON.stringify({
          sentence: clean,
          topicTitle: `${activeTopic.category} - ${activeTopic.title}`,
          gradeLevel: activeTopic.gradeRange,
        }),
      });
      setAnalysisResult(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Lỗi phân tích ngữ pháp.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFetchSamples = async () => {
    setLoadingSamples(true);
    try {
      const data = await apiRequest<{ examples: GrammarSampleSentence[] }>(
        '/api/gemini/grammar-examples',
        {
          method: 'POST',
          body: JSON.stringify({
            topicTitle: `${activeTopic.category}: ${activeTopic.title}`,
            formula: activeTopic.formula,
            gradeLevel: activeTopic.gradeRange,
          }),
        }
      );
      setSampleSentences(data.examples || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải câu mẫu.', 'error');
    } finally {
      setLoadingSamples(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Ngữ pháp tiếng Anh Lớp 1–12
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tra cứu công thức, cách sử dụng, lỗi thường gặp và luyện viết câu cùng AI theo 13
            chuyên đề trọng tâm.
          </p>
        </div>

        {/* Grade Level Filter */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 self-start">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: '1-5', label: 'Tiểu học (1–5)' },
            { id: '6-9', label: 'THCS (6–9)' },
            { id: '10-12', label: 'THPT (10–12)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGradeBand(item.id as GradeBand)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                gradeBand === item.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category & Topic Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Categories & Topics */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <label htmlFor="grammar-cat" className="block text-xs font-semibold text-slate-500">
              Lọc theo chuyên đề
            </label>
            <select
              id="grammar-cat"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
            >
              {GRAMMAR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto pr-1">
              {filteredTopics.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  Không có bài ngữ pháp phù hợp bộ lọc.
                </p>
              ) : (
                filteredTopics.map((topic) => {
                  const selected = topic.id === activeTopic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setActiveTopic(topic);
                        setSampleSentences([]);
                        setAnalysisResult(null);
                      }}
                      className={`w-full text-left py-3 px-3 rounded-xl transition-colors cursor-pointer my-1 ${
                        selected
                          ? 'bg-sky-50 text-sky-900'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="text-xs text-slate-500">
                        {topic.category} · {topic.gradeRange}
                      </div>
                      <div className="text-sm font-semibold mt-0.5 leading-snug">
                        {topic.title}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Right Content: Active Grammar Lesson + AI Practice */}
        <div className="lg:col-span-8 space-y-6">
          {/* Lesson Specification */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {activeTopic.category} · {activeTopic.gradeRange}
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                {activeTopic.title}
              </h2>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-1.5">
              <div className="text-xs font-semibold text-sky-800">Công thức</div>
              <p className="font-mono text-sm font-medium text-slate-900 leading-relaxed">
                {activeTopic.formula}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 p-4 space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-900">Cách sử dụng</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{activeTopic.usage}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-900">Giải thích bằng tiếng Việt</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {activeTopic.explanationVi}
                </p>
              </div>
            </div>

            {/* Examples */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sky-600" />
                Ví dụ minh họa
              </h3>
              <div className="space-y-2.5">
                {activeTopic.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ex.en}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{ex.vi}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => speakEnglish(ex.en)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-sky-50 cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5 inline mr-1" />
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => speakVietnamese(ex.vi)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5 inline mr-1" />
                        VI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Mistakes */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                Các lỗi thường gặp
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-950">
                {activeTopic.commonMistakes.map((mistake, idx) => (
                  <li key={idx}>{mistake}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interactive Sample Sentences Generator (3 Random Sentences) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Câu mẫu ngẫu nhiên theo chuyên đề
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo 3 câu tiếng Anh phù hợp chuyên đề đang học kèm phân tích cấu trúc và âm
                  thanh.
                </p>
              </div>
              <button
                type="button"
                disabled={loadingSamples}
                onClick={handleFetchSamples}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                {loadingSamples ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loadingSamples ? 'Đang tạo 3 câu mẫu...' : 'Xem câu mẫu'}
              </button>
            </div>

            {sampleSentences.length > 0 && (
              <div className="space-y-3 pt-2">
                {sampleSentences.map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {idx + 1}. {s.english}
                        </p>
                        <p className="text-sm text-emerald-700 font-medium mt-0.5">
                          {s.vietnamese}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakEnglish(s.english)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 shrink-0 cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Nghe phát âm
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Phân tích cấu trúc:</strong> {s.analysis}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vietnamese Input -> Gemini Grammar Translation & Explanation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Kiểm tra &amp; Dịch câu tiếng Việt với AI
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập một câu tiếng Việt để Gemini dịch sang tiếng Anh tự nhiên, xác định cấu trúc
                ngữ pháp và giải thích lý do sử dụng.
              </p>
            </div>

            <textarea
              rows={3}
              value={viSentence}
              onChange={(e) => setViSentence(e.target.value)}
              placeholder="Ví dụ: Nếu ngày mai trời nắng, chúng tôi sẽ đi dã ngoại cùng lớp."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyzeSentence}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-sky-400 transition-colors cursor-pointer"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {analyzing ? 'Đang phân tích...' : 'Dịch & Giải thích cấu trúc'}
              </button>
            </div>

            {analysisResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-emerald-800">
                      Bản dịch tiếng Anh tự nhiên
                    </div>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {analysisResult.englishTranslation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakEnglish(analysisResult.englishTranslation)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shrink-0 cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Nghe câu
                  </button>
                </div>

                <div className="space-y-1.5 text-sm text-slate-700">
                  <p>
                    <strong>Cấu trúc sử dụng:</strong> {analysisResult.grammarStructure}
                  </p>
                  <p>
                    <strong>Giải thích:</strong> {analysisResult.explanationVi}
                  </p>
                  {analysisResult.notes && (
                    <p className="text-xs text-slate-600">
                      <strong>Ghi chú thêm:</strong> {analysisResult.notes}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
