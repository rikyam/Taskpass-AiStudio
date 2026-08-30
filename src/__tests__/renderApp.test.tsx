// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import App from "../App";

describe("App Render Test", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
