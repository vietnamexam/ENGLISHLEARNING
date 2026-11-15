import { useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import {
  BGM_TRACKS,
  getBackgroundMusicState,
  isSfxEnabled,
  playCorrectSound,
  setBackgroundMusic,
  setBackgroundMusicVolume,
  setSfxEnabled,
  type BgmTrackId,
} from '../../utils/soundEffects';

export function AudioControlBar() {
  const initial = getBackgroundMusicState();
  const [selectedTrack, setSelectedTrack] = useState<BgmTrackId>(initial.trackId);
  const [volume, setVolume] = useState<number>(initial.volume);
  const [sfxOn, setSfxOn] = useState<boolean>(isSfxEnabled());

  const handleTrackChange = (trackId: BgmTrackId) => {
    setSelectedTrack(trackId);
    setBackgroundMusic(trackId, volume);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    setBackgroundMusicVolume(val);
  };

  const handleToggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    setSfxEnabled(next);
    if (next) {
      playCorrectSound();
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Music className="h-4 w-4 text-sky-600" />
          Nhạc nền:
        </span>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {BGM_TRACKS.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => handleTrackChange(track.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                selectedTrack === track.id
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>

        {selectedTrack !== 'none' && (
          <label className="inline-flex items-center gap-2 text-xs text-slate-500 ml-1">
            <span>Âm lượng</span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-20 accent-sky-600 cursor-pointer"
            />
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={handleToggleSfx}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
          sfxOn
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}
      >
        {sfxOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        {sfxOn ? 'Âm thanh Đúng/Sai: Bật' : 'Âm thanh Đúng/Sai: Tắt'}
      </button>
    </div>
  );
}
