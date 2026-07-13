import { describe, expect, it } from "vitest";
import { WebAudioAlertController } from "./audioAlertDataSource";

describe("WebAudioAlertController", () => {
  it("does nothing when the Web Audio API is unavailable (e.g. jsdom/older browsers)", () => {
    expect(() => new WebAudioAlertController().play("urgent")).not.toThrow();
  });
});
