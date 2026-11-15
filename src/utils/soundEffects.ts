export const SOUND_EFFECTS = {
  correct:
    'https://res.cloudinary.com/dvwuihugq/video/upload/v1792135927/Am_thanh_Dung_roi_ban_gioi_qua_u1pe0g.mp3',
  wrong:
    'https://res.cloudinary.com/dvwuihugq/video/upload/v1792135930/Am_thanh_that_vong_pdfwn6.mp3',
} as const;

export type BgmTrackId = 'none' | 'tay_vuong' | 'tay_du_ky';

export const BGM_TRACKS: { id: BgmTrackId; label: string; url: string }[] = [
  { id: 'none', label: 'Tắt nhạc nền', url: '' },
  {
    id: 'tay_vuong',
    label: 'Tây Vương Nữ Quốc',
    url: 'https://res.cloudinary.com/dvwuihugq/video/upload/v1791694842/Tay_Vuong_Nu_Quoc_Beat_p8lez2.mp3',
  },
  {
    id: 'tay_du_ky',
    label: 'Tây Du Ký',
    url: 'https://res.cloudinary.com/dvwuihugq/video/upload/v1791692587/1131-nhac-phim-tay-du-ky-journey-to-the-west-vol1-nhacchualanhvn_mH46MdQh_amqmsk.mp3',
  },
];

let sfxEnabledGlobal = true;
let activeSfxAudio: HTMLAudioElement | null = null;
let activeBgmAudio: HTMLAudioElement | null = null;
let currentBgmTrack: BgmTrackId = 'none';
let currentBgmVolume = 0.3;

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabledGlobal = enabled;
}

export function isSfxEnabled(): boolean {
  return sfxEnabledGlobal;
}

function playSfxUrl(url: string): void {
  if (!sfxEnabledGlobal || typeof Audio === 'undefined') return;
  try {
    if (activeSfxAudio) {
      activeSfxAudio.pause();
      activeSfxAudio.currentTime = 0;
    }
    const audio = new Audio(url);
    audio.volume = 0.85;
    activeSfxAudio = audio;
    audio.play().catch(() => {
      // Ignore browser autoplay restrictions when triggered programmatically
    });
  } catch {
    // Ignore audio errors
  }
}

export function playCorrectSound(): void {
  playSfxUrl(SOUND_EFFECTS.correct);
}

export function playWrongSound(): void {
  playSfxUrl(SOUND_EFFECTS.wrong);
}

export function setBackgroundMusic(trackId: BgmTrackId, volume = currentBgmVolume): void {
  currentBgmTrack = trackId;
  currentBgmVolume = volume;

  if (typeof Audio === 'undefined') return;

  if (trackId === 'none') {
    if (activeBgmAudio) {
      activeBgmAudio.pause();
      activeBgmAudio.currentTime = 0;
      activeBgmAudio = null;
    }
    return;
  }

  const track = BGM_TRACKS.find((t) => t.id === trackId);
  if (!track || !track.url) return;

  if (activeBgmAudio && activeBgmAudio.src === track.url) {
    activeBgmAudio.volume = volume;
    if (activeBgmAudio.paused) {
      activeBgmAudio.play().catch(() => {});
    }
    return;
  }

  if (activeBgmAudio) {
    activeBgmAudio.pause();
    activeBgmAudio = null;
  }

  const bgm = new Audio(track.url);
  bgm.loop = true;
  bgm.volume = volume;
  activeBgmAudio = bgm;
  bgm.play().catch(() => {});
}

export function setBackgroundMusicVolume(volume: number): void {
  currentBgmVolume = Math.min(Math.max(volume, 0), 1);
  if (activeBgmAudio) {
    activeBgmAudio.volume = currentBgmVolume;
  }
}

export function pauseBackgroundMusic(): void {
  if (activeBgmAudio && !activeBgmAudio.paused) {
    activeBgmAudio.pause();
  }
}

export function getBackgroundMusicState(): { trackId: BgmTrackId; volume: number } {
  return { trackId: currentBgmTrack, volume: currentBgmVolume };
}
