import { Button, Form, Input, Modal, Space, Table, message } from 'antd';
import { useEffect, useState } from 'react';
import http from '../../api/http';

interface Client { 
  id: string; 
  name: string; 
  remark?: string;
  _count?: {
    passports: number;
  };
  passports?: Array<{ id: string }>;
}

export default function ClientList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form] = Form.useForm<Client>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await http.get('/clients');
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (record: Client) => { setEditing(record); form.setFieldsValue(record); setOpen(true); };

  const onSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) await http.patch(`/clients/${editing.id}`, values);
      else await http.post('/clients', values);
      message.success('保存成功');
      setOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败');
    }
  };

  const onRemove = async (record: Client) => {
    try {
      await http.delete(`/clients/${record.id}`);
      message.success('已删除');
      fetchData();
    } catch (e: any) {
      if (e?.response?.status === 409 && e.response.data?.code === 'NEED_CONFIRM') {
        const { passports, visas } = e.response.data;
        Modal.confirm({
          title: '确认删除该代理？',
          content: `删除该代理将同时删除名下 ${passports} 本护照及其 ${visas} 张签证。是否继续？`,
          onOk: async () => {
            await http.delete(`/clients/${record.id}?cascade=true`);
            message.success('已删除');
            fetchData();
          },
        });
      } else {
        message.error(e?.response?.data?.message || '删除失败');
      }
    }
  };

  return (
    <div>
      <div className="page-header">客户管理</div>
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <Button type="primary" onClick={onCreate}>新建客户</Button>
          <div style={{ marginLeft: 16, padding: '8px 16px', backgroundColor: '#f0f0f0', borderRadius: '6px' }}>
            <Space size="large">
              <span>
                总客户数: <strong>{data.length}</strong>
              </span>
              <span>
                总护照数: <strong style={{ color: '#1890ff' }}>
                  {data.reduce((sum, client) => sum + (client._count?.passports || 0), 0)}
                </strong>
              </span>
              <span>
                在库护照: <strong style={{ color: '#52c41a' }}>
                  {data.reduce((sum, client) => sum + (client.passports?.length || 0), 0)}
                </strong>
              </span>
            </Space>
          </div>
        </Space>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '备注', dataIndex: 'remark' },
          { 
            title: '护照总数', 
            dataIndex: ['_count', 'passports'], 
            render: (value: number) => (
              <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                {value || 0}
              </span>
            ),
            sorter: (a: Client, b: Client) => (a._count?.passports || 0) - (b._count?.passports || 0),
            align: 'center'
          },
          { 
            title: '在库护照', 
            dataIndex: 'passports', 
            render: (passports: Array<{ id: string }>) => (
              <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                {passports?.length || 0}
              </span>
            ),
            sorter: (a: Client, b: Client) => (a.passports?.length || 0) - (b.passports?.length || 0),
            align: 'center'
          },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button type="link" onClick={() => onEdit(record)}>编辑</Button>
                <Button type="link" danger onClick={() => onRemove(record)}>删除</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal open={open} title={editing ? '编辑客户' : '新建客户'} onOk={onSubmit} onCancel={() => setOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="请输入客户名称" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="可填写备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
