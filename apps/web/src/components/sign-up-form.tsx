import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";
import { usePostHog } from "@posthog/react";

import { authClient } from "@/lib/auth-client";
import { getUserFacingErrorMessage } from "@/lib/errors";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const posthog = usePostHog();
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            posthog.capture("user_signed_up", {
              method: "email",
            });
            window.location.assign("/dashboard");
            toast.success("Sign up successful");
          },
          onError: (error) => {
            toast.error(getUserFacingErrorMessage(error.error.message || error.error.statusText));
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <div className="felt-panel relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
      {/* Decorative corner suits */}
      <span className="absolute top-5 right-6 font-serif text-2xl text-primary/[0.06]">{"\u2660"}</span>
      <span className="absolute bottom-5 left-6 rotate-180 font-serif text-2xl text-primary/[0.06]">{"\u2665"}</span>

      <p className="ornate-label mb-4 text-primary/60">Open the room</p>
      <h1 className="mb-2 font-serif text-4xl leading-none tracking-tight">
        Become the <span className="text-gold-gradient italic">dealer</span>
      </h1>
      <p className="text-muted-foreground mb-7 text-sm leading-relaxed">
        Create rooms, set the scale, reveal the table.
      </p>

      <div className="gold-rule mb-6" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Your name"
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
                  placeholder="8+ characters"
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
              {state.isSubmitting ? "Opening..." : "Create host account"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-5 text-center">
        <Button variant="link" onClick={onSwitchToSignIn} className="text-primary/70 hover:text-primary">
          Already have an account? Sign in
        </Button>
      </div>
    </div>
  );
}
