import { api } from "@palatro/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import CreateRoomForm from "@/components/create-room-form";
import RoomList from "@/components/room-list";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(false);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const apiAny = api as any;
  const rooms = useQuery(apiAny.rooms.listMine, !isLoading && isAuthenticated ? {} : "skip");
  const createRoom = useMutation(apiAny.rooms.create);

  return (
    <>
      <Authenticated>
        <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,320px)_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Host controls</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <UserMenu />
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Finishing authentication...</p>
              ) : (
                <CreateRoomForm
                  onCreateRoom={async ({ name, scaleType }) => {
                    try {
                      const result = await createRoom({ name, scaleType });
                      toast.success("Room created");
                      window.location.assign(`/rooms/${result.slug}`);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Could not create the room",
                      );
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
          <section className="grid gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Your rooms</h1>
              <p className="text-muted-foreground text-sm">
                Each room keeps a stable URL you can share with your team.
              </p>
            </div>
            <RoomList rooms={(rooms ?? []) as any} />
          </section>
        </main>
      </Authenticated>
      <Unauthenticated>
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        )}
      </Unauthenticated>
      <AuthLoading>
        <div>Loading...</div>
      </AuthLoading>
    </>
  );
}
