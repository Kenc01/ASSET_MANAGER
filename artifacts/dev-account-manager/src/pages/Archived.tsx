import { useState, useEffect } from "react";
import { Search, ArchiveRestore, LayoutGrid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { 
  useListAccounts, 
  getListAccountsQueryKey 
} from "@workspace/api-client-react";
import type { Account } from "@workspace/api-client-react";

import { AccountCard } from "@/components/AccountCard";
import { AccountFormModal } from "@/components/AccountFormModal";

export default function Archived() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    search: debouncedSearch || undefined,
    status: "archived" as const,
  };

  const { data: accounts, isLoading } = useListAccounts(
    queryParams,
    { query: { queryKey: getListAccountsQueryKey(queryParams) } }
  );

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArchiveRestore className="h-7 w-7 text-muted-foreground" />
          Archive
        </h1>
        <p className="text-muted-foreground mt-1">Accounts that are no longer in active use.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search archived accounts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl bg-card border border-border/50" />
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/20">
          <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No archived accounts</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            When you archive an account, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70 hover:opacity-100 transition-opacity">
          {accounts.map(account => (
            <AccountCard 
              key={account.id} 
              account={account} 
              onEdit={handleEdit}
              onStartCooldown={() => {}} // Not used in archive
            />
          ))}
        </div>
      )}

      <AccountFormModal 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        account={selectedAccount} 
      />
    </div>
  );
}
