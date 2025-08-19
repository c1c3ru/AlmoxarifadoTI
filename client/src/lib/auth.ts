import type { User } from "@shared/schema";

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

export function canManageItems(user: User | null): boolean {
  return user !== null;
}

export function canDeleteItems(user: User | null): boolean {
  return isAdmin(user);
}

export function canManageUsers(user: User | null): boolean {
  return isAdmin(user);
}

export function canManageCategories(user: User | null): boolean {
  return isAdmin(user);
}
