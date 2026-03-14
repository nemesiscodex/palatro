import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toastError, toastSuccess, resetSharedMocks } from "@/test/mocks";

const { signUpEmail } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: signUpEmail,
    },
  },
}));

import SignUpForm from "./sign-up-form";

describe("SignUpForm", () => {
  beforeEach(() => {
    signUpEmail.mockReset();
    resetSharedMocks();
  });

  it("validates input before submitting", async () => {
    render(<SignUpForm onSwitchToSignIn={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad-email" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Create host account" }));

    await waitFor(() => {
      expect(signUpEmail).not.toHaveBeenCalled();
    });
  });

  it("submits successfully and redirects", async () => {
    signUpEmail.mockImplementation(async (_values, callbacks) => {
      callbacks.onSuccess();
    });

    render(<SignUpForm onSwitchToSignIn={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dealer" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dealer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create host account" }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith(
        {
          email: "dealer@example.com",
          password: "password123",
          name: "Dealer",
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
    expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
    expect(toastSuccess).toHaveBeenCalledWith("Sign up successful");
  });

  it("shows an error toast when sign up fails", async () => {
    signUpEmail.mockImplementation(async (_values, callbacks) => {
      callbacks.onError({ error: { message: "Email already exists", statusText: "Conflict" } });
    });

    render(<SignUpForm onSwitchToSignIn={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dealer" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dealer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create host account" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Email already exists");
    });
  });

  it("switches to sign in mode", () => {
    const onSwitchToSignIn = vi.fn();

    render(<SignUpForm onSwitchToSignIn={onSwitchToSignIn} />);

    fireEvent.click(screen.getByRole("button", { name: "Already have an account? Sign in" }));

    expect(onSwitchToSignIn).toHaveBeenCalledTimes(1);
  });

  it("uses redirectTo when provided", async () => {
    signUpEmail.mockImplementation(async (_values, callbacks) => {
      callbacks.onSuccess();
    });

    render(<SignUpForm onSwitchToSignIn={vi.fn()} redirectTo="/rooms/demo-room" />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dealer" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dealer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create host account" }));

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("/rooms/demo-room");
    });
  });

  it("sets mobile-friendly autocomplete and spellcheck attributes", () => {
    render(<SignUpForm onSwitchToSignIn={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Email")).toHaveAttribute("spellcheck", "false");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  });
});
