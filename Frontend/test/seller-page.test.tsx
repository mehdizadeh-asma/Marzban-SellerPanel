import { render, screen } from "@testing-library/react";

import SellerPage from "@/app/seller/page";

jest.mock("@/components/Login", () => ({
  __esModule: true,
  default: () => <div data-testid="login" />,
}));

jest.mock("@/context/MyContext", () => ({
  useMyContext: () => ({
    config: { PAGE_TITLE: "Test Page Title" },
  }),
}));

describe("Seller page", () => {
  it("renders login and page title from config", () => {
    render(<SellerPage />);

    expect(screen.getByTestId("login")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 5, name: "Test Page Title" })).toBeInTheDocument();
  });
});
