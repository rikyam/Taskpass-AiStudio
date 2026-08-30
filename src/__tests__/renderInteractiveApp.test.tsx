// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import InteractiveApp from "../components/InteractiveApp";

describe("InteractiveApp Render Test", () => {
  it("renders InteractiveApp without crashing", () => {
    const { container } = render(<InteractiveApp darkMode={true} />);
    expect(container).toBeTruthy();
  });
});
