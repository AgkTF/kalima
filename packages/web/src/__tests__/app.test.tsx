import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { createClient, trpc } from "../trpc";

function renderApp(initialRoute = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const trpcClient = createClient();
  const user = userEvent.setup();
  render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </trpc.Provider>,
  );
  return { user };
}

describe("App", () => {
  it("redirects '/' to '/capture'", () => {
    renderApp("/");
    expect(screen.getByText("Capture your first word")).toBeInTheDocument();
  });

  it("shows Capture empty state when navigating to /capture", () => {
    renderApp("/capture");
    expect(screen.getByText("Capture your first word")).toBeInTheDocument();
  });

  it("shows Review empty state when navigating to /review", () => {
    renderApp("/review");
    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("shows Word Bank empty state when navigating to /wordbank", () => {
    renderApp("/wordbank");
    expect(screen.getByText("Your word bank is empty")).toBeInTheDocument();
  });

  it("renders bottom tab bar with three navigation links", () => {
    renderApp("/capture");
    expect(screen.getByRole("link", { name: /capture/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /word bank/i }),
    ).toBeInTheDocument();
  });

  it("navigates to Review when clicking the Review tab", async () => {
    const { user } = renderApp("/capture");
    await user.click(screen.getByRole("link", { name: /review/i }));
    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("navigates to Word Bank when clicking the Word Bank tab", async () => {
    const { user } = renderApp("/capture");
    await user.click(screen.getByRole("link", { name: /word bank/i }));
    expect(screen.getByText("Your word bank is empty")).toBeInTheDocument();
  });
});
