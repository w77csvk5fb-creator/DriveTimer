import type { NotificationSeverity } from "@/domain/entities/notificationEvent";

interface ToneStep {
  readonly frequency: number;
  readonly durationMs: number;
  readonly gapMs: number;
}

// severityが上がるほど音数が増え、切迫感が出るように設計する。
const TONE_SEQUENCES: Record<NotificationSeverity, readonly ToneStep[]> = {
  info: [{ frequency: 660, durationMs: 150, gapMs: 0 }],
  warning: [
    { frequency: 700, durationMs: 120, gapMs: 80 },
    { frequency: 700, durationMs: 120, gapMs: 0 },
  ],
  urgent: [
    { frequency: 880, durationMs: 150, gapMs: 80 },
    { frequency: 880, durationMs: 150, gapMs: 80 },
    { frequency: 880, durationMs: 150, gapMs: 0 },
  ],
};

function resolveAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof AudioContext !== "undefined") return AudioContext;
  if (typeof window === "undefined") return undefined;
  // 一部の古いSafariはwebkit接頭辞付きでのみ公開している
  return (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export interface AudioAlertController {
  play(severity: NotificationSeverity): void;
}

/**
 * Web Audio APIでビープ音を鳴らす。音声ファイルを同梱せずオシレーターで生成することで、
 * アセット管理不要かつ確実にフォアグラウンドで鳴らせるようにする。
 */
export class WebAudioAlertController implements AudioAlertController {
  private audioContext: AudioContext | null = null;

  play(severity: NotificationSeverity): void {
    if (typeof window === "undefined") return;
    const AudioContextCtor = resolveAudioContextCtor();
    if (!AudioContextCtor) return;

    const ctx = (this.audioContext ??= new AudioContextCtor());
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    let startTime = ctx.currentTime;
    for (const step of TONE_SEQUENCES[severity]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = step.frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.15, startTime);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + step.durationMs / 1000);
      startTime += (step.durationMs + step.gapMs) / 1000;
    }
  }
}
