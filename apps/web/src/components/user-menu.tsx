import { api } from "@palatro/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function UserMenu() {
  const user = useQuery(api.auth.getCurrentUser);
  const accountLabel = user?.name ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-full min-w-0 shrink justify-start overflow-hidden px-4 sm:w-auto sm:max-w-[12rem] sm:justify-center"
          />
        }
      >
        <span className="mr-1.5 shrink-0 text-xs text-primary/50">{"\u2660"}</span>
        <span
          data-testid="user-menu-trigger-label"
          className="min-w-0 flex-1 truncate text-left sm:flex-none"
          title={accountLabel}
        >
          {accountLabel}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="flex items-center gap-2">
              <span className="text-primary/40">{"\u2665"}</span>
              My Account
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="block cursor-text whitespace-normal break-all text-muted-foreground text-xs">
            {user?.email}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    location.reload();
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
