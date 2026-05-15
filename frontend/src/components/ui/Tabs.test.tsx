import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

describe("Tabs", () => {
  function TestTabs({ defaultValue = "a" }) {
    return (
      <Tabs defaultValue={defaultValue}>
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>
    );
  }

  it("renders tabs", () => {
    render(<TestTabs />);
    expect(screen.getByText("Tab A")).toBeInTheDocument();
    expect(screen.getByText("Tab B")).toBeInTheDocument();
  });

  it("shows active content by default", () => {
    render(<TestTabs defaultValue="a" />);
    expect(screen.getByText("Content A")).toBeVisible();
  });

  it("switches content on click", async () => {
    const user = userEvent.setup();
    render(<TestTabs defaultValue="a" />);
    await user.click(screen.getByText("Tab B"));
    // Active panel switches — Content B panel is now active
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("Content B");
  });

  it("TabsTrigger has underline classes", () => {
    render(<TestTabs />);
    const triggerA = screen.getByText("Tab A");
    expect(triggerA.className).toContain("border-b-2");
  });
});
