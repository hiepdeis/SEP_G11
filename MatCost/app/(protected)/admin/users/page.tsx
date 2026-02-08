"use client";

import { useEffect, useState, useMemo } from "react";
import { UserDto, userApi } from "@/services/user-service";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  RotateCcw, 
  Loader2, 
  ArrowUpDown, 
  Ban, 
  CheckCircle, 
  MoreHorizontal 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortConfig = {
  key: keyof UserDto;
  direction: "asc" | "desc";
} | null;

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;

  // Sorting State 
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "id", direction: "asc" });

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAll(1, 100);
      
      const data = response.data || response;
      setAllUsers(data.users || []);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- Xử lý Sort ---
  const handleSort = (key: keyof UserDto) => {
    setSortConfig((current) => {
      if (current?.key === key && current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return { key, direction: "asc" };
    });
  };

  // --- Filter + Sort + Pagination ---
  const processedUsers = useMemo(() => {
    let result = allUsers.filter((user) => {
      const matchesSearch = 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = user.status === true;
      if (statusFilter === "inactive") matchesStatus = user.status === false;

      return matchesSearch && matchesStatus;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        const comparison = aValue > bValue ? 1 : -1;
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [allUsers, searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.ceil(processedUsers.length / itemsPerPage);
  const paginatedUsers = processedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Đồng bộ input khi currentPage thay đổi
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // --- Xử lý Input chuyển trang ---
  const handlePageInputSubmit = () => {
    const pageNumber = parseInt(pageInput);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    } else {
      // Nếu nhập sai thì reset về trang hiện tại
      setPageInput(currentPage.toString());
      toast({
        title: "Invalid Page",
        description: `Please enter a number between 1 and ${totalPages}`,
        variant: "destructive"
      });
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    }
  };

  // --- Action Update Status ---
  const handleToggleStatus = async (user: UserDto) => {
    try {
      setActionLoadingId(user.id);
      const newStatus = !user.status;
      await userApi.updateStatus(user.id, newStatus);
      
      toast({
        title: newStatus ? "User Activated" : "User Deactivated",
        description: `${user.fullName} is now ${newStatus ? 'active' : 'inactive'}.`,
        className: newStatus ? "bg-green-50 text-green-900 border-green-200" : "bg-slate-900 text-white",
      });
      
      setAllUsers((prev) => 
        prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u)
      );
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Update failed." });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500">System administration & access control</p>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <motion.div 
                className="relative w-full sm:w-72"
                initial={false}
                whileFocus={{ scale: 1.02 }}
              >
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search users..."
                  className="pl-9 bg-white transition-all duration-200 focus:ring-2 focus:ring-indigo-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </motion.div>
              
              {/* Filter */}
              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="w-[140px] bg-white transition-all hover:border-indigo-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Refresh */}
            <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.3 }}>
              <Button variant="outline" size="icon" onClick={fetchUsers} className="bg-white hover:bg-slate-50 hover:text-black">
                <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                  <SortableHeader label="ID" sortKey="id" currentSort={sortConfig} onSort={handleSort} width="w-[80px]" />
                  <SortableHeader label="Email" sortKey="email" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Full Name" sortKey="fullName" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} width="w-[120px]" />
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                          <span>Syncing data...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <TableCell className="font-medium text-slate-700 pl-4">{user.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-slate-700 font-medium">{user.email}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{user.roleName || "User"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`font-medium border-0 px-2 py-1 ${
                              user.status 
                                ? "bg-green-50 text-green-700 ring-1 ring-green-600/20" 
                                : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                            }`}
                          >
                            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${user.status ? "bg-green-600" : "bg-red-600"}`}></span>
                            {user.status ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end">

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={actionLoadingId === user.id}
                              onClick={() => handleToggleStatus(user)}
                              className={`ml-2 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-sm border ${
                                user.status
                                  ? "bg-white text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                                  : "bg-slate-900 text-white border-transparent hover:bg-slate-800 hover:shadow-md"
                              } ${actionLoadingId === user.id ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                              {actionLoadingId === user.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : user.status ? (
                                <>
                                  <Ban className="mr-1.5 h-3.5 w-3.5" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Activate
                                </>
                              )}
                            </motion.button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Footer Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Page {currentPage} of {totalPages || 1} • {processedUsers.length} results
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="h-8 bg-white hover:bg-slate-50 hover:text-black"
              >
                Previous
              </Button>

              {/* Input chuyển trang */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">Page</span>
                <Input 
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={handlePageInputSubmit}
                  onKeyDown={handlePageInputKeyDown}
                  className="h-8 w-12 text-center px-1 text-xs"
                />
                <span className="text-xs text-slate-400">of {totalPages || 1}</span>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="h-8 bg-white hover:bg-slate-50 hover:text-black"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  onSort, 
  width 
}: { 
  label: string, 
  sortKey: keyof UserDto, 
  currentSort: SortConfig, 
  onSort: (key: keyof UserDto) => void,
  width?: string
}) {
  const isSorted = currentSort?.key === sortKey;
  
  return (
    <TableHead className={width}>
      <button 
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 transition-colors font-semibold hover:text-indigo-600 cursor-pointer ${isSorted ? "text-indigo-600" : ""}`}
      >
        {label}
        {isSorted ? (
          <ArrowUpDown className={`h-3 w-3 transition-transform ${currentSort.direction === 'desc' ? 'rotate-180' : ''}`} />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </TableHead>
  )
}