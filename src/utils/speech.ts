import { apiRequest } from './api';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let activeAudioEl: HTMLAudioElement | null = null;
const clientTtsCache = new Map<string, string>();

export function stopSpeaking(): void {
  if (activeAudioEl) {
    activeAudioEl.pause();
    activeAudioEl.currentTime = 0;
    activeAudioEl = null;
  }
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

async function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return [];
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return existing;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 400);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function pickBestVoice(voices: SpeechSynthesisVoice[], lang: 'en-US' | 'vi-VN'): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const preferredNames =
    lang === 'vi-VN'
      ? ['google tiếng việt', 'hoaimy', 'namminh', 'linh', 'an', 'vietnamese']
      : ['google us english', 'samantha', 'aria', 'jenny', 'daniel', 'natural'];

  const langPrefix = lang.split('-')[0].toLowerCase();
  const matchingLang = voices.filter((v) =>
    v.lang.replace('_', '-').toLowerCase().startsWith(langPrefix)
  );

  for (const pref of preferredNames) {
    const found = matchingLang.find((v) => v.name.toLowerCase().includes(pref));
    if (found) return found;
  }
  const exact = matchingLang.find(
    (v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()
  );
  return exact || matchingLang[0] || null;
}

async function playGeminiTts(text: string, lang: 'vi' | 'en', rate = 1.0): Promise<boolean> {
  const clean = text.trim();
  if (!clean || clean.length > 500) return false;
  const cacheKey = `${lang}:${clean}`;
  try {
    let dataUrl = clientTtsCache.get(cacheKey);
    if (!dataUrl) {
      const res = await apiRequest<{ audioBase64: string; mimeType: string }>('/api/gemini/tts', {
        method: 'POST',
        body: JSON.stringify({ text: clean, lang }),
      });
      if (!res.audioBase64) return false;
      dataUrl = `data:${res.mimeType || 'audio/wav'};base64,${res.audioBase64}`;
      if (clientTtsCache.size > 80) {
        const firstKey = clientTtsCache.keys().next().value;
        if (firstKey) clientTtsCache.delete(firstKey);
      }
      clientTtsCache.set(cacheKey, dataUrl);
    }

    return await new Promise<boolean>((resolve) => {
      stopSpeaking();
      const audio = new Audio(dataUrl);
      audio.playbackRate = rate;
      activeAudioEl = audio;
      audio.onended = () => {
        if (activeAudioEl === audio) activeAudioEl = null;
        resolve(true);
      };
      audio.onerror = () => {
        if (activeAudioEl === audio) activeAudioEl = null;
        resolve(false);
      };
      audio.play().catch(() => resolve(false));
    });
  } catch {
    return false;
  }
}

export async function speakText(
  text: string,
  lang: 'en-US' | 'vi-VN',
  rate = 0.95
): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  // For Vietnamese, prefer natural Gemini neural TTS first because browser vi-VN voices are often missing or robotic
  if (lang === 'vi-VN') {
    const playedAi = await playGeminiTts(clean, 'vi', 1.0);
    if (playedAi) return;
  }

  if (!isSpeechSupported()) return;

  const voices = await getVoicesAsync();
  const bestVoice = pickBestVoice(voices, lang);

  // If browser has NO Vietnamese voice at all, avoid reading Vietnamese with an English voice
  if (lang === 'vi-VN' && !bestVoice) {
    return;
  }

  return new Promise((resolve) => {
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = rate;
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function speakEnglish(text: string, rate = 0.92): Promise<void> {
  return speakText(text, 'en-US', rate);
}

export function speakVietnamese(text: string, rate = 0.98): Promise<void> {
  return speakText(text, 'vi-VN', rate);
}
