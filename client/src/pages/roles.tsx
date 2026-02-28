import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HasPermission } from "@/components/permissions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Plus, Pencil, Trash2, Shield, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ALL_PERMISSIONS, type Role } from "@shared/schema";

export default function RolesPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/roles");
      return res.json();
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsDialogOpen(false);
      toast({ title: language === "ar" ? "تم إنشاء الدور بنجاح" : "Role created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/roles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsDialogOpen(false);
      setEditingRole(null);
      toast({ title: language === "ar" ? "تم تحديث الدور بنجاح" : "Role updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: language === "ar" ? "تم حذف الدور بنجاح" : "Role deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا الدور؟" : "Are you sure you want to delete this role?")) {
      deleteRoleMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {language === "ar" ? "الأدوار والصلاحيات" : "Roles & Permissions"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة أدوار الموظفين وصلاحياتهم في النظام" : "Manage employee roles and system permissions"}
          </p>
        </div>
        <HasPermission permission="roles:create">
          <Button onClick={() => { setEditingRole(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {language === "ar" ? "إضافة دور جديد" : "Add New Role"}
          </Button>
        </HasPermission>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === "ar" ? "اسم الدور" : "Role Name"}</TableHead>
              <TableHead>{language === "ar" ? "الاسم بالعربية" : "Arabic Name"}</TableHead>
              <TableHead>{language === "ar" ? "الوصف" : "Description"}</TableHead>
              <TableHead className="w-[100px]">{language === "ar" ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles?.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {role.name}
                    {role.isSystem && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">System</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{role.nameAr}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <HasPermission permission="roles:edit">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </HasPermission>
                    {!role.isSystem && (
                      <HasPermission permission="roles:delete">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </HasPermission>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RoleDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        initialData={editingRole}
        onSubmit={(data) => {
          if (editingRole) {
            updateRoleMutation.mutate({ id: editingRole.id, data });
          } else {
            createRoleMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}

function RoleDialog({ 
  open, 
  onOpenChange, 
  initialData, 
  onSubmit 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  initialData: Role | null;
  onSubmit: (data: any) => void;
}) {
  const { language } = useLanguage();
  const normalizePermissions = (input: any): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return Array.from(new Set(input.filter((p) => typeof p === "string")));
    }
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        return normalizePermissions(parsed);
      } catch {
        return [];
      }
    }
    if (typeof input === "object") {
      const out: string[] = [];
      for (const [resource, actions] of Object.entries(input)) {
        if (Array.isArray(actions)) {
          for (const a of actions) {
            if (typeof a === "string") out.push(`${resource}:${a}`);
          }
        }
      }
      return Array.from(new Set(out));
    }
    return [];
  };
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    description: "",
    permissions: [] as string[],
  });

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          nameAr: initialData.nameAr,
          description: initialData.description || "",
          permissions: normalizePermissions(initialData.permissions),
        });
      } else {
        setFormData({
          name: "",
          nameAr: "",
          description: "",
          permissions: [],
        });
      }
    }
  }, [open, initialData]);

  const togglePermission = (resource: string, action: string) => {
    const permission = `${resource}:${action}`;
    setFormData(prev => {
      const current = Array.isArray(prev.permissions) ? prev.permissions : normalizePermissions(prev.permissions as any);
      const exists = current.includes(permission);
      if (exists) {
        return { ...prev, permissions: current.filter(p => p !== permission) };
      } else {
        return { ...prev, permissions: [...current, permission] };
      }
    });
  };

  const toggleAllResource = (resource: string, actions: readonly string[]) => {
    const current = Array.isArray(formData.permissions) ? formData.permissions : normalizePermissions(formData.permissions as any);
    const allSelected = actions.every(action => current.includes(`${resource}:${action}`));
    
    setFormData(prev => {
      const base = Array.isArray(prev.permissions) ? prev.permissions : normalizePermissions(prev.permissions as any);
      let newPermissions = [...base];
      if (allSelected) {
        // Remove all
        newPermissions = newPermissions.filter(p => !p.startsWith(`${resource}:`));
      } else {
        // Add all missing
        actions.forEach(action => {
          const p = `${resource}:${action}`;
          if (!newPermissions.includes(p)) {
            newPermissions.push(p);
          }
        });
      }
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData 
              ? (language === "ar" ? "تعديل الدور" : "Edit Role") 
              : (language === "ar" ? "إنشاء دور جديد" : "Create New Role")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الدور (إنجليزي)" : "Role Name (English)"}</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                disabled={initialData?.isSystem && initialData.name === 'admin'} // Admin name cannot be changed
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الدور (عربي)" : "Role Name (Arabic)"}</Label>
              <Input 
                value={formData.nameAr} 
                onChange={e => setFormData({...formData, nameAr: e.target.value})}
                required 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
              <Input 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium border-b pb-2">
              {language === "ar" ? "صلاحيات النظام" : "System Permissions"}
            </h3>
            
            <div className="space-y-6">
              {Object.entries(ALL_PERMISSIONS).map(([resource, actions]) => (
                <div key={resource} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold capitalize text-lg">{resource.replace('_', ' ')}</h4>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleAllResource(resource, actions)}
                    >
                      {language === "ar" ? "تحديد الكل" : "Select All"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* @ts-ignore */}
                    {actions.map(action => {
                      const permission = `${resource}:${action}`;
                      const isChecked = formData.permissions.includes(permission);
                      return (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox 
                            id={permission} 
                            checked={isChecked}
                            onCheckedChange={() => togglePermission(resource, action)}
                          />
                          <Label htmlFor={permission} className="capitalize cursor-pointer">
                            {action.replace('_', ' ')}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit">
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
