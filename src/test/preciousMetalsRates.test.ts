import { describe, expect, it } from "vitest";
import { parseGoodreturnsRate } from "@/hooks/usePreciousMetals";

describe("Goodreturns Bengaluru metal rate parsing", () => {
  it("reads only the 22K gold value from the one-gram row", () => {
    const markdown = `## Today Gold Price Per Gram in Bangalore (INR)
| Gram | 24K | 22K | 18K |
| --- | --- | --- | --- |
| 1 | ₹14,357 | ₹13,160 | ₹10,768 |
| 8 | ₹1,14,856 | ₹1,05,280 | ₹86,144 |`;

    expect(parseGoodreturnsRate(markdown, "gold22k")).toBe(13160);
  });

  it("reads Silver's one-gram row rather than the kilogram row", () => {
    const markdown = `## Today Silver Price Per Gram/Kg in Bangalore (INR)
| Grams | Price | Price | Change |
| --- | --- | --- | --- |
| 1 | ₹205 | ₹205 | 0 |
| 1000 | ₹2,05,000 | ₹2,05,000 | 0 |`;

    expect(parseGoodreturnsRate(markdown, "silver")).toBe(205);
  });

  it("reads Platinum's one-gram row", () => {
    const markdown = `## Today Platinum Price Per Gram in Bangalore (INR)
| Gram | Price | Price | Change |
| --- | --- | --- | --- |
| 1 | ₹4,582 | ₹4,582 | 0 |
| 10 | ₹45,820 | ₹45,820 | 0 |`;

    expect(parseGoodreturnsRate(markdown, "platinum")).toBe(4582);
  });
});