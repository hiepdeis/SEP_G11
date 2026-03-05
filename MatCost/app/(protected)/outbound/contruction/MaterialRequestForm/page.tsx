"use client";
import React, { useEffect, useState } from "react";
import { projectApi, ProjectDto } from "@/services/project-services";
import { materialApi, MaterialDto } from "@/services/materials-service";
import { Sidebar } from "@/components/sidebar";
// ...existing imports...
import { issueSlipApi, IssueSlipDetailDto } from "@/services/issueslip-service";

type RequestItem = {
  id: number;
  materialId: number | "";
  quantity: number;
  unit: string;
};

const MaterialRequestForm: React.FC = () => {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // ...trong component...
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState("");
  const [items, setItems] = useState<RequestItem[]>([
    { id: Date.now(), materialId: "", quantity: 1, unit: "" },
  ]);

    // ✅ Load projects khi mount
    useEffect(() => {
        const fetchProjects = async () => {
        try {
            const data = await projectApi.getProjects();
            console.log("Loaded projects:", data);
            setProjects(data);
        } catch (error) {
            console.error("Lỗi load projects:", error);
        } finally {
            setLoadingProjects(false);
        }
        };

        fetchProjects();

        const fetchMaterials = async () => {
          try {
              const data = await materialApi.getMaterials();
              console.log("Loaded materials:", data);
              setMaterials(data);
          } catch (error) {
              console.error("Lỗi load materials:", error);
          } finally {
              setLoadingMaterials(false);
          }
        };

        fetchMaterials();
    }, []);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), materialId: "", quantity: 1, unit: "" },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length === 1) {
      alert("Phải có ít nhất một mặt hàng.");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleMaterialChange = (id: number, materialId: number | "") => {
    const material = materials.find((m) => m.materialId === Number(materialId));
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              materialId,
              unit: material ? material.unit : "",
            }
          : item
      )
    );
  };

  const handleQuantityChange = (id: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(
      (item) => item.materialId && item.quantity > 0
    );

    if (!projectId) {
      alert("Vui lòng chọn Dự án.");
      return;
    }

    if (validItems.length === 0) {
      alert("Danh sách vật tư không hợp lệ.");
      return;
    }

    setShowConfirm(true); 
  };
  
    const handleConfirmSubmit = async () => {
      setSubmitting(true);
      try {
          // Bước 1: Tạo IssueSlip
          const issueSlipPayload = {
            projectId: Number(projectId),
            issueCode: `YC-${Date.now()}`, // hoặc sinh mã khác
            userId: 1, // TODO: lấy userId thực tế nếu có
            description,
          };
        const issueSlip = await issueSlipApi.createIssueSlip(issueSlipPayload);
        console.log("Created IssueSlip:", issueSlip);

        // Ví dụ: IssueSlipId là projectId (bạn chỉnh lại nếu cần)
        const issueSlipId = issueSlip.issueId ; // tuỳ backend trả về
        const details: IssueSlipDetailDto[] = items.map((item) => ({
          materialId: Number(item.materialId),
          quantity: item.quantity,
          unitPrice: 0,
        }));

        const result = await issueSlipApi.createIssueSlipDetails(issueSlipId, details);
        console.log("Created IssueSlipDetails:", result);
        alert("Tạo yêu cầu thành công!");
        setShowConfirm(false);
      } catch (error) {
        alert("Có lỗi khi gửi yêu cầu!");
      } finally {
        setSubmitting(false);
      }
    };


  return (

     <div className="min-h-screen bg-gray-50 flex">
           <Sidebar />
      <div className="flex-1 max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Yêu Cầu Xuất Vật Tư
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin chung */}
          <div className="bg-white shadow rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Dự án *
              </label>
              <select
                value={projectId}
                onChange={(e) =>
                  setProjectId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn dự án --</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi chú
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Chi tiết vật tư */}
          <div className="bg-white shadow rounded-xl overflow-hidden">
            <div className="bg-gray-800 text-white px-6 py-4 flex justify-between">
              <span>Chi Tiết Vật Tư</span>
              <span>{items.length} mặt hàng</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Vật tư</th>
                    <th className="p-3 text-left">Số lượng</th>
                    <th className="p-3 text-left">Đơn vị</th>
                    <th className="p-3 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">{index + 1}</td>

                      <td className="p-3">
                        <select
                          value={item.materialId}
                          onChange={(e) =>
                            handleMaterialChange(
                              item.id,
                              e.target.value
                                ? Number(e.target.value)
                                : ""
                            )
                          }
                          className="w-full border rounded-lg px-2 py-1"
                        >
                          <option value="">-- Chọn vật tư --</option>
                          {materials.map((material) => (
                            <option
                              key={material.materialId}
                              value={material.materialId}
                            >
                              {material.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.id,
                              Number(e.target.value)
                            )
                          }
                          className="w-full border rounded-lg px-2 py-1"
                        />
                      </td>

                      <td className="p-3">
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {item.unit || "-"}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Thêm vật tư
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Gửi Yêu Cầu
            </button>
          </div>
        </form>

         {showConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px]">
                <h2 className="text-lg font-bold mb-2">Xác nhận xuất vật tư</h2>
                <div className="mb-2">
                  <div><b>Dự án:</b> {projects.find(p => p.projectId === projectId)?.name}</div>
                  <div className="mt-2">
                    <b>Danh sách vật tư:</b>
                    <ul className="list-disc ml-5">
                      {items.map((item, idx) => (
                        <li key={item.id}>
                          {materials.find(m => m.materialId === item.materialId)?.name || "?"} - SL: {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3 mt-4 justify-end">
                  <button
                    className="px-4 py-2 rounded bg-gray-200"
                    onClick={() => setShowConfirm(false)}
                    disabled={submitting}
                  >
                    Hủy
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-green-600 text-white"
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Đang gửi..." : "Xác nhận"}
                  </button>
                </div>
              </div>
            </div>
          )}         


      </div>
    </div>
  );


};



export default MaterialRequestForm;