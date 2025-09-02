import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Card, Row, Col, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import http from '../../api/http';

interface Supplier {
  id: string;
  name: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const loadSuppliers = async (page = 1, pageSize = 10, q = '') => {
    setLoading(true);
    try {
      const response = await http.get('/suppliers', {
        params: { page, pageSize, q }
      });
      setSuppliers(response.data.items);
      setPagination({
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total
      });
    } catch (error) {
      message.error('加载供应商列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleAdd = () => {
    setEditingSupplier(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.setFieldsValue(supplier);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/suppliers/${id}`);
      message.success('删除成功');
      loadSuppliers(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '删除失败';
      if (errorMessage.includes('还有产品')) {
        Modal.error({
          title: '无法删除供应商',
          content: errorMessage,
          okText: '我知道了'
        });
      } else {
        message.error(errorMessage);
      }
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingSupplier) {
        await http.put(`/suppliers/${editingSupplier.id}`, values);
        message.success('更新成功');
      } else {
        await http.post('/suppliers', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadSuppliers(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    loadSuppliers(1, pagination.pageSize, value);
  };

  const columns = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Supplier) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个供应商吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Input.Search
              placeholder="搜索供应商名称或备注"
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增供应商
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, pageSize) => {
              loadSuppliers(page, pageSize || 10, searchText);
            },
          }}
        />
      </Card>

      <Modal
        title={editingSupplier ? '编辑供应商' : '新增供应商'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="供应商名称"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSupplier ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
