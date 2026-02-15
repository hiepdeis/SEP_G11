"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Edit3,
  History,
  User,
  Bell,
  Loader2,
  Tag,
  Package,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  materialApi,
  MaterialDto,
  CreateMaterialDto,
} from "@/services/material-service";
import { Header } from "@/components/ui/custom/header";

export default function ManagerMaterialManagement() {
  const [activeTab, setActiveTab] = useState<"materials" | "categories">(
    "materials",
  );
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "missing_price" | "has_min_stock"
  >("all");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newMaterial, setNewMaterial] = useState<CreateMaterialDto>({
    code: "",
    name: "",
    unit: "",
    massPerUnit: 0,
    minStockLevel: 0,
  });

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialDto | null>(
    null,
  );

  // 1. Fetch Data
  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const res = await materialApi.getAll();
      setMaterials(res.data);
    } catch (error) {
      console.error("Failed to fetch materials", error);
      toast.error("Failed to load materials");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // 2. Combined Filter Logic (Search + Filter Type)
  const filteredMaterials = materials.filter((m) => {
    // Text Search
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase());

    // Type Filter
    let matchesType = true;
    if (filterType === "missing_price") {
      matchesType = !m.unitPrice || m.unitPrice === 0;
    } else if (filterType === "has_min_stock") {
      matchesType = (m.minStockLevel || 0) > 0;
    }

    return matchesSearch && matchesType;
  });

  // 3. Create Handler
  const handleCreate = async () => {
    if (!newMaterial.code || !newMaterial.name) {
      toast.error("Code and Name are required");
      return;
    }

    setIsCreating(true);
    try {
      await materialApi.create(newMaterial);
      toast.success("Material created successfully");
      setIsCreateOpen(false);
      setNewMaterial({
        code: "",
        name: "",
        unit: "",
        massPerUnit: 0,
        minStockLevel: 0,
      });
      fetchMaterials();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create material");
    } finally {
      setIsCreating(false);
    }
  };

  // 4. Edit Handlers
  const openEditDialog = (material: MaterialDto) => {
    setEditingMaterial({ ...material }); // Clone object to avoid direct mutation
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingMaterial || !editingMaterial.code || !editingMaterial.name) {
      toast.error("Code and Name are required");
      return;
    }

    setIsUpdating(true);
    try {
      // Backend requires ID in URL and Body to match
      await materialApi.update(editingMaterial.materialId, editingMaterial);
      toast.success("Material updated successfully");
      setIsEditOpen(false);
      setEditingMaterial(null);
      fetchMaterials();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update material");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        {/* Header Section */}
        <Header title="" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Page Title & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Material Management
              </h1>
              <p className="text-sm text-slate-500">
                Manage definitions, units, and inventory tracking.
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("materials")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "materials"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Materials List
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "categories"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Categories
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search by name, code..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {/* Working Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`gap-2 ${filterType !== "all" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""}`}
                      >
                        <Filter className="w-4 h-4" />
                        {filterType === "all"
                          ? "Filter"
                          : filterType === "missing_price"
                            ? "No Price"
                            : "Has Min Stock"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={filterType === "all"}
                        onCheckedChange={() => setFilterType("all")}
                      >
                        All Materials
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterType === "missing_price"}
                        onCheckedChange={() => setFilterType("missing_price")}
                      >
                        Missing Price
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterType === "has_min_stock"}
                        onCheckedChange={() => setFilterType("has_min_stock")}
                      >
                        Has Min Stock Level
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Create New Material Dialog */}
                  <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                        <Plus className="w-4 h-4" /> Add New
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Create New Material</DialogTitle>
                        <DialogDescription>
                          Add a new material definition to the master data.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="create-code" className="text-right">
                            Code *
                          </Label>
                          <Input
                            id="create-code"
                            className="col-span-3"
                            placeholder="e.g. ST-001"
                            value={newMaterial.code}
                            onChange={(e) =>
                              setNewMaterial({
                                ...newMaterial,
                                code: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="create-name" className="text-right">
                            Name *
                          </Label>
                          <Input
                            id="create-name"
                            className="col-span-3"
                            placeholder="e.g. Steel Beam I-200"
                            value={newMaterial.name}
                            onChange={(e) =>
                              setNewMaterial({
                                ...newMaterial,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="create-unit" className="text-right">
                            Unit
                          </Label>
                          <Input
                            id="create-unit"
                            className="col-span-3"
                            placeholder="e.g. kg, pcs, m3"
                            value={newMaterial.unit || ""}
                            onChange={(e) =>
                              setNewMaterial({
                                ...newMaterial,
                                unit: e.target.value,
                              })
                            }
                            maxLength={10}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="create-mass" className="text-right">
                            Mass/Unit
                          </Label>
                          <Input
                            id="create-mass"
                            type="number"
                            className="col-span-3"
                            placeholder="0.00"
                            value={newMaterial.massPerUnit || ""}
                            onChange={(e) => {
                              if (
                                e.target.value.length <= 8 &&
                                Number(e.target.value) >= 0
                              ) {
                                setNewMaterial({
                                  ...newMaterial,
                                  massPerUnit: Number(e.target.value),
                                });
                              }
                            }}
                            min={0}
                            maxLength={8}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="create-minStock"
                            className="text-right"
                          >
                            Min Stock
                          </Label>
                          <Input
                            id="create-minStock"
                            type="number"
                            className="col-span-3"
                            placeholder="0"
                            value={newMaterial.minStockLevel || ""}
                            onChange={(e) => {
                              if (
                                e.target.value.length <= 8 &&
                                Number(e.target.value) >= 0
                              ) {
                                setNewMaterial({
                                  ...newMaterial,
                                  minStockLevel: Number(e.target.value),
                                });
                              }
                            }}
                            maxLength={8}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreate}
                          disabled={isCreating}
                          className="bg-indigo-600"
                        >
                          {isCreating && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Material
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Material Dialog (Hidden but triggered by state) */}
                  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Edit Material</DialogTitle>
                        <DialogDescription>
                          Update material details.
                        </DialogDescription>
                      </DialogHeader>
                      {editingMaterial && (
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-code" className="text-right">
                              Code
                            </Label>
                            <Input
                              id="edit-code"
                              className="col-span-3"
                              value={editingMaterial.code}
                              onChange={(e) =>
                                setEditingMaterial({
                                  ...editingMaterial,
                                  code: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">
                              Name
                            </Label>
                            <Input
                              id="edit-name"
                              className="col-span-3"
                              value={editingMaterial.name}
                              onChange={(e) =>
                                setEditingMaterial({
                                  ...editingMaterial,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-unit" className="text-right">
                              Unit
                            </Label>
                            <Input
                              id="edit-unit"
                              className="col-span-3"
                              value={editingMaterial.unit || ""}
                              onChange={(e) =>
                                setEditingMaterial({
                                  ...editingMaterial,
                                  unit: e.target.value,
                                })
                              }
                              maxLength={10}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-mass" className="text-right">
                              Mass/Unit
                            </Label>
                            <Input
                              id="edit-mass"
                              type="number"
                              className="col-span-3"
                              placeholder="0.00"
                              value={editingMaterial.massPerUnit || ""}
                              onChange={(e) => {
                                if (
                                  e.target.value.length <= 8 &&
                                  Number(e.target.value) >= 0
                                ) {
                                  setEditingMaterial({
                                    ...editingMaterial,
                                    massPerUnit: Number(e.target.value),
                                  });
                                }
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-price" className="text-right">
                              Base Price
                            </Label>
                            <Input
                              id="edit-price"
                              type="number"
                              className="col-span-3"
                              value={editingMaterial.unitPrice || ""}
                              onChange={(e) => {
                                if (
                                  e.target.value.length <= 8 &&
                                  Number(e.target.value) >= 0
                                ) {
                                  setEditingMaterial({
                                    ...editingMaterial,
                                    unitPrice: Number(e.target.value),
                                  });
                                }
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label
                              htmlFor="edit-minStock"
                              className="text-right"
                            >
                              Min Stock
                            </Label>
                            <Input
                              id="edit-minStock"
                              type="number"
                              className="col-span-3"
                              value={editingMaterial.minStockLevel || ""}
                              onChange={(e) => {
                                if (
                                  e.target.value.length <= 8 &&
                                  Number(e.target.value) >= 0
                                ) {
                                  setEditingMaterial({
                                    ...editingMaterial,
                                    minStockLevel: Number(e.target.value),
                                  });
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUpdate}
                          disabled={isUpdating}
                          className="bg-indigo-600"
                        >
                          {isUpdating && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {activeTab === "materials" ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="pl-6">Code & Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Mass / Unit</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading
                            data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-slate-500"
                        >
                          No materials found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMaterials.map((item, idx) => (
                        <motion.tr
                          key={item.materialId}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 rounded">
                                  {item.code}
                                </span>
                                {item.categoryId && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1 py-0 border-slate-200 text-slate-500"
                                  >
                                    Cat: {item.categoryId}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-700 font-medium">
                                {item.unit || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.massPerUnit ? `${item.massPerUnit} kg` : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-900">
                              {formatCurrency(item.unitPrice)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                item.minStockLevel && item.minStockLevel > 0
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.minStockLevel || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit3 className="w-4 h-4" /> Edit Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-16 text-center text-slate-500">
                  <Tag className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="text-lg font-medium text-slate-900">
                    Category Management
                  </h3>
                  <p className="mt-1">
                    Manage material categories and grouping.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Manage Categories
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
