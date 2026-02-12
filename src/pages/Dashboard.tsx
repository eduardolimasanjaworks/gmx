import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicDriverRegistry } from "@/components/dashboard/DynamicDriverRegistry";
import { AvailableDrivers } from "@/components/dashboard/AvailableDrivers";
import { ShipmentBoard } from "@/components/dashboard/ShipmentBoard";
import { ShipmentHistory } from "@/components/dashboard/ShipmentHistory";
import { StatsDashboard } from "@/components/dashboard/StatsDashboard";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { ShipmentFollow } from "@/components/dashboard/ShipmentFollow";
import { OperatorPerformance } from "@/components/dashboard/OperatorPerformance";
import { EnhancedVehicleTimeline } from "@/components/dashboard/EnhancedVehicleTimeline";
import { LogisticsSaturationMap } from "@/components/dashboard/LogisticsSaturationMap";
import { DailyVehicleProposals } from "@/components/dashboard/DailyVehicleProposals";
import { CriticalPendencies } from "@/components/dashboard/CriticalPendencies";
import { GlobalMatchingPanel } from "@/components/dashboard/GlobalMatchingPanel";
import { useOperatorHeartbeat } from "@/hooks/useOperatorHeartbeat";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  Users,
  UserCheck,
  Package,
  History,
  BarChart3,
  Settings,
  ClipboardList,
  Activity,
  Book,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  useOperatorHeartbeat();

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Determine permissions based on the ENRICHED user object (from AuthContext)
  // This avoids complex matching logic here.
  const userPermissions = useMemo(() => {
    return user?.app_role?.permissions || [];
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;

    // 1. Check specific admin email
    if (user.email === 'admin@gmx.com') return true;

    // 2. Check App Role Name
    const appRoleName = user.app_role?.name?.toLowerCase() || '';
    if (appRoleName.includes('admin') || appRoleName.includes('administrator')) return true;

    return false;
  }, [user]);

  const hasPermission = (perm: string) => {
    if (!user) return false;
    if (isAdmin) return true;
    return userPermissions.includes(perm);
  };

  const allTabs = [
    { id: 'registry', label: 'Cadastros', icon: Users, perm: 'cadastros' },
    { id: 'available', label: 'Disponíveis', icon: UserCheck, perm: 'disponiveis' },
    { id: 'shipments', label: 'Embarques', icon: Package, perm: 'embarques' },
    { id: 'history', label: 'Histórico', icon: History, perm: 'historico' },
    { id: 'operators', label: 'Operadores', icon: Activity, perm: 'usuarios' },
    { id: 'users', label: 'Usuários', icon: Settings, perm: 'usuarios' },
    { id: 'stats', label: 'Dashboard', icon: BarChart3, perm: 'dashboard' },
    { id: 'follow', label: 'Follow', icon: ClipboardList, perm: 'embarques' },
  ];

  const availableTabs = allTabs.filter(tab => hasPermission(tab.perm));

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || 'unauthorized');

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4"></div>
        <p className="text-muted-foreground">Carregando sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg text-primary-foreground">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">GMX</h1>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gestão Inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="/swagger-ui.html" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors border px-3 py-1.5 rounded-md hover:bg-muted">
              <Book className="h-3.5 w-3.5" />
              Docs
            </a>

            {/* Removido botão/diálogo "Logs de Sistema" (DebugLogViewer) */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted border">
                    <UserIcon className="h-4 w-4 text-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.first_name} {user.last_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <span className="text-xs text-muted-foreground">
                    Cargo: {user.app_role?.name || (isAdmin ? 'Administrador do Sistema' : 'Sem Cargo')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair do Sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {availableTabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
            <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
              <Settings className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Acesso Limitado</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Seu usuário não possui permissões configuradas no sistema de cargos do GMX.
            </p>
            <Button variant="outline" className="mt-6" onClick={handleLogout}>
              Sair e tentar outra conta
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="bg-muted/30 border rounded-xl p-1 shadow-inner overflow-x-auto">
              <TabsList className="flex w-full justify-start lg:justify-between gap-1 bg-transparent h-auto p-0">
                <div className="flex gap-1">
                  {availableTabs.filter(tab => tab.id !== 'stats' && tab.id !== 'follow').map(tab => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex-1 min-w-[90px] flex-col sm:flex-row gap-1 sm:gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200"
                    >
                      <tab.icon className="h-4 w-4 sm:h-4 sm:w-4" />
                      <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </div>
                <div className="flex gap-1">
                  {availableTabs.filter(tab => tab.id === 'stats' || tab.id === 'follow').map(tab => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex-1 min-w-[90px] flex-col sm:flex-row gap-1 sm:gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 opacity-50"
                    >
                      <tab.icon className="h-4 w-4 sm:h-4 sm:w-4" />
                      <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </div>
              </TabsList>
            </div>

            <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              {activeTab === 'stats' && hasPermission('dashboard') && (
                <TabsContent value="stats" className="space-y-6 mt-0">
                  <CriticalPendencies />
                  <GlobalMatchingPanel />
                  <StatsDashboard />
                  <EnhancedVehicleTimeline />
                  <LogisticsSaturationMap />
                  <DailyVehicleProposals />
                </TabsContent>
              )}

              {activeTab === 'registry' && hasPermission('cadastros') && (
                <TabsContent value="registry" className="space-y-6 mt-0">
                  <DynamicDriverRegistry />
                </TabsContent>
              )}

              {activeTab === 'available' && hasPermission('disponiveis') && (
                <TabsContent value="available" className="space-y-6 mt-0">
                  <AvailableDrivers />
                </TabsContent>
              )}

              {activeTab === 'shipments' && hasPermission('embarques') && (
                <TabsContent value="shipments" className="space-y-6 mt-0">
                  <ShipmentBoard />
                </TabsContent>
              )}

              {activeTab === 'history' && hasPermission('historico') && (
                <TabsContent value="history" className="space-y-6 mt-0">
                  <ShipmentHistory />
                </TabsContent>
              )}

              {activeTab === 'follow' && hasPermission('embarques') && (
                <TabsContent value="follow" className="space-y-6 mt-0">
                  <ShipmentFollow />
                </TabsContent>
              )}

              {activeTab === 'operators' && hasPermission('usuarios') && (
                <TabsContent value="operators" className="space-y-6 mt-0">
                  <OperatorPerformance />
                </TabsContent>
              )}

              {activeTab === 'users' && hasPermission('usuarios') && (
                <TabsContent value="users" className="space-y-6 mt-0">
                  <UserManagement />
                </TabsContent>
              )}
            </div>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
