import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, X, Check, Clock, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/lib/theme-provider";
import { useOperatorProfile } from "@/hooks/useMissionData";
import * as api from "@/services/api";
import type { OperatorProfile } from "@/types/mission";

export function OperatorProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: profile, isLoading, refetch } = useOperatorProfile();
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<OperatorProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setDraft({ fullName: profile.fullName, email: profile.email, role: profile.role });
  }, [profile]);

  const save = async () => {
    setSaving(true);
    await api.updateOperatorProfile(draft);
    setSaving(false);
    setEditing(false);
    toast.success("Profile updated");
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Operator Profile</DialogTitle>
          <DialogDescription>Pilot-in-command details for this session</DialogDescription>
        </DialogHeader>

        {isLoading || !profile ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary-muted text-lg font-semibold text-primary">
                {profile.avatarInitials}
              </span>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <Input
                    value={draft.fullName ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                    className="h-8 text-sm font-semibold"
                  />
                ) : (
                  <p className="truncate text-sm font-semibold">{profile.fullName}</p>
                )}
                <p className="truncate text-xs text-muted-foreground">{profile.role}</p>
              </div>
              <Badge variant={profile.currentStatus === "On Duty" ? "success" : "outline"} dot>
                {profile.currentStatus}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Operator ID</p>
                <p className="mt-0.5 font-medium">{profile.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Organization</p>
                <p className="mt-0.5 font-medium">{profile.organization}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Email</p>
                {editing ? (
                  <Input
                    value={draft.email ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    className="mt-1 h-8 text-xs"
                  />
                ) : (
                  <p className="mt-0.5 font-medium">{profile.email}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p className="mt-0.5 font-medium">{new Date(profile.joinedISO).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Login</p>
                <p className="mt-0.5 font-medium">{new Date(profile.lastLoginISO).toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Theme Preference</p>
                <p className="mt-0.5 font-medium capitalize">{theme}</p>
              </div>
              <div>
                <p className="text-muted-foreground">System Version</p>
                <p className="mt-0.5 font-medium mono">{profile.systemVersion}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                <Clock className="size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold tabular-nums">{profile.missionHours.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Mission Hours</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                <Activity className="size-4 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-semibold tabular-nums">{profile.completedMissions}</p>
                  <p className="text-[10px] text-muted-foreground">Completed Missions</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="gap-1.5">
                    <X className="size-3.5" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                    <Check className="size-3.5" />
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                  <Pencil className="size-3.5" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
