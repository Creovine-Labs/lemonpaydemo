"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./firebase-client";

/**
 * Subscribe to Firebase Auth state. Returns the current user (or null if
 * signed out) and a `loading` flag for the initial check.
 *
 * `loading` is true until Firebase resolves the persisted session — guard
 * redirects on it so we don't bounce signed-in users off protected pages.
 */
export function useAuth(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
