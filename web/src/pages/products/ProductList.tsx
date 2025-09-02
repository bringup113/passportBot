import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Card, Row, Col, Select, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import http from '../../api/http';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  supplierId: string;
  supplier: Supplier;
  status: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const loadSuppliers = async () => {
    try {
      const response = await http.get('/suppliers');
      setSuppliers(response.data.items);
    } catch (error) {
      message.error('加载供应商列表失败');
    }
  };

  const loadProducts = async (page = 1, pageSize = 10, q = '', supplierId = '', status = '') => {
    setLoading(true);
    try {
      const response = await http.get('/products', {
        params: { page, pageSize, q, supplierId, status }
      });
      setProducts(response.data.items);
      setPagination({
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total
      });
    } catch (error) {
      message.error('加载产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      ...product,
      price: product.price,
      costPrice: product.costPrice
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/products/${id}`);
      message.success('删除成功');
      loadProducts(pagination.current, pagination.pageSize, searchText, selectedSupplier, selectedStatus);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '删除失败';
      if (errorMessage.includes('已被订单使用')) {
        Modal.error({
          title: '无法删除产品',
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
      if (editingProduct) {
        await http.put(`/products/${editingProduct.id}`, values);
        message.success('更新成功');
      } else {
        await http.post('/products', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadProducts(pagination.current, pagination.pageSize, searchText, selectedSupplier, selectedStatus);
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    loadProducts(1, pagination.pageSize, value, selectedSupplier, selectedStatus);
  };

  const handleSupplierChange = (value: string) => {
    setSelectedSupplier(value);
    loadProducts(1, pagination.pageSize, searchText, value, selectedStatus);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    loadProducts(1, pagination.pageSize, searchText, selectedSupplier, value);
  };

  const columns = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '销售价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => price ? `$${Number(price).toFixed(2)}` : '-',
    },
    {
      title: '成本价格',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (costPrice: number) => costPrice ? `$${Number(costPrice).toFixed(2)}` : '-',
    },
    {
      title: '供应商',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{ color: status === 'active' ? '#52c41a' : '#ff4d4f' }}>
          {status === 'active' ? '启用' : '禁用'}
        </span>
      ),
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
      render: (_: any, record: Product) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个产品吗？"
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
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Input.Search
              placeholder="搜索产品名称或备注"
              allowClear
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择供应商"
              allowClear
              style={{ width: '100%' }}
              value={selectedSupplier}
              onChange={handleSupplierChange}
            >
              {suppliers.map(supplier => (
                <Select.Option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={selectedStatus}
              onChange={handleStatusChange}
            >
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="inactive">禁用</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增产品
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, pageSize) => {
              loadProducts(page, pageSize || 10, searchText, selectedSupplier, selectedStatus);
            },
          }}
        />
      </Card>

      <Modal
        title={editingProduct ? '编辑产品' : '新增产品'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="产品名称"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="销售价格"
                rules={[{ required: true, message: '请输入销售价格' }]}
              >
                <InputNumber
                  placeholder="请输入销售价格"
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="$"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="costPrice"
                label="成本价格"
                rules={[{ required: true, message: '请输入成本价格' }]}
              >
                <InputNumber
                  placeholder="请输入成本价格"
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="supplierId"
            label="供应商"
            rules={[{ required: true, message: '请选择供应商' }]}
          >
            <Select placeholder="请选择供应商">
              {suppliers.map(supplier => (
                <Select.Option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="inactive">禁用</Select.Option>
            </Select>
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
                {editingProduct ? '更新' : '创建'}
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
