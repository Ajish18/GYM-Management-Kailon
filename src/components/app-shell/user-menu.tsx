"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({
  name,
  email,
  image,
  role,
}: {
  name: string;
  email?: string | null;
  image?: string | null;
  // Route segment for the role (e.g. "owner", "member") — used to build the
  // profile link. Mirrors the AppShell navKey so the dropdown knows which
  // profile page the current user belongs to.
  role: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-primary/50 focus-visible:ring-2">
        <Avatar className="h-9 w-9">
          {image && <AvatarImage src={image} alt={name} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{name}</span>
              {email && <span className="text-xs font-normal text-muted-foreground">{email}</span>}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/${role}/profile`} />}>
          <User className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
