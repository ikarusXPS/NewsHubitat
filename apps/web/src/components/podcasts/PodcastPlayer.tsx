/**
 * PodcastPlayer — vanilla <audio> with custom cyber-theme controls
 * (Phase 40-04 / D-B3 / CC-05).
 *
 * No third-party audio library (react-h5-audio-player rejected per
 * 40-RESEARCH B4 — bundle weight + LCP impact). Just a `<audio>` element +
 * imperative ref API for transcript-driven seek (40-06 hooks into this).
 *
 * Security boundary (T-40-04-01): `audioUrl` MUST start with `https://` —
 * `file:`, `javascript:`, `data:` etc are rejected before mount. Defence in
 * depth: 40-03's RSS parser already validates server-side.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  FastForward,
  Pause,
  Play,
  Rewind,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface PodcastPlayerProps {
  audioUrl: string;
  title?: string;
  onTimeUpdate?: (currentSec: number) => void;
  className?: string;
}

export interface PodcastPlayerHandle {
  seek: (seconds: number) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2] as const;

function formatSec(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const total = Math.floor(s);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

export const PodcastPlayer = forwardRef<PodcastPlayerHandle, PodcastPlayerProps>(
  function PodcastPlayer(
    { audioUrl, title, onTimeUpdate, className },
    ref,
  ) {
    const { t } = useTranslation('podcasts');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [isMuted, setIsMuted] = useState(false);

    const isSafe = audioUrl.startsWith('https://');

    useImperativeHandle(
      ref,
      () => ({
        seek(seconds: number) {
          const audio = audioRef.current;
          if (audio) audio.currentTime = seconds;
        },
      }),
      [],
    );

    // Wire <audio> event listeners + cleanup
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const onTime = () => {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      };
      const onLoaded = () => setDuration(audio.duration);
      const onEnded = () => setIsPlaying(false);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);

      return () => {
        audio.removeEventListener('timeupdate', onTime);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.pause();
      };
      // onTimeUpdate is the only re-runnable dep; ref-based audio lookup is
      // stable across renders so the effect can be re-entrant safely.
    }, [onTimeUpdate]);

    const togglePlay = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        void audio.play();
      } else {
        audio.pause();
      }
    }, []);

    const skip = useCallback((delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const next = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
      audio.currentTime = next;
    }, []);

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const next = Number(e.target.value);
      audio.currentTime = next;
      setCurrentTime(next);
    };

    const handleSpeed = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = Number(e.target.value);
      setPlaybackRate(next);
      const audio = audioRef.current;
      if (audio) audio.playbackRate = next;
    };

    const toggleMute = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = !audio.muted;
      setIsMuted(audio.muted);
    };

    if (!isSafe) {
      return (
        <div
          role="alert"
          className={cn(
            'rounded-lg border border-[#ff0044]/30 bg-[#ff0044]/10 p-3 text-xs text-[#ff0044]',
            className,
          )}
        >
          {t('podcastPlayer.invalidUrl')}
        </div>
      );
    }

    return (
      <div
        className={cn(
          'rounded-lg border border-gray-700 bg-gray-800 p-3 font-mono',
          className,
        )}
      >
        {/* No `controls` attribute — custom UI. crossOrigin avoids credentialed
            requests to third-party CDNs. */}
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          crossOrigin="anonymous"
          aria-label={title}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => skip(-30)}
            aria-label={t('podcastPlayer.skipBack30')}
            className="rounded p-1 text-[#00f0ff] hover:bg-[#00f0ff]/10"
          >
            <Rewind className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? t('podcastPlayer.pause') : t('podcastPlayer.play')}
            className="rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/20 p-2 text-[#00f0ff] hover:bg-[#00f0ff]/30"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => skip(30)}
            aria-label={t('podcastPlayer.skip30')}
            className="rounded p-1 text-[#00f0ff] hover:bg-[#00f0ff]/10"
          >
            <FastForward className="h-4 w-4" />
          </button>

          <span className="text-xs text-gray-300 tabular-nums">
            {formatSec(currentTime)} / {formatSec(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.1}
            value={currentTime}
            onChange={handleScrub}
            aria-label="seek"
            className="flex-1 accent-[#00f0ff]"
          />

          <select
            value={playbackRate}
            onChange={handleSpeed}
            aria-label={t('podcastPlayer.speed')}
            className="rounded border border-gray-600 bg-gray-900 px-1 py-0.5 text-xs text-gray-200"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? t('podcastPlayer.unmute') : t('podcastPlayer.mute')}
            className="rounded p-1 text-gray-300 hover:text-[#00f0ff]"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  },
);
