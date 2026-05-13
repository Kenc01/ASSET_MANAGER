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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import {
  useCreateAccount,
  useUpdateAccount,
  getListAccountsQueryKey,
  getGetAccountStatsQueryKey,
} from "@workspace/api-client-react";
import type { Account } from "@workspace/api-client-react/src/generated/api.schemas";

const accountFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required").optional().or(z.literal("")),
  notes: z.string().optional(),
  tags: z.string().optional(), // Comma separated
  cooldownDurationHours: z.coerce.number().min(0).optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

export function AccountFormModal({ isOpen, onOpenChange, account }: AccountFormModalProps) {
  const isEditing = !!account;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      email: account?.email || "",
      password: "",
      notes: account?.notes || "",
      tags: account?.tags?.join(", ") || "",
      cooldownDurationHours: account?.cooldownDurationHours || 24,
    },
  });

  // Reset form when account changes
  useState(() => {
    if (account) {
      form.reset({
        email: account.email,
        password: "",
        notes: account.notes || "",
        tags: account.tags?.join(", ") || "",
        cooldownDurationHours: account.cooldownDurationHours || 24,
      });
    } else {
      form.reset({
        email: "",
        password: "",
        notes: "",
        tags: "",
        cooldownDurationHours: 24,
      });
    }
  });

  const onSubmit = (data: AccountFormValues) => {
    const tagsArray = data.tags
      ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    if (isEditing && account) {
      updateAccount.mutate(
        {
          id: account.id,
          data: {
            email: data.email,
            password: data.password || undefined,
            notes: data.notes,
            tags: tagsArray,
            cooldownDurationHours: data.cooldownDurationHours,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Account updated",
              description: "The account has been updated successfully.",
            });
            queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
            onOpenChange(false);
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Failed to update account.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createAccount.mutate(
        {
          data: {
            email: data.email,
            password: data.password || "",
            notes: data.notes,
            tags: tagsArray,
            cooldownDurationHours: data.cooldownDurationHours,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Account created",
              description: "The account has been created successfully.",
            });
            queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
            form.reset();
            onOpenChange(false);
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Failed to create account.",
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Account" : "Add Account"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the account details."
              : "Add a new development or test account."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Username</FormLabel>
                  <FormControl>
                    <Input placeholder="test@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? "New Password (Optional)" : "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  {isEditing && (
                    <FormDescription>
                      Leave blank to keep the existing password.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cooldownDurationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown (Hours)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="test, staging, e2e" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any context or details about this account..."
                      className="resize-none h-20"
                      {...field}
                    />
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
                disabled={createAccount.isPending || updateAccount.isPending}
              >
                {createAccount.isPending || updateAccount.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
