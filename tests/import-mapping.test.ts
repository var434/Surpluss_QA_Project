import { describe, expect, it } from "vitest";
import {
  autoMap,
  parseNumber,
  validateRows,
  type ParsedFile,
} from "@/lib/import-mapping";

describe("spreadsheet import mapping and validation", () => {
  it("maps common seller column headings to product fields", () => {
    expect(
      autoMap(["Product Code", "Product Name", "Qty", "List Price", "Selling Price"]),
    ).toEqual({
      "Product Code": "sku",
      "Product Name": "name",
      Qty: "quantity",
      "List Price": "mrp",
      "Selling Price": "offerPrice",
    });
  });

  it("parses Indian currency notation and digit grouping", () => {
    expect(parseNumber("₹1,20,000")).toBe(120000);
  });

  it("parses a price followed by its selling unit", () => {
    expect(parseNumber("₹1,20,000 / piece")).toBe(120000);
  });

  it("blocks rows with fractional available stock instead of importing them", () => {
    const file: ParsedFile = {
      name: "stock.csv",
      sizeKB: 1,
      headers: ["SKU", "Product Name", "Available Quantity"],
      rows: [
        {
          SKU: "CHAIR-1",
          "Product Name": "Office chair",
          "Available Quantity": "2.5",
        },
      ],
    };

    const result = validateRows(file, autoMap(file.headers));

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      {
        row: 2,
        message: "The available quantity is not a whole number (SKU CHAIR-1)",
        blocking: true,
      },
    ]);
  });
});
