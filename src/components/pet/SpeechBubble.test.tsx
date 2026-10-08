import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpeechBubble } from "./SpeechBubble";

describe("SpeechBubble", () => {
  it("keeps the last line while the exit transition runs", () => {
    const { getByRole, rerender } = render(<SpeechBubble text="慢慢来。" visible />);

    rerender(<SpeechBubble text={null} visible={false} />);

    const bubble = getByRole("status", { hidden: true });
    expect(bubble).toHaveTextContent("慢慢来。");
    expect(bubble).toHaveAttribute("aria-hidden", "true");
    expect(bubble).toHaveClass("is-hidden");
  });

  it("shows a replacement line immediately", () => {
    const { getByRole, rerender } = render(<SpeechBubble text="第一句" visible />);

    rerender(<SpeechBubble text="第二句" visible />);

    expect(getByRole("status")).toHaveTextContent("第二句");
  });
});
