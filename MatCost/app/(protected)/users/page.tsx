"use client";

import { useEffect, useState, useMemo } from "react";
import { UserDto, userApi } from "@/services/user-service";
import { useToast } from "@/hooks/use-toast";
import { Search, RotateCcw, Loader2 } from "lucide-react";

// UI Components
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
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function UsersPage() {
  // 1. Chứa TẤT CẢ dữ liệu lấy từ API (Max 100 user)
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 2. States cho Filter & Search (Client side)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  
  // 3. Pagination State (Trang hiện tại của bảng)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Số dòng mỗi trang hiển thị

  // State loading cho action button từng dòng
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const { toast } = useToast();

  // --- HÀM 1: Fetch dữ liệu gốc ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // MẸO: Gọi pageSize = 100 để lấy tối đa dữ liệu backend cho phép
      // Vì backend không hỗ trợ search, ta phải lấy về hết rồi tự search
      const response = await userApi.getAll(1, 100);
      setAllUsers(response.users || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: "Could not load user list.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- HÀM 2: Logic Lọc & Tìm kiếm (Client Side) ---
  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      // 1. Lọc theo Search Term (Tên hoặc Email)
      const matchesSearch = 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Lọc theo Status
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = user.status === true;
      if (statusFilter === "inactive") matchesStatus = user.status === false;

      return matchesSearch && matchesStatus;
    });
  }, [allUsers, searchTerm, statusFilter]);

  // --- HÀM 3: Logic Phân trang (Client Side) ---
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset về trang 1 khi search thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);


  // --- HÀM 4: Xử lý Active/Deactive ---
  const handleToggleStatus = async (user: UserDto) => {
    try {
      setActionLoadingId(user.id);
      const newStatus = !user.status;
      
      await userApi.updateStatus(user.id, newStatus);
      
      toast({
        title: "Success",
        description: `User ${user.fullName} has been ${newStatus ? 'activated' : 'deactivated'}.`,
        className: "bg-green-50 text-green-800 border-green-200",
      });
      
      // Cập nhật lại state cục bộ ngay lập tức để UI mượt mà
      setAllUsers((prev) => 
        prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u)
      );

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not update user status.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500">Manage system users (Showing max 100 recent users)</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            {/* Filter Area */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Input Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search by name, email..."
                  className="pl-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Select Status */}
              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => fetchUsers()} 
              className="bg-white"
              title="Reload data"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-700">{user.id}</TableCell>
                      <TableCell>
                        <span className="text-slate-600">{user.email}</span>
                      </TableCell>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`font-normal border ${
                            user.status 
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${user.status ? "bg-green-600" : "bg-red-600"}`}></span>
                          {user.status ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoadingId === user.id}
                          onClick={() => handleToggleStatus(user)}
                          className={`text-xs h-8 px-2 ${
                             user.status 
                              ? "text-slate-500 hover:text-red-600 hover:bg-red-50" 
                              : "text-slate-500 hover:text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {actionLoadingId === user.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          {actionLoadingId === user.id 
                            ? "Updating..." 
                            : user.status 
                              ? "[Deactivate]" 
                              : "[Activate]"
                          }
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Client-side Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 pl-2">
              Page {currentPage} of {totalPages || 1} ({filteredUsers.length} filtered items)
            </p>
            <Pagination className="w-auto mx-0 justify-end">
              <PaginationContent>
                <PaginationItem>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-8 gap-1"
                  >
                    Previous
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-8 gap-1"
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}