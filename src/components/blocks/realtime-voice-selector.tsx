"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RealtimeVoice {
  id: string;
  label: string;
  description: string;
}

export const REALTIME_VOICES: RealtimeVoice[] = [
  { id: "alloy", label: "Alloy", description: "Neutral & balanced" },
  { id: "ash", label: "Ash", description: "Warm & approachable" },
  { id: "ballad", label: "Ballad", description: "Expressive & melodic" },
  { id: "coral", label: "Coral", description: "Clear & polished" },
  { id: "echo", label: "Echo", description: "Deep & authoritative" },
  { id: "sage", label: "Sage", description: "Calm & steady" },
  { id: "shimmer", label: "Shimmer", description: "Soft & intimate" },
  { id: "verse", label: "Verse", description: "Versatile & dynamic" },
  { id: "marin", label: "Marin", description: "Fresh & natural" },
  { id: "cedar", label: "Cedar", description: "Rich & grounded" },
];

interface RealtimeVoiceSelectorProps {
  value: string | null;
  onChange: (voice: string | null) => void;
}

export function RealtimeVoiceSelector({
  value,
  onChange,
}: RealtimeVoiceSelectorProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlayingVoice(null);
  }, []);

  const playPreview = useCallback(
    async (voiceId: string) => {
      if (playingVoice === voiceId) {
        stopPlayback();
        return;
      }

      stopPlayback();
      setLoadingVoice(voiceId);

      try {
        const audio = new Audio(`/audio/voices/${voiceId}.mp3`);
        audioRef.current = audio;

        audio.addEventListener("ended", () => {
          setPlayingVoice(null);
          audioRef.current = null;
        });

        audio.addEventListener("error", () => {
          setPlayingVoice(null);
          setLoadingVoice(null);
          audioRef.current = null;
        });

        await audio.play();
        setPlayingVoice(voiceId);
      } catch {
        // play() rejected (user gesture required, etc.)
      } finally {
        setLoadingVoice(null);
      }
    },
    [playingVoice, stopPlayback],
  );

  const handleCardClick = useCallback(
    (voiceId: string) => {
      onChange(value === voiceId ? null : voiceId);
      playPreview(voiceId);
    },
    [value, onChange, playPreview],
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {REALTIME_VOICES.map((voice) => {
        const isSelected = value === voice.id;
        const isPlaying = playingVoice === voice.id;
        const isLoading = loadingVoice === voice.id;

        return (
          <button
            key={voice.id}
            type="button"
            onClick={() => handleCardClick(voice.id)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all",
              "hover:border-foreground/30 hover:bg-muted/40",
              isSelected
                ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                : "border-border",
            )}
          >
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground group-hover:text-foreground",
              )}
            >
              {isLoading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </div>
            <span className="text-sm font-medium">{voice.label}</span>
            <span className="text-muted-foreground text-[11px] leading-tight">
              {voice.description}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                playPreview(voice.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  playPreview(voice.id);
                }
              }}
              className={cn(
                "mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                isPlaying
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
            >
              {isPlaying ? (
                <Pause className="size-2.5" />
              ) : (
                <Play className="size-2.5" />
              )}
              {isPlaying ? "Stop" : "Preview"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
