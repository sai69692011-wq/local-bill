import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PosTable } from "../../../packages/pos-core/src/types";
import { TableMap } from "./TableMap";

// ---------------------------------------------------------------------------
// Fixtures – intentionally unsorted (number desc) to verify display sort
// ---------------------------------------------------------------------------

const tables: PosTable[] = [
  {
    id: "t3",
    tenantId: "tenant-demo",
    number: 3,
    status: "empty",
    openedAt: 0,
    staffId: "s1",
  },
  {
    id: "t1",
    tenantId: "tenant-demo",
    number: 1,
    status: "occupied",
    openedAt: 0,
    staffId: "s1",
  },
  {
    id: "t2",
    tenantId: "tenant-demo",
    number: 2,
    status: "waiting_payment",
    openedAt: 0,
    staffId: "s1",
  },
];

// ---------------------------------------------------------------------------

describe("TableMap", () => {
  it("renders three table cards sorted by number ascending (Table 1, Table 2, Table 3)", () => {
    render(
      <TableMap
        tables={tables}
        selectedTableId={null}
        onSelect={() => {}}
      />
    );

    const buttons = screen.getAllByRole("button");
    // There should be exactly 3 table buttons
    expect(buttons).toHaveLength(3);

    // Verify labels in sorted order: number 1, 2, 3
    expect(buttons[0]).toHaveTextContent("Table 1");
    expect(buttons[1]).toHaveTextContent("Table 2");
    expect(buttons[2]).toHaveTextContent("Table 3");
  });

  it("displays exact status labels: empty→Available, occupied→Occupied, waiting_payment→Payment Pending", () => {
    render(
      <TableMap
        tables={tables}
        selectedTableId={null}
        onSelect={() => {}}
      />
    );

    // occupied (number 1) → Occupied
    const btn1 = screen.getByRole("button", { name: /Table 1/i });
    expect(btn1).toHaveTextContent("Occupied");

    // waiting_payment (number 2) → Payment Pending
    const btn2 = screen.getByRole("button", { name: /Table 2/i });
    expect(btn2).toHaveTextContent("Payment Pending");

    // empty (number 3) → Available
    const btn3 = screen.getByRole("button", { name: /Table 3/i });
    expect(btn3).toHaveTextContent("Available");
  });

  it("calls onSelect with tableId when a table card is clicked", () => {
    const onSelect = vi.fn();

    render(
      <TableMap
        tables={tables}
        selectedTableId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Table 1/i }));
    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("applies selected ring to the currently selected table", () => {
    render(
      <TableMap
        tables={tables}
        selectedTableId="t2"
        onSelect={() => {}}
      />
    );

    const btn2 = screen.getByRole("button", { name: /Table 2/i });
    // The selected button should have the ring class applied
    expect(btn2.className).toMatch(/ring-2/);
  });

  it("exposes the empty table-map state as an accessible status", () => {
    render(
      <TableMap tables={[]} selectedTableId={null} onSelect={() => {}} />,
    );

    expect(
      screen.getByRole("status", { name: "No tables to display" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
