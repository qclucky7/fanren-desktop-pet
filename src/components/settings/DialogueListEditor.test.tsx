import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DialogueListEditor } from "./DialogueListEditor";

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

function EditorHarness({ initialValue = "第一条\n第二条\n第三条" }) {
  const [value, setValue] = useState(initialValue);
  return (
    <DialogueListEditor
      label="待机对话"
      hint="按设定间隔出现"
      value={value}
      disabled={false}
      resetDisabled={false}
      onChange={setValue}
      onReset={vi.fn()}
    />
  );
}

describe("DialogueListEditor", () => {
  it("edits one dialogue without changing adjacent dialogues", () => {
    render(<EditorHarness />);

    fireEvent.change(screen.getByLabelText("待机对话第 2 条"), {
      target: { value: "第二条已经修改，而且可以是一段很长的内容" },
    });

    expect(screen.getByLabelText("待机对话第 1 条")).toHaveValue("第一条");
    expect(screen.getByLabelText("待机对话第 2 条")).toHaveValue("第二条已经修改，而且可以是一段很长的内容");
    expect(screen.getByLabelText("待机对话第 3 条")).toHaveValue("第三条");
  });

  it("creates a separate dialogue after the current item when Enter is pressed", () => {
    render(<EditorHarness initialValue={"第一条\n第二条"} />);

    fireEvent.keyDown(screen.getByLabelText("待机对话第 1 条"), { key: "Enter" });

    expect(screen.getByLabelText("待机对话第 1 条")).toHaveValue("第一条");
    expect(screen.getByLabelText("待机对话第 2 条")).toHaveValue("");
    expect(screen.getByLabelText("待机对话第 3 条")).toHaveValue("第二条");
  });

  it("removes only the selected dialogue", () => {
    render(<EditorHarness />);

    fireEvent.click(screen.getByRole("button", { name: "删除待机对话第 2 条" }));

    expect(screen.getByLabelText("待机对话第 1 条")).toHaveValue("第一条");
    expect(screen.getByLabelText("待机对话第 2 条")).toHaveValue("第三条");
    expect(screen.queryByLabelText("待机对话第 3 条")).not.toBeInTheDocument();
  });

  it("gives multi-dialogue groups a definite scroll viewport height", () => {
    const { container } = render(
      <EditorHarness initialValue={"一\n二\n三\n四\n五\n六"} />,
    );

    expect(container.querySelector(".dialogue-list-scroll")).toHaveStyle({ height: "238px" });
  });
});
