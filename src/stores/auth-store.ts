import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

type AuthStore = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  clearAuth: () => void;
  initialize: () => Promise<void>;
};

const supabase = createClient();

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),

  clearAuth: () =>
    set({
      user: null,
      profile: null,
      session: null,
      isLoading: false,
    }),

  initialize: async () => {
    set({ isLoading: true });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      set({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
      });
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      set({
        user: null,
        profile: null,
        session,
        isLoading: false,
      });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    set({
      user,
      profile,
      session,
      isLoading: false,
    });
  },
}));
