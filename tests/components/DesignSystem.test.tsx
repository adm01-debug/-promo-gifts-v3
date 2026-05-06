import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@testing-library/jest-dom";

describe("Design System Consistency - Rounded Corners", () => {
  const roundedClass = "rounded-lg";

  describe("Button component", () => {
    it("should have rounded-lg class by default", () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole("button", { name: /test button/i });
      expect(button).toHaveClass(roundedClass);
    });

    it("should maintain rounded-lg class across all variants", () => {
      const variants = [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "premium",
        "success",
        "gradient",
      ] as const;

      variants.forEach((variant) => {
        const { unmount } = render(<Button variant={variant}>Variant {variant}</Button>);
        const button = screen.getByRole("button", { name: new RegExp(`Variant ${variant}`, "i") });
        expect(button).toHaveClass(roundedClass);
        unmount();
      });
    });

    it("should maintain rounded-lg class across all sizes", () => {
      const sizes = ["default", "sm", "lg", "xl", "icon"] as const;

      sizes.forEach((size) => {
        const label = `Size ${size}`;
        const { unmount } = render(<Button size={size}>{label}</Button>);
        const button = screen.getByRole("button", { name: new RegExp(label, "i") });
        expect(button).toHaveClass(roundedClass);
        unmount();
      });
    });
  });

  describe("Input component", () => {
    it("should have rounded-lg class", () => {
      render(<Input placeholder="Test Input" />);
      const input = screen.getByPlaceholderText("Test Input");
      expect(input).toHaveClass(roundedClass);
    });
  });
});
