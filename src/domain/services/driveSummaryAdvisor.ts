import type { SafetyRating } from "@/domain/entities/safetyRating";

export interface DriveAdviceInput {
  readonly marginMs: number;
  readonly safetyBufferMinutes: number;
  readonly safetyRating: SafetyRating;
  readonly arrivalGuaranteeModeTriggered: boolean;
  readonly turnBackDetectedAt: Date | null;
  readonly recommendedTurnBackAt: Date | null;
}

/**
 * ドライブ終了時の「次回への提案」をルールベースで生成する（AIは使わない、V1はif/elseの
 * 中立的な文言テンプレート）。責める表現を避け、運転の参考になる中立的な内容にする。
 */
export function generateDriveAdvice(input: DriveAdviceInput): string[] {
  const advice: string[] = [];
  const marginMinutes = Math.round(input.marginMs / 60_000);

  advice.push(`今回の余裕時間は${marginMinutes}分でした。`);

  if (input.safetyRating === "critical" || input.safetyRating === "close") {
    const suggestedBuffer = input.safetyBufferMinutes + 5;
    advice.push(`安全バッファを${suggestedBuffer}分にすると、さらに安心して利用できます。`);
  }

  if (
    input.turnBackDetectedAt &&
    input.recommendedTurnBackAt &&
    input.turnBackDetectedAt.getTime() > input.recommendedTurnBackAt.getTime()
  ) {
    const diffMinutes = Math.round(
      (input.turnBackDetectedAt.getTime() - input.recommendedTurnBackAt.getTime()) / 60_000,
    );
    if (diffMinutes > 0) {
      advice.push(`もう${diffMinutes}分早く折り返すと、より安全でした。`);
    }
  }

  if (input.safetyRating === "perfect") {
    advice.push("余裕を持って到着できました。");
  }

  return advice;
}
