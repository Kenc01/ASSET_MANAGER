import { useState, useRef } from "react";
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  LayoutGrid,
  Filter
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { 
  useListAccounts, 
  useGetAccountStats,
  useExportAccounts,
  useImportAccounts,
  getListAccountsQueryKey,
  getGetAccountStatsQueryKey
} from "@workspace/api-client-react";
import type { Account, ListAccountsStatus, ListAccountsSort } from "@workspace/api-client-react/src/generated/api.schemas";

import { AccountCard } from "@/components/AccountCard";
import { AccountFormModal } from "@/components/AccountFormModal";
import { StartCooldownModal } from "@/components/StartCooldownModal";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ListAccountsStatus | "all">("all");
  const [sort, setSort] = useState<ListAccountsSort>("ready-first");
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCooldownOpen, setIsCooldownOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Search debounce
  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Queries
  const { data: stats, isLoading: statsLoading } = useGetAccountStats({
    query: { queryKey: getGetAccountStatsQueryKey() }
  });

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== "all" ? { status: status as ListAccountsStatus } : {}),
    sort,
  };

  const { data: accounts, isLoading: accountsLoading } = useListAccounts(
    queryParams,
    { query: { queryKey: getListAccountsQueryKey(queryParams) } }
  );

  // Filter out archived from main dashboard unless specifically requested
  const visibleAccounts = accounts?.filter(a => status === "archived" || a.status !== "archived") || [];

  // Mutations
  const exportAccounts = useExportAccounts({
    query: { enabled: false, queryKey: ["exportAccounts"] } // Manual trigger
  });
  
  const importAccounts = useImportAccounts();

  // Handlers
  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleStartCooldown = (account: Account) => {
    setSelectedAccount(account);
    setIsCooldownOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const handleExport = async () => {
    try {
      const { data } = await exportAccounts.refetch();
      if (!data) return;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dev-accounts-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Export successful" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importAccounts.mutate(
          { data: { accounts: Array.isArray(json) ? json : json.accounts || [] } },
          {
            onSuccess: (result) => {
              toast({ 
                title: "Import complete", 
                description: `Imported ${result.imported} accounts. Skipped ${result.skipped}.` 
              });
              queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetAccountStatsQueryKey() });
            },
            onError: () => {
              toast({ title: "Import failed", variant: "destructive" });
            }
          }
        );
      } catch (error) {
        toast({ title: "Invalid JSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your development and test accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exportAccounts.isFetching}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total" value={stats?.total} loading={statsLoading} />
        <StatCard title="Available" value={stats?.available} loading={statsLoading} highlight="text-emerald-500" />
        <StatCard title="In Use" value={stats?.inUse} loading={statsLoading} highlight="text-blue-500" />
        <StatCard title="Cooling Down" value={stats?.coolingDown} loading={statsLoading} highlight="text-orange-500" />
        <StatCard title="Ready Soon" value={stats?.readySoon} loading={statsLoading} />
      </div>

      {/* Filters and List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by email or tags..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50 focus-visible:ring-primary/20"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-full sm:w-[140px] bg-card border-border/50">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in-use">In Use</SelectItem>
                <SelectItem value="cooling-down">Cooling Down</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-full sm:w-[160px] bg-card border-border/50">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ready-first">Ready First</SelectItem>
                <SelectItem value="recently-used">Recently Used</SelectItem>
                <SelectItem value="cooldown-ending-soon">Ending Soon</SelectItem>
                <SelectItem value="created-newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {accountsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl bg-card border border-border/50" />
            ))}
          </div>
        ) : visibleAccounts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/20">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No accounts found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {search || status !== "all" 
                ? "Try adjusting your filters or search query." 
                : "Get started by adding your first development account."}
            </p>
            {!(search || status !== "all") && (
              <Button className="mt-4" onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" /> Add Account
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleAccounts.map(account => (
              <AccountCard 
                key={account.id} 
                account={account} 
                onEdit={handleEdit}
                onStartCooldown={handleStartCooldown}
              />
            ))}
          </div>
        )}
      </div>

      <AccountFormModal 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        account={selectedAccount} 
      />
      
      <StartCooldownModal
        isOpen={isCooldownOpen}
        onOpenChange={setIsCooldownOpen}
        account={selectedAccount}
      />
    </div>
  );
}

function StatCard({ title, value, loading, highlight = "" }: { title: string; value?: number; loading: boolean; highlight?: string }) {
  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardContent className="p-4 flex flex-col justify-center">
        <p className="text-xs font-medium text-muted-foreground tracking-tight">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-12 mt-1" />
        ) : (
          <div className={`text-2xl font-bold mt-0.5 tracking-tight ${highlight}`}>{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
