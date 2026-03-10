import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";
import { usePostHog } from "@posthog/react";

import { getUserFacingErrorMessage } from "@/lib/errors";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm({
  onSwitchToSignUp,
  redirectTo,
}: {
  onSwitchToSignUp: () => void;
  redirectTo?: string;
}) {
  const posthog = usePostHog();
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            posthog.capture("user_signed_in", {
              method: "email",
            });
            window.location.assign(redirectTo || "/dashboard");
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(getUserFacingErrorMessage(error.error.message || error.error.statusText));
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <div className="felt-panel relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.35)] sm:p-8">
      {/* Decorative corner suits */}
      <span className="absolute top-5 right-6 font-serif text-2xl text-primary/[0.06]">{"\u2665"}</span>
      <span className="absolute bottom-5 left-6 rotate-180 font-serif text-2xl text-primary/[0.06]">{"\u2660"}</span>

      <p className="ornate-label mb-3 text-primary/60">Dealer return</p>
      <h1 className="mb-1.5 font-serif text-3xl leading-none tracking-tight lg:text-4xl">
        Back to the <span className="text-gold-gradient italic overflow-visible inline-block pr-[0.1em]">table</span>
      </h1>
      <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
        Rejoin your rooms and run the next round.
      </p>

      <div className="gold-rule mb-5" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="you@team.com"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Your password"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Entering..." : "Sign in"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-5 text-center">
        <Button variant="link" onClick={onSwitchToSignUp} className="text-primary/70 hover:text-primary">
          Need an account? Sign up
        </Button>
      </div>
    </div>
  );
}
