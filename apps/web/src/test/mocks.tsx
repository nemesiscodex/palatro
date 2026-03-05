import type { PropsWithChildren } from "react";

import { vi } from "vitest";

export const toastSuccess = vi.fn();
export const toastError = vi.fn();

export function resetSharedMocks() {
  toastSuccess.mockReset();
  toastError.mockReset();
  const assign = window.location.assign as unknown as { mockReset?: () => void };
  assign.mockReset?.();
}

export function MockLink({
  children,
  params,
  to,
  ...props
}: PropsWithChildren<{ to: string; params?: Record<string, string> }>) {
  const href = params?.slug ? `/rooms/${params.slug}` : to;
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

export function MockNavigate({ to }: { to: string }) {
  return <div data-testid="navigate" data-to={to} />;
}

export function RenderIf({
  when,
  children,
}: PropsWithChildren<{ when: boolean }>) {
  return when ? <>{children}</> : null;
}
