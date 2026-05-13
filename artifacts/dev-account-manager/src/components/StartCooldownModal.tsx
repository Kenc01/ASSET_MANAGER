import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import {
  useStartCooldown,
  getListAccountsQueryKey,
  getGetAccountStatsQueryKey,
} from "@workspace/api-client-react";
import type { Account } from "@workspace/api-client-react/src/generated/api.schemas";

const cooldownSchema = z.object({
  durationHours: z.coerce.number().min(0.1, "Must be at least 0.1 hours"),
});

type CooldownFormValues = z.infer<typeof cooldownSchema>;

interface StartCooldownModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

export function StartCooldownModal({ isOpen, onOpenChange, account }: StartCooldownModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startCooldown = useStartCooldown();

  const form = useForm<CooldownFormValues>({
    resolver: zodResolver(cooldownSchema),
    defaultValues: {
      durationHours: account?.cooldownDurationHours || 24,
    },
  });

  // Reset form when account changes
  useState(() => {
    if (account) {
      form.reset({
        durationHours: account.cooldownDurationHours || 24,
      });
    }
  });

  const onSubmit = (data: CooldownFormValues) => {
    if (!account) return;

    startCooldown.mutate(
      {
        id: account.id,
        data: {
          durationHours: data.durationHours,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Cooldown started",
            description: `Account will be available in ${data.durationHours} hours.`,
          });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
          onOpenChange(false);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to start cooldown.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start Cooldown</DialogTitle>
          <DialogDescription>
            Mark this account as cooling down to prevent it from being used too frequently.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="durationHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Hours)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={startCooldown.isPending}
              >
                {startCooldown.isPending ? "Starting..." : "Start Cooldown"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
