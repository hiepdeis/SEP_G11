"use client";

import {
  PageContainer,
  ProCard,
  ProForm,
  ProFormSelect,
  ProFormTextArea,
  EditableProTable
} from "@ant-design/pro-components";

import { Tag, Button } from "antd";
import { useState } from "react";

type Material = {
  id: number;
  code: string;
  qty: number;
};

export default function IssueMaterialPage() {

  const [dataSource, setDataSource] = useState<Material[]>([
    { id: 1, code: "PE100", qty: 1000 }
  ]);

  const columns = [
    {
      title: "Mã vật liệu",
      dataIndex: "code",
      valueType: "select",
      valueEnum: {
        PE100: { text: "PE100" },
        POE: { text: "POE" }
      }
    },
    {
      title: "SL yêu cầu",
      dataIndex: "qty",
      valueType: "digit"
    }
  ];

  return (
    <PageContainer
      title="Yêu cầu xuất vật tư"
      extra={[
        <Tag color="orange">Chưa gửi</Tag>,
        <Button type="primary">Gửi sang kho</Button>
      ]}
    >

      <ProCard title="Thông tin chung">

        <ProForm grid submitter={false}>

          <ProFormSelect
            name="productionOrder"
            label="Lệnh sản xuất"
            colProps={{ span: 8 }}
          />

          <ProFormSelect
            name="requester"
            label="Người yêu cầu"
            colProps={{ span: 8 }}
          />

          <ProFormTextArea
            name="note"
            label="Diễn giải"
            colProps={{ span: 24 }}
          />

        </ProForm>

      </ProCard>

      <ProCard
        title="Danh sách nguyên vật liệu"
        style={{ marginTop: 20 }}
      >

        <EditableProTable
          rowKey="id"
          columns={columns}
          value={dataSource}
          onChange={setDataSource}
          recordCreatorProps={{
            record: () => ({ id: Date.now() })
          }}
        />

      </ProCard>

    </PageContainer>
  );
}