"use client";

import { useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import type { Profile } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileFormValues {
  full_name: string;
  phone: string;
  department: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRoleColor(
  role: Profile["role"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "admin":
      return "destructive"; // purple-ish via custom, using destructive as closest
    case "manager":
      return "default";
    case "technician":
      return "secondary";
    case "viewer":
    default:
      return "outline";
  }
}

function getRoleBadgeClass(role: Profile["role"]): string {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100";
    case "manager":
      return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100";
    case "technician":
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
    case "viewer":
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100";
  }
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProfileCardProps {
  profile: Profile;
  avatarUrl: string | null;
  onAvatarUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

function ProfileCard({
  profile,
  avatarUrl,
  onAvatarUpload,
  uploading,
}: ProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await onAvatarUpload(file);
      // Reset so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onAvatarUpload]
  );

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
        {/* Avatar with upload overlay */}
        <div className="relative group">
          <Avatar className="h-24 w-24">
            <AvatarImage
              src={avatarUrl ?? undefined}
              alt={profile.full_name}
            />
            <AvatarFallback className="text-2xl">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>

          {/* Camera overlay */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            aria-label="Upload profile photo"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Identity */}
        <div className="space-y-1">
          <p className="text-xl font-semibold">{profile.full_name}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>

        {/* Role badge */}
        <Badge
          variant="outline"
          className={getRoleBadgeClass(profile.role)}
        >
          {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
        </Badge>

        {/* Department */}
        {profile.department && (
          <p className="text-sm text-muted-foreground">{profile.department}</p>
        )}

        {/* Member since */}
        <div className="w-full border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Member since{" "}
            <span className="font-medium text-foreground">
              {formatDate(profile.created_at)}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit Profile Form
// ---------------------------------------------------------------------------

interface EditProfileCardProps {
  profile: Profile;
  onProfileUpdate: (data: Partial<Profile>) => void;
}

function EditProfileCard({ profile, onProfileUpdate }: EditProfileCardProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      department: profile.department ?? "",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const updates = {
        full_name: values.full_name,
        phone: values.phone || null,
        department: values.department || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);

      if (error) throw error;

      onProfileUpdate(updates);
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Update your personal details here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              placeholder="John Doe"
              {...register("full_name", {
                required: "Full name is required",
                minLength: {
                  value: 2,
                  message: "Full name must be at least 2 characters",
                },
              })}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">
                {errors.full_name.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              {...register("phone")}
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              placeholder="Engineering"
              {...register("department")}
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Change Password Card
// ---------------------------------------------------------------------------

interface ChangePasswordCardProps {
  email: string;
}

function ChangePasswordCard({ email }: ChangePasswordCardProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");
  const strength = getPasswordStrength(newPasswordValue);

  const onSubmit = async (values: PasswordFormValues) => {
    setSaving(true);
    try {
      // 1. Re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: values.currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password updated successfully");
      reset();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update password";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Keep your account secure by using a strong password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              {...register("currentPassword", {
                required: "Current password is required",
              })}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              {...register("newPassword", {
                required: "New password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">
                {errors.newPassword.message}
              </p>
            )}

            {/* Strength indicator */}
            {newPasswordValue && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs font-medium ${
                    strength.label === "Weak"
                      ? "text-red-500"
                      : strength.label === "Fair"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword", {
                required: "Please confirm your new password",
                validate: (value) =>
                  value === newPasswordValue || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page Client
// ---------------------------------------------------------------------------

interface ProfilePageClientProps {
  profile: Profile;
}

export function ProfilePageClient({ profile }: ProfilePageClientProps) {
  const supabase = createClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatar_url
  );
  const [uploading, setUploading] = useState(false);
  const [localProfile, setLocalProfile] = useState<Profile>(profile);

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const path = `${profile.id}/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        setAvatarUrl(publicUrl);
        toast.success("Profile photo updated");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to upload photo";
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [profile.id, supabase]
  );

  const handleProfileUpdate = useCallback((data: Partial<Profile>) => {
    setLocalProfile((prev) => ({ ...prev, ...data }));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your personal information and account settings."
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-1">
          <ProfileCard
            profile={localProfile}
            avatarUrl={avatarUrl}
            onAvatarUpload={handleAvatarUpload}
            uploading={uploading}
          />
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          <EditProfileCard
            profile={localProfile}
            onProfileUpdate={handleProfileUpdate}
          />
          <ChangePasswordCard email={localProfile.email} />
        </div>
      </div>
    </div>
  );
}
