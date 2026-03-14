"use client";

import * as React from "react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Edit,
  UserCog,
  UserX,
  UserCheck,
  Trash2,
  UserPlus,
  Users,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import type { Profile, UserRole } from "@/lib/supabase/types";
import { DataTable } from "@/components/shared";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/utils";
import {
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  inviteUser,
} from "../actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsersPageClientProps {
  users: Profile[];
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "technician", label: "Technician" },
  { value: "viewer", label: "Viewer" },
];

function getRoleBadgeVariant(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "manager":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "technician":
      return "bg-green-100 text-green-800 border-green-200";
    case "viewer":
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getRoleAvatarColor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-700";
    case "manager":
      return "bg-blue-100 text-blue-700";
    case "technician":
      return "bg-green-100 text-green-700";
    case "viewer":
      return "bg-slate-100 text-slate-600";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// InviteUserDialog
// ---------------------------------------------------------------------------

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "" as UserRole | "",
    department: "",
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.role) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsPending(true);
    try {
      await inviteUser({
        email: form.email,
        fullName: form.fullName,
        role: form.role as UserRole,
        department: form.department || undefined,
      });
      toast.success(`Invitation sent to ${form.email}.`);
      setForm({ fullName: "", email: "", role: "", department: "" });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite user.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new user to the platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-full-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invite-full-name"
              placeholder="Jane Smith"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.role}
              onValueChange={(val) => handleChange("role", val)}
              disabled={isPending}
            >
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-department">Department</Label>
            <Input
              id="invite-department"
              placeholder="e.g. Maintenance, Operations"
              value={form.department}
              onChange={(e) => handleChange("department", e.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EditUserSheet
// ---------------------------------------------------------------------------

interface EditUserSheetProps {
  user: Profile | null;
  onOpenChange: (open: boolean) => void;
}

function EditUserSheet({ user, onOpenChange }: EditUserSheetProps) {
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    role: (user?.role ?? "viewer") as UserRole,
    department: user?.department ?? "",
    phone: user?.phone ?? "",
    is_active: user?.is_active ?? true,
  });

  // Sync form when user changes
  React.useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name,
        role: user.role,
        department: user.department ?? "",
        phone: user.phone ?? "",
        is_active: user.is_active,
      });
    }
  }, [user]);

  function handleChange<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsPending(true);
    try {
      await updateUser(user.id, {
        full_name: form.full_name,
        role: form.role,
        department: form.department || null,
        phone: form.phone || null,
        is_active: form.is_active,
      });
      toast.success("User updated successfully.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>
            Update profile details for {user?.full_name ?? "this user"}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-full-name">Full Name</Label>
            <Input
              id="edit-full-name"
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(val) => handleChange("role", val as UserRole)}
              disabled={isPending}
            >
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-department">Department</Label>
            <Input
              id="edit-department"
              placeholder="e.g. Maintenance"
              value={form.department}
              onChange={(e) => handleChange("department", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active Account</p>
              <p className="text-xs text-muted-foreground">
                Inactive users cannot log in.
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(val) => handleChange("is_active", val)}
              disabled={isPending}
            />
          </div>
          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// RoleChangeDialog
// ---------------------------------------------------------------------------

interface RoleChangeDialogProps {
  user: Profile | null;
  onOpenChange: (open: boolean) => void;
}

function RoleChangeDialog({ user, onOpenChange }: RoleChangeDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>(user?.role ?? "viewer");

  React.useEffect(() => {
    if (user) setNewRole(user.role);
  }, [user]);

  async function handleConfirm() {
    if (!user) return;
    setIsPending(true);
    try {
      await updateUser(user.id, { role: newRole });
      toast.success(`${user.full_name}'s role changed to ${newRole}.`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Select a new role for <strong>{user?.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <Select
            value={newRole}
            onValueChange={(val) => setNewRole(val as UserRole)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || newRole === user?.role}>
            {isPending ? "Saving..." : "Confirm Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// DeactivateDialog
// ---------------------------------------------------------------------------

interface DeactivateDialogProps {
  user: Profile | null;
  onOpenChange: (open: boolean) => void;
}

function DeactivateDialog({ user, onOpenChange }: DeactivateDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleAction() {
    if (!user) return;
    setIsPending(true);
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
        toast.success(`${user.full_name} has been deactivated.`);
      } else {
        await activateUser(user.id);
        toast.success(`${user.full_name} has been activated.`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsPending(false);
    }
  }

  const isDeactivating = user?.is_active ?? true;

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeactivating ? "Deactivate User" : "Activate User"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDeactivating
              ? `This will prevent ${user?.full_name ?? "this user"} from logging in. You can reactivate them at any time.`
              : `This will restore ${user?.full_name ?? "this user"}'s access to the platform.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={isPending}
            className={
              isDeactivating
                ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
                : undefined
            }
          >
            {isPending
              ? isDeactivating
                ? "Deactivating..."
                : "Activating..."
              : isDeactivating
                ? "Deactivate"
                : "Activate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// DeleteDialog
// ---------------------------------------------------------------------------

interface DeleteDialogProps {
  user: Profile | null;
  onOpenChange: (open: boolean) => void;
}

function DeleteDialog({ user, onOpenChange }: DeleteDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!user) return;
    setIsPending(true);
    try {
      await deleteUser(user.id);
      toast.success(`${user.full_name} has been removed.`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{user?.full_name}</strong>? Their
            account will be deactivated and they will lose access to the platform. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
          >
            {isPending ? "Removing..." : "Remove User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function UsersPageClient({ users, currentUserId }: UsersPageClientProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<Profile | null>(null);
  const [deactivateDialogUser, setDeactivateDialogUser] = useState<Profile | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<Profile | null>(null);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const technicianCount = users.filter((u) => u.role === "technician").length;

  const columns: ColumnDef<Profile>[] = [
    {
      id: "user",
      header: "Name",
      accessorKey: "full_name",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
              <AvatarFallback
                className={`text-xs font-semibold ${getRoleAvatarColor(user.role)}`}
              >
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-none text-slate-900">
                {user.full_name}
                {user.id === currentUserId && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge
            variant="outline"
            className={`capitalize text-xs font-medium ${getRoleBadgeVariant(role)}`}
          >
            {role}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue?.length) return true;
        return filterValue.includes(row.original.role);
      },
    },
    {
      id: "department",
      header: "Department",
      accessorKey: "department",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.department ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      id: "is_active",
      header: "Status",
      accessorKey: "is_active",
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${active ? "bg-green-500" : "bg-red-400"}`}
            />
            <span className={`text-sm ${active ? "text-green-700" : "text-red-600"}`}>
              {active ? "Active" : "Inactive"}
            </span>
          </div>
        );
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue?.length) return true;
        const isActive = row.original.is_active;
        if (filterValue.includes("active") && isActive) return true;
        if (filterValue.includes("inactive") && !isActive) return true;
        return false;
      },
    },
    {
      id: "created_at",
      header: "Joined",
      accessorKey: "created_at",
      cell: ({ row }) => (
        <span className="text-sm text-slate-500">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUserId;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditUser(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRoleChangeUser(user)}
                disabled={isSelf}
              >
                <UserCog className="mr-2 h-4 w-4" />
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeactivateDialogUser(user)}
                disabled={isSelf}
              >
                {user.is_active ? (
                  <>
                    <UserX className="mr-2 h-4 w-4 text-amber-600" />
                    <span className="text-amber-700">Deactivate</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                    <span className="text-green-700">Activate</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogUser(user)}
                disabled={isSelf}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  const filterableColumns = [
    {
      id: "role",
      title: "Role",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Manager", value: "manager" },
        { label: "Technician", value: "technician" },
        { label: "Viewer", value: "viewer" },
      ],
    },
    {
      id: "is_active",
      title: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title="User Management"
        description="Manage team members and their roles"
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        }
      />

      {/* Stat badges */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 shadow-sm">
          <Users className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {totalUsers} Total
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-slate-700">
            {activeUsers} Active
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 shadow-sm">
          <Wrench className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-slate-700">
            {technicianCount} Technicians
          </span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchKey="full_name"
        searchPlaceholder="Search users..."
        filterableColumns={filterableColumns}
      />

      {/* Dialogs */}
      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <EditUserSheet
        user={editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      />

      <RoleChangeDialog
        user={roleChangeUser}
        onOpenChange={(open) => {
          if (!open) setRoleChangeUser(null);
        }}
      />

      <DeactivateDialog
        user={deactivateDialogUser}
        onOpenChange={(open) => {
          if (!open) setDeactivateDialogUser(null);
        }}
      />

      <DeleteDialog
        user={deleteDialogUser}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogUser(null);
        }}
      />
    </>
  );
}
