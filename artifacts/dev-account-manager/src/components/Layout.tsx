import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Archive, 
  Settings, 
  Upload, 
  Download,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex shrink-0">
        <div className="p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold font-mono text-xs">DA</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">Dev Accounts</span>
        </div>
        
        <Separator className="bg-border/50 opacity-50" />
        
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              className={`w-full justify-start ${location === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"}`}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/archived">
            <Button
              variant={location === "/archived" ? "secondary" : "ghost"}
              className={`w-full justify-start ${location === "/archived" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"}`}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archived
            </Button>
          </Link>
        </nav>
        
        <Separator className="bg-border/50 opacity-50" />
        
        <div className="p-3">
          <div className="text-xs font-medium text-sidebar-foreground/50 mb-2 px-2">Settings</div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <Settings className="mr-2 h-4 w-4" />
            Preferences
          </Button>
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
