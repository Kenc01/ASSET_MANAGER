import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Archive, 
  BarChart2,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/archived", icon: Archive, label: "Archived" },
  { href: "/stats", icon: BarChart2, label: "Statistics" },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-sidebar flex flex-col hidden md:flex shrink-0">
        <div className="p-4 flex items-center gap-2.5">
          <div className="h-8 w-8 border border-primary flex items-center justify-center">
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-bold text-primary tracking-widest uppercase">DevAccounts</div>
            <div className="text-[10px] text-muted-foreground tracking-wider">v1.0.0_stable</div>
          </div>
        </div>
        
        <Separator className="bg-border opacity-60" />

        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase px-2">{'>'} Navigation</span>
        </div>
        
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm font-mono rounded-none px-3 ${
                    active
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5 border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="mr-2 h-3.5 w-3.5" />
                  {active && <span className="mr-1 text-primary">{'>'}</span>}
                  {label}
                </Button>
              </Link>
            );
          })}
        </nav>
        
        <Separator className="bg-border opacity-60" />
        
        <div className="p-3">
          <div className="border border-border/50 bg-card/30 p-2 text-[10px] text-muted-foreground font-mono space-y-0.5">
            <div className="text-primary/70">$ system status</div>
            <div>{'>'} db: <span className="text-primary">connected</span></div>
            <div>{'>'} enc: <span className="text-primary">AES-256</span></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
