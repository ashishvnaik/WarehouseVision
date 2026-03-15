import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Camera,
  Package,
  BarChart3,
  Bell,
  Settings,
  Upload,
  FileText,
  GraduationCap,
  FlaskConical,
  Images,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth, type Role } from "@/contexts/AuthContext";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const OPERATOR_ITEMS: NavItem[] = [
  { title: "Upload", url: "/upload", icon: Upload },
  { title: "My Uploads", url: "/my-uploads", icon: Images },
];

const SUPERVISOR_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Alerts", url: "/alerts", icon: Bell },
];

const PROGRAMMER_ITEMS: NavItem[] = [
  { title: "AI Prompts", url: "/prompts", icon: FileText },
  { title: "Training Examples", url: "/training-examples", icon: GraduationCap },
  { title: "Evaluation", url: "/evaluation", icon: FlaskConical },
];

const SETTINGS_ITEMS: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
];

function getNavItems(role: Role | null): NavItem[] {
  if (role === "operator") return OPERATOR_ITEMS;
  if (role === "supervisor") return SUPERVISOR_ITEMS;
  if (role === "programmer") return PROGRAMMER_ITEMS;
  if (role === "superuser") return [
    ...SUPERVISOR_ITEMS,
    ...OPERATOR_ITEMS,
    ...PROGRAMMER_ITEMS,
  ];
  return [];
}

const ROLE_LABELS: Record<Role, string> = {
  operator: "Operator",
  supervisor: "Supervisor",
  programmer: "Programmer",
  superuser: "SuperUser",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { role, testingMode, setTestingMode, logout } = useAuth();

  const navItems = getNavItems(role);
  const showSettings = role === "superuser";
  const showTestingToggle = role === "programmer";

  return (
    <Sidebar data-testid="app-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary">
            <Camera className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-base">WarehouseVision</h2>
            {role && (
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showSettings && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {SETTINGS_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid="link-settings"
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showTestingToggle && (
          <SidebarGroup>
            <SidebarGroupLabel>Developer</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex items-center gap-3 px-2 py-2">
                <Switch
                  id="testing-mode-toggle"
                  checked={testingMode}
                  onCheckedChange={setTestingMode}
                  data-testid="switch-testing-mode"
                />
                <Label htmlFor="testing-mode-toggle" className="text-sm cursor-pointer">
                  Testing Mode
                </Label>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
