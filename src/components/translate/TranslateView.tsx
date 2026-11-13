import { useState } from 'react';
import {
  ArrowLeftRight,
  ClipboardPaste,
  Copy,
  Eraser,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { TranslationResult } from '../../types';
import { apiRequest } from '../../utils/api';
import { speakEnglish, speakVietnamese } from '../../utils/speech';
import { useToast } from '../common/ToastProvider';

export function TranslateView() {
  const { showToast } = useToast();

  const [direction, setDirection] = useState<'en-vi' | 'vi-en'>('en-vi');
  const [sourceText, setSourceText] = useState('');
  const [explainDetails, setExplainDetails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);

  const handleSwap = () => {
    const nextDir = direction === 'en-vi' ? 'vi-en' : 'en-vi';
    setDirection(nextDir);
    if (result?.translatedText) {
      setSourceText(result.translatedText);
      setResult(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSourceText(text);
        showToast('Đã dán nội dung từ bộ nhớ tạm.', 'success');
      }
    } catch {
      showToast('Trình duyệt chưa cấp quyền dán nhanh. Hãy nhấn Ctrl+V để dán.', 'info');
    }
  };

  const handleClear = () => {
    setSourceText('');
    setResult(null);
  };

  const handleCopyResult = async () => {
    if (!result?.translatedText) return;
    try {
      await navigator.clipboard.writeText(result.translatedText);
      showToast('Đã sao chép kết quả dịch.', 'success');
    } catch {
      showToast('Không thể sao chép tự động.', 'error');
    }
  };

  const handleTranslate = async () => {
    const clean = sourceText.trim();
    if (!clean) {
      showToast('Vui lòng nhập từ, câu hoặc đoạn văn cần dịch.', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<TranslationResult>('/api/gemini/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: clean,
          direction,
          explainDetails,
        }),
      });
      setResult(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Lỗi dịch văn bản.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const speakSource = () => {
    if (!sourceText.trim()) return;
    if (direction === 'en-vi') {
      speakEnglish(sourceText);
    } else {
      speakVietnamese(sourceText);
    }
  };

  const speakTranslated = () => {
    if (!result?.translatedText) return;
    if (direction === 'en-vi') {
      speakVietnamese(result.translatedText);
    } else {
      speakEnglish(result.translatedText);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Dịch văn bản hai chiều
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Dịch chính xác từ, câu hoặc đoạn văn dài giữa Tiếng Anh và Tiếng Việt, giữ nguyên
            đầy đủ nội dung gốc.
          </p>
        </div>

        {/* Direction Switcher */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 self-start">
          <span
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              direction === 'en-vi' ? 'bg-sky-50 text-sky-800' : 'text-slate-600'
            }`}
          >
            {direction === 'en-vi' ? 'English' : 'Tiếng Việt'}
          </span>
          <button
            type="button"
            onClick={handleSwap}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Đảo chiều dịch"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              direction === 'vi-en' ? 'bg-sky-50 text-sky-800' : 'text-slate-600'
            }`}
          >
            {direction === 'en-vi' ? 'Tiếng Việt' : 'English'}
          </span>
        </div>
      </div>

      {/* Two-Column Translator Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Văn bản gốc ({direction === 'en-vi' ? 'Tiếng Anh' : 'Tiếng Việt'})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Dán
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Xóa
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={
                direction === 'en-vi'
                  ? 'Nhập từ, câu hoặc dán đoạn văn tiếng Anh...'
                  : 'Nhập từ, câu hoặc dán đoạn văn tiếng Việt...'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={speakSource}
                disabled={!sourceText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Đọc văn bản gốc
              </button>

              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={explainDetails}
                  onChange={(e) => setExplainDetails(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Giải thích từ khó &amp; ngữ pháp
              </label>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleTranslate}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-sky-400 transition-colors cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? 'Đang dịch...' : 'Dịch ngay'}
            </button>
          </div>
        </div>

        {/* Translated Output Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Kết quả dịch ({direction === 'en-vi' ? 'Tiếng Việt' : 'Tiếng Anh'})
              </span>
              <button
                type="button"
                onClick={handleCopyResult}
                disabled={!result?.translatedText}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                Sao chép
              </button>
            </div>

            <div className="min-h-[206px] rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý bản dịch...
                </div>
              ) : result?.translatedText ? (
                result.translatedText
              ) : (
                <span className="text-slate-400">
                  Bản dịch tự nhiên và đầy đủ nội dung sẽ hiển thị tại đây.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={speakTranslated}
              disabled={!result?.translatedText}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Đọc văn bản đã dịch
            </button>

            {result?.translatedText && (
              <span className="text-xs text-slate-400 tabular-nums">
                {result.translatedText.split(/\s+/).filter(Boolean).length} từ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vocabulary & Grammar Explanation Panel */}
      {result && explainDetails && (result.difficultWords?.length > 0 || result.grammarNotes) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Giải thích từ khó và cấu trúc ngữ pháp
          </h2>

          {result.difficultWords?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.difficultWords.map((w, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{w.word}</span>
                    <button
                      type="button"
                      onClick={() => speakEnglish(w.word)}
                      className="text-sky-700 hover:text-sky-900 cursor-pointer"
                      aria-label={`Nghe ${w.word}`}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {w.ipa && <p className="font-mono text-xs text-sky-700">{w.ipa}</p>}
                  <p className="text-xs font-medium text-slate-800">{w.meaning}</p>
                  {w.usage && <p className="text-xs text-slate-500">{w.usage}</p>}
                </div>
              ))}
            </div>
          )}

          {result.grammarNotes && (
            <div className="rounded-xl bg-sky-50/60 border border-sky-200 p-4 text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Lưu ý ngữ pháp:</strong> {result.grammarNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
