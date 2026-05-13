import { useState, useEffect } from "react";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";
import { 
  MoreVertical, 
  Lock, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Archive,
  Trash2,
  Edit,
  RotateCcw,
  Clock
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";

import {
  useUpdateAccountStatus,
  useMarkAccountInUse,
  useCancelCooldown,
  useDeleteAccount,
  getListAccountsQueryKey,
  getGetAccountStatsQueryKey,
} from "@workspace/api-client-react";
import type { Account } from "@workspace/api-client-react/src/generated/api.schemas";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onStartCooldown: (account: Account) => void;
}

export function AccountCard({ account, onEdit, onStartCooldown }: AccountCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updateStatus = useUpdateAccountStatus();
  const markInUse = useMarkAccountInUse();
  const cancelCooldown = useCancelCooldown();
  const deleteAccount = useDeleteAccount();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (account.status === "cooling-down" && account.cooldownEndsAt) {
      const endsAt = new Date(account.cooldownEndsAt);
      
      const updateTimer = () => {
        const secs = differenceInSeconds(endsAt, new Date());
        setTimeLeft(secs > 0 ? secs : 0);
        
        // Auto-refresh if timer hits 0
        if (secs <= 0) {
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [account.status, account.cooldownEndsAt, queryClient]);

  const formatTimeLeft = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const handleStatusChange = (status: "available" | "in-use" | "archived") => {
    updateStatus.mutate(
      { id: account.id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
        },
      }
    );
  };

  const handleMarkInUse = () => {
    markInUse.mutate(
      { id: account.id },
      {
        onSuccess: () => {
          toast({ title: "Marked as In Use" });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
        },
      }
    );
  };

  const handleCancelCooldown = () => {
    cancelCooldown.mutate(
      { id: account.id },
      {
        onSuccess: () => {
          toast({ title: "Cooldown cancelled" });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteAccount.mutate(
      { id: account.id },
      {
        onSuccess: () => {
          toast({ title: "Account deleted" });
          setIsDeleteDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
        },
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "in-use": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "cooling-down": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "archived": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      default: return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Available";
      case "in-use": return "In Use";
      case "cooling-down": return "Cooling Down";
      case "archived": return "Archived";
      default: return status;
    }
  };

  return (
    <>
      <Card className="flex flex-col border-border/50 bg-card/50 backdrop-blur hover-elevate transition-colors group">
        <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1.5 overflow-hidden">
            <CardTitle className="text-base font-semibold truncate text-foreground flex items-center gap-2">
              {account.email}
              <Lock className="h-3 w-3 text-muted-foreground/70" />
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`font-medium ${getStatusColor(account.status)}`}>
                {account.status === "cooling-down" && timeLeft !== null && timeLeft > 0 ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeLeft(timeLeft)}
                  </span>
                ) : (
                  getStatusLabel(account.status)
                )}
              </Badge>
              {account.lastUsedAt && (
                <span className="text-xs text-muted-foreground truncate">
                  Used {formatDistanceToNow(new Date(account.lastUsedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 -mr-2 text-muted-foreground hover:text-foreground">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {account.status !== "available" && (
                <DropdownMenuItem onClick={() => handleStatusChange("available")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Available
                </DropdownMenuItem>
              )}
              
              {account.status !== "in-use" && (
                <DropdownMenuItem onClick={handleMarkInUse}>
                  <Play className="mr-2 h-4 w-4" />
                  Mark In Use
                </DropdownMenuItem>
              )}
              
              {account.status === "cooling-down" ? (
                <DropdownMenuItem onClick={handleCancelCooldown}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Cooldown
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onStartCooldown(account)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Start Cooldown
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Account
              </DropdownMenuItem>
              
              {account.status !== "archived" ? (
                <DropdownMenuItem onClick={() => setIsArchiveDialogOpen(true)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleStatusChange("available")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Unarchive
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent className="px-5 pb-4 flex-1">
          {account.notes ? (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {account.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/40 italic mb-4">
              No notes provided.
            </p>
          )}
          
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {account.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-secondary/50 text-secondary-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="px-5 py-3 border-t border-border/40 bg-muted/20 flex justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
            <Lock className="h-3 w-3" /> Secured
          </div>
          
          <div className="flex gap-2">
            {account.status === "available" && (
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleMarkInUse}>
                Use Now
              </Button>
            )}
            {account.status === "in-use" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStartCooldown(account)}>
                Cooldown
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account <strong>{account.email}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the account <strong>{account.email}</strong> to the archived list.
              You can unarchive it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                handleStatusChange("archived");
                setIsArchiveDialogOpen(false);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
