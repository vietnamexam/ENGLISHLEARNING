export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

function pickVoice(langPrefix: string): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.find((v) => v.lang.toLowerCase() === langPrefix.toLowerCase());
  if (exact) return exact;
  const prefix = langPrefix.split('-')[0].toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) || null;
}

export function speakText(text: string, lang: 'en-US' | 'vi-VN', rate = 0.95): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSupported() || !text.trim()) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    const voice = pickVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function speakEnglish(text: string, rate = 0.92): Promise<void> {
  return speakText(text, 'en-US', rate);
}

export function speakVietnamese(text: string, rate = 1.0): Promise<void> {
  return speakText(text, 'vi-VN', rate);
}
