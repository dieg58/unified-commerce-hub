import { useState } from "react";
import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Loader2, Trash2, UserCog } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const UsersPage = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const roleLabels: Record<string, string> = {
    super_admin: t("users.superAdmin"),
    shop_manager: t("users.shopManager"),
    dept_manager: t("users.deptManager"),
    employee: t("users.employee"),
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-destructive/10 text-destructive border-destructive/20",
    shop_manager: "bg-primary/10 text-primary border-primary/20",
    dept_manager: "bg-warning/10 text-warning border-warning/20",
    employee: "bg-secondary text-secondary-foreground border-border",
  };

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, tenants(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("users.roleUpdated"));
      qc.invalidateQueries({ queryKey: ["all-roles"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getRoles = (userId: string) => allRoles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];

  const filtered = profiles?.filter((u) => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const roles = getRoles(u.id);
    const matchRole = roleFilter === "all" || roles.includes(roleFilter as any);
    return matchSearch && matchRole;
  });

  return (
    <>
      <TopBar title={t("users.title")} subtitle={t("users.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`${t("common.users")} (${filtered?.length || 0})`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder={t("users.filterByRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("users.allRoles")}</SelectItem>
                      <SelectItem value="super_admin">{t("users.superAdmin")}</SelectItem>
                      <SelectItem value="shop_manager">{t("users.shopManager")}</SelectItem>
                      <SelectItem value="dept_manager">{t("users.deptManager")}</SelectItem>
                      <SelectItem value="employee">{t("users.employee")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">{search || roleFilter !== "all" ? t("users.noUserFound") : t("users.noUser")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("common.user")}</TableHead>
                  <TableHead className="text-xs">{t("common.role")}</TableHead>
                  <TableHead className="text-xs">{t("nav.shop")}</TableHead>
                  <TableHead className="text-xs">{t("common.registeredOn")}</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user, i) => {
                  const roles = getRoles(user.id);
                  const tenant = (user as any).tenants as any;
                  const currentRole = roles[0] || "";
                  return (
                    <TableRow key={user.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                            {(user.full_name || user.email).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">{t("common.noRole")}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[role] || ""}`}>
                                {roleLabels[role] || role}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tenant?.name || t("common.platform")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => changeRole.mutate({ userId: user.id, newRole: "shop_manager" })} disabled={currentRole === "shop_manager"}>
                              <UserCog className="w-4 h-4 mr-2" /> → {t("users.shopManager")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeRole.mutate({ userId: user.id, newRole: "dept_manager" })} disabled={currentRole === "dept_manager"}>
                              <UserCog className="w-4 h-4 mr-2" /> → {t("users.deptManager")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeRole.mutate({ userId: user.id, newRole: "employee" })} disabled={currentRole === "employee"}>
                              <UserCog className="w-4 h-4 mr-2" /> → {t("users.employee")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
};

export default UsersPage;
