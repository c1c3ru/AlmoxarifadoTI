import type { User } from "@shared/schema";

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

export function canDeleteItems(user: User | null): boolean {
  return isAdmin(user);
}
