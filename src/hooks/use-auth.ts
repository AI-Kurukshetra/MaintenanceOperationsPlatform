"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

type AuthResult = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthResult {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        return null;
      }

      return data;
    },
    [supabase],
  );

  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setUser(currentUser);

    if (currentUser) {
      const currentProfile = await fetchProfile(currentUser.id);
      setProfile(currentProfile);
    } else {
      setProfile(null);
    }

    setIsLoading(false);
  }, [fetchProfile, supabase]);

  useEffect(() => {
    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        void fetchProfile(nextUser.id).then((result) => {
          setProfile(result);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, initializeAuth, supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      setError(null);

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      }
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    setUser(null);
    setProfile(null);
  }, [supabase]);

  return {
    user,
    profile,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  };
}
