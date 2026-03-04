import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toastError, toastSuccess, resetSharedMocks } from "@/test/mocks";

const { signInEmail } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmail,
    },
  },
}));

import SignInForm from "./sign-in-form";

describe("SignInForm", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    resetSharedMocks();
  });

  it("validates input before submitting", async () => {
    render(<SignInForm onSwitchToSignUp={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad-email" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInEmail).not.toHaveBeenCalled();
    });
  });

  it("submits successfully and redirects", async () => {
    signInEmail.mockImplementation(async (_values, callbacks) => {
      callbacks.onSuccess();
    });

    render(<SignInForm onSwitchToSignUp={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dealer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledWith(
        { email: "dealer@example.com", password: "password123" },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
    expect(toastSuccess).toHaveBeenCalledWith("Sign in successful");
  });

  it("shows an error toast when auth fails", async () => {
    signInEmail.mockImplementation(async (_values, callbacks) => {
      callbacks.onError({ error: { message: "Bad credentials", statusText: "Unauthorized" } });
    });

    render(<SignInForm onSwitchToSignUp={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dealer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Bad credentials");
    });
  });

  it("switches to sign up mode", () => {
    const onSwitchToSignUp = vi.fn();

    render(<SignInForm onSwitchToSignUp={onSwitchToSignUp} />);

    fireEvent.click(screen.getByRole("button", { name: "Need an account? Sign up" }));

    expect(onSwitchToSignUp).toHaveBeenCalledTimes(1);
  });
});
