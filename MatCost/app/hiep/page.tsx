"use client";
import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { projectApi, ProjectDto } from "@/services/project-services";
import { 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Table, 
  Button, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Typography, 
  message,
  InputNumber,
  Modal,
  Upload
} from "antd";
import { 
  PlusOutlined, 
  SendOutlined, 
  DeleteOutlined, 
  FileExcelOutlined, 
  UploadOutlined 
} from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Title } = Typography;

type Material = {
  id: string;
  code?: string;
  name?: string;
  unit?: string;
  qty?: number;
};

const MATERIAL_LIST = [
  { code: "PE100", name: "Hạt nhựa PE100", unit: "kg" },
  { code: "POE", name: "Hạt nhựa POE", unit: "kg" },
  { code: "PVC01", name: "Nhựa PVC", unit: "kg" },
];

export default function IssueMaterialPage() {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState<Material[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const genCode = () => {
    const now = dayjs();
    return `REQ-${now.format("YYYYMMDD-HHmmss")}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  useEffect(() => {
    const initData = async () => {
      setLoadingProjects(true);
      try {
        const data = await projectApi.getProjects();
        setProjects(data);
        form.setFieldsValue({
          requestCode: genCode(),
          requestDate: dayjs(),
          status: "draft",
          requester: "Pham Duy Hiep",
          department: "Phòng Kỹ thuật",
        });
      } catch (error) {
        message.error("Không thể tải danh sách dự án");
      } finally {
        setLoadingProjects(false);
      }
    };
    initData();
  }, [form]);

  // --- Logic Bảng Vật Tư ---
  const addRow = () => {
    const newRow: Material = { id: Date.now().toString(), qty: 1 };
    setDataSource([...dataSource, newRow]);
  };

  const deleteRow = (id: string) => {
    setDataSource(dataSource.filter(item => item.id !== id));
  };

  const updateCell = (id: string, field: keyof Material, value: any) => {
    const newData = dataSource.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'code') {
          const found = MATERIAL_LIST.find(m => m.code === value);
          if (found) {
            updatedItem.name = found.name;
            updatedItem.unit = found.unit;
          }
        } else if (field === 'name') {
          const found = MATERIAL_LIST.find(m => m.name === value);
          if (found) {
            updatedItem.code = found.code;
            updatedItem.unit = found.unit;
          }
        }
        return updatedItem;
      }
      return item;
    });
    setDataSource(newData);
  };

  const columns = [
    {
      title: "STT",
      render: (_: any, __: any, index: number) => index + 1,
      width: 60,
      align: 'center' as const,
    },
    {
      title: "Mã vật liệu",
      dataIndex: "code",
      render: (text: string, record: Material) => (
        <Select 
          showSearch 
          style={{ width: '100%' }} 
          value={text}
          placeholder="Chọn mã"
          onChange={(val) => updateCell(record.id, 'code', val)}
          options={MATERIAL_LIST.map(m => ({ label: m.code, value: m.code }))}
        />
      ),
    },
    {
      title: "Tên vật liệu",
      dataIndex: "name",
      render: (text: string, record: Material) => (
        <Select 
          showSearch 
          style={{ width: '100%' }} 
          value={text}
          placeholder="Chọn tên"
          onChange={(val) => updateCell(record.id, 'name', val)}
          options={MATERIAL_LIST.map(m => ({ label: m.name, value: m.name }))}
        />
      ),
    },
    { title: "ĐVT", dataIndex: "unit", width: 100 },
    {
      title: "SL yêu cầu",
      dataIndex: "qty",
      width: 150,
      render: (text: number, record: Material) => (
        <InputNumber 
          min={1} 
          style={{ width: '100%' }} 
          value={text} 
          onChange={(val) => updateCell(record.id, 'qty', val)}
        />
      ),
    },
    {
      title: "Thao tác",
      width: 80,
      align: 'center' as const,
      render: (_: any, record: Material) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteRow(record.id)} />
      ),
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "24px" }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Yêu cầu xuất vật tư</Title>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Tag color="orange">Chưa gửi</Tag>
            <Button type="primary" icon={<SendOutlined />} onClick={() => form.submit()}>Gửi sang kho</Button>
          </div>
        </div>

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={14}>
              <Card title="Thông tin chung" size="small">
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="project" label={<b>Công trình</b>} rules={[{ required: true }]}><Select placeholder="Chọn công trình" loading={loadingProjects} options={projects.map(p => ({ label: p.name, value: p.projectId }))} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="workItem" label={<b>Hạng mục</b>} rules={[{ required: true }]}><Select placeholder="Chọn hạng mục" options={[{ label: "Móng", value: "foundation" }]} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="requester" label={<b>Người yêu cầu</b>}><Input disabled /></Form.Item></Col>
                  <Col span={12}><Form.Item name="department" label={<b>Đơn vị yêu cầu</b>} rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="warehouse" label={<b>Kho xuất</b>} rules={[{ required: true }]}><Select options={[{ label: "Kho chính", value: "WH01" }]} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="deliveryLocation" label={<b>Nơi nhận</b>} rules={[{ required: true }]}><Input /></Form.Item></Col>
                </Row>
              </Card>
            </Col>
            <Col span={10}>
              <Card title="Thông tin hệ thống" size="small">
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="requestCode" label={<b>Mã yêu cầu</b>}><Input disabled /></Form.Item></Col>
                  <Col span={12}><Form.Item name="requestDate" label={<b>Ngày yêu cầu</b>}><DatePicker disabled style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="status" label={<b>Trạng thái</b>}><Select disabled options={[{ label: "Chưa gửi", value: "draft" }]} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="reference" label={<b>Mã tham chiếu</b>}><Input /></Form.Item></Col>
                  <Col span={24}><Form.Item name="approvalNote" label={<b>Ghi chú</b>}><TextArea rows={3} /></Form.Item></Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Card 
            title="Danh sách nguyên vật liệu" 
            style={{ marginTop: 16 }} 
            size="small"
            extra={
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  icon={<FileExcelOutlined />} 
                  onClick={() => setIsImportModalOpen(true)}
                >
                  Import Excel
                </Button>
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={addRow}
                >
                  Thêm vật liệu
                </Button>
              </div>
            }
          >
            <Table dataSource={dataSource} columns={columns} rowKey="id" pagination={false} bordered size="small" />
          </Card>
        </Form>

        {/* MODAL IMPORT EXCEL */}
        <Modal
          title="Import vật tư từ file Excel"
          open={isImportModalOpen}
          onCancel={() => setIsImportModalOpen(false)}
          footer={[
            <Button key="back" onClick={() => setIsImportModalOpen(false)}>Hủy</Button>,
            <Button key="submit" type="primary" onClick={() => {
              message.info("Chức năng xử lý file đang được phát triển");
              setIsImportModalOpen(false);
            }}>
              Tải lên
            </Button>
          ]}
        >
          <div style={{ padding: '20px 0' }}>
            <Upload.Dragger accept=".xlsx, .xls" beforeUpload={() => false}>
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">Nhấp hoặc kéo tệp vào khu vực này để tải lên</p>
              <p className="ant-upload-hint">Hỗ trợ định dạng .xls, .xlsx</p>
            </Upload.Dragger>
            <div style={{ marginTop: 16 }}>
              <Button type="link" size="small">Tải file mẫu tại đây</Button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}