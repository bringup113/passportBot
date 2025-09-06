import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Card, Row, Col, Select, InputNumber, DatePicker, Radio, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import http from '../../api/http';
import dayjs from 'dayjs';

interface Client {
  id: string;
  name: string;
}

interface Passport {
  passportNo: string;
  fullName: string;
  country: string;
  gender: string;
  dateOfBirth: string;
  issueDate: string;
  expiryDate: string;
  client: Client;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  supplier: Supplier;
}

interface OrderItem {
  id?: string;
  productId: string;
  product: Product;
  salePrice: number;
  costPrice: number;
  status: string;
  remark?: string;
}

interface Bill {
  id: string;
  billStatus: string;
  paidAmount: number;
  remainingAmount: number;
}

interface Order {
  id: string;
  passportNo: string;
  passport: Passport;
  clientId: string;
  client: Client;
  customerName: string;
  passportNumber: string;
  country: string;
  billStatus: string;
  totalAmount: number;
  totalCost: number;
  orderStatus: string;
  remark?: string;
  orderItems: OrderItem[];
  bills: Bill[];
  createdAt: string;
  updatedAt: string;
}

export default function OrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | undefined>(undefined);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string | undefined>(undefined);
  const [selectedBillStatus, setSelectedBillStatus] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });

  // 业务明细相关状态
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [newOrderItem, setNewOrderItem] = useState<Partial<OrderItem>>({
    productId: '',
    salePrice: 0,
    costPrice: 0,
    status: 'pending'
  });

  const loadClients = async () => {
    try {
      const response = await http.get('/clients');
      setClients(response.data);
    } catch (error) {
      message.error('加载客户列表失败');
    }
  };

  const loadPassports = async (clientId?: string) => {
    try {
      const response = await http.get('/passports', {
        params: { clientId, pageSize: 1000 }
      });
      setPassports(response.data.data);
    } catch (error) {
      message.error('加载护照列表失败');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await http.get('/products', {
        params: { pageSize: 1000, status: 'active' }
      });
      setProducts(response.data.items);
    } catch (error) {
      message.error('加载产品列表失败');
    }
  };

  // 分页变化处理
  const handleTableChange = (paginationInfo: any) => {
    setPagination(prev => ({
      ...prev,
      current: paginationInfo.current || 1,
      pageSize: paginationInfo.pageSize || 10
    }));
  };

  const loadOrders = async (page = 1, pageSize = 10, q = '', clientId = '', orderStatus = '', billStatus = '') => {
    setLoading(true);
    try {
      const response = await http.get('/orders', {
        params: { page, pageSize, q, clientId, orderStatus, billStatus }
      });
      setOrders(response.data.items);
      setPagination({
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total,
        totalPages: response.data.totalPages || Math.ceil(response.data.total / response.data.pageSize)
      });
    } catch (error) {
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadProducts();
  }, []);

  useEffect(() => {
    loadOrders(pagination.current, pagination.pageSize, searchText, selectedClient, selectedOrderStatus, selectedBillStatus);
  }, [pagination.current, pagination.pageSize, searchText, selectedClient, selectedOrderStatus, selectedBillStatus]);

  const handleAdd = () => {
    setEditingOrder(null);
    form.resetFields();
    setOrderItems([]);
    setNewOrderItem({
      productId: '',
      salePrice: 0,
      costPrice: 0,
      status: 'pending'
    });
    // 清空护照列表，等待用户选择客户
    setPassports([]);
    setModalVisible(true);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    form.setFieldsValue({
      ...order,
      passportNo: order.passportNo
    });
    setOrderItems(order.orderItems);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/orders/${id}`);
      message.success('删除成功');
      loadOrders(pagination.current, pagination.pageSize, searchText, selectedClient, selectedOrderStatus, selectedBillStatus);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '删除失败';
      if (errorMessage.includes('已生成账单')) {
        Modal.error({
          title: '无法删除订单',
          content: errorMessage,
          okText: '我知道了'
        });
      } else {
        message.error(errorMessage);
      }
    }
  };

  const handlePassportChange = (passportNo: string) => {
    const passport = passports.find(p => p.passportNo === passportNo);
    if (passport) {
      form.setFieldsValue({
        customerName: passport.fullName,
        passportNumber: passport.passportNo,
        country: passport.country,
        gender: passport.gender,
        dateOfBirth: dayjs(passport.dateOfBirth),
        issueDate: dayjs(passport.issueDate),
        expiryDate: dayjs(passport.expiryDate)
      });
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewOrderItem({
        ...newOrderItem,
        productId,
        salePrice: product.price,
        costPrice: product.costPrice
      });
    }
  };

  const handleAddOrderItem = () => {
    if (!newOrderItem.productId) {
      message.error('请选择产品');
      return;
    }
    if (!newOrderItem.salePrice || !newOrderItem.costPrice) {
      message.error('请输入价格');
      return;
    }

    const product = products.find(p => p.id === newOrderItem.productId);
    if (product) {
      const orderItem: OrderItem = {
        productId: newOrderItem.productId!,
        product,
        salePrice: newOrderItem.salePrice!,
        costPrice: newOrderItem.costPrice!,
        status: newOrderItem.status || 'pending',
        remark: newOrderItem.remark
      };
      setOrderItems([...orderItems, orderItem]);
      setNewOrderItem({
        productId: '',
        salePrice: 0,
        costPrice: 0,
        status: 'pending'
      });
    }
  };

  const handleStatusChange = (index: number, status: string) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], status };
    setOrderItems(newItems);
  };

  const handleRemoveOrderItem = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
  };

  const calculateTotals = () => {
    const totalAmount = orderItems.reduce((sum, item) => sum + Number(item.salePrice || 0), 0);
    const totalCost = orderItems.reduce((sum, item) => sum + Number(item.costPrice || 0), 0);
    return { totalAmount, totalCost };
  };

  const handleSubmit = async (values: any) => {
    if (orderItems.length === 0) {
      message.error('请至少添加一个业务明细');
      return;
    }

    try {
      const orderData = {
        passportNo: values.passportNo,
        orderItems: orderItems.map(item => ({
          id: item.id, // 包含ID用于更新
          productId: item.productId,
          salePrice: item.salePrice,
          costPrice: item.costPrice,
          status: item.status,
          remark: item.remark
        })),
        remark: values.remark
      };

      if (editingOrder) {
        await http.put(`/orders/${editingOrder.id}`, orderData);
        message.success('更新成功');
      } else {
        await http.post('/orders', orderData);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadOrders(pagination.current, pagination.pageSize, searchText, selectedClient, selectedOrderStatus, selectedBillStatus);
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleClientChange = (value: string) => {
    setSelectedClient(value);
    loadPassports(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFormClientChange = (value: string) => {
    // 清空护照选择
    form.setFieldsValue({ passportNo: undefined });
    // 加载该客户的护照
    loadPassports(value);
  };

  const handleOrderStatusChange = (value: string) => {
    setSelectedOrderStatus(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleBillStatusChange = (value: string) => {
    setSelectedBillStatus(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleViewBill = (order: Order) => {
    if (order.bills && order.bills.length > 0) {
      const billId = order.bills[0].id;
      // 跳转到账单管理页面，并传递账单ID参数
      navigate(`/bills?billId=${billId}`);
    }
  };

  const columns = [
    {
      title: '客户',
      dataIndex: ['client', 'name'],
      key: 'clientName',
    },
    {
      title: '姓名',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '护照号码',
      dataIndex: 'passportNumber',
      key: 'passportNumber',
    },
    {
      title: '国家',
      dataIndex: 'country',
      key: 'country',
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '待处理', color: '#faad14' },
          processing: { text: '处理中', color: '#1890ff' },
          completed: { text: '已完成', color: '#52c41a' },
          cancelled: { text: '已取消', color: '#ff4d4f' }
        };
        const statusInfo = statusMap[status] || { text: status, color: '#666' };
        return <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>;
      },
    },
    {
      title: '账单状态',
      dataIndex: 'billStatus',
      key: 'billStatus',
      render: (status: string, record: Order) => {
        if (status === 'unbilled') {
          return <span style={{ color: '#faad14' }}>未生成账单</span>;
        }
        return (
          <Button
            type="link"
            size="small"
            onClick={() => handleViewBill(record)}
          >
            查看账单
          </Button>
        );
      },
    },
    {
      title: '支付状态',
      key: 'paymentStatus',
      render: (_: any, record: Order) => {
        if (record.billStatus === 'unbilled') {
          return <span style={{ color: '#999' }}>-</span>;
        }
        const bill = record.bills[0]; // 取第一个账单（通常一个订单只关联一个账单）
        if (!bill) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        const statusMap: Record<string, { text: string; color: string }> = {
          unpaid: { text: '未支付', color: '#faad14' },
          partial: { text: '已付部分', color: '#1890ff' },
          paid: { text: '已支付', color: '#52c41a' }
        };
        const statusInfo = statusMap[bill.billStatus] || { text: bill.billStatus, color: '#666' };
        return <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>;
      },
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => amount ? `$${Number(amount).toFixed(2)}` : '-',
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => cost ? `$${Number(cost).toFixed(2)}` : '-',
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
      render: (_: any, record: Order) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleEdit(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个订单吗？"
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

  const { totalAmount, totalCost } = calculateTotals();

  return (
    <div>
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索客户，姓名、护照号码或国家"
            allowClear
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
            style={{ width: 280 }}
          />
          <Select
            placeholder="按客户筛选"
            allowClear
            style={{ width: 180 }}
            value={selectedClient}
            options={clients.map(client => ({ label: client.name, value: client.id }))}
            onChange={handleClientChange}
          />
          <Select
            placeholder="按订单状态筛选"
            allowClear
            style={{ width: 180 }}
            value={selectedOrderStatus}
            options={[
              { label: '待处理', value: 'pending' },
              { label: '处理中', value: 'processing' },
              { label: '已完成', value: 'completed' },
              { label: '已取消', value: 'cancelled' }
            ]}
            onChange={handleOrderStatusChange}
          />
          <Select
            placeholder="按账单状态筛选"
            allowClear
            style={{ width: 180 }}
            value={selectedBillStatus}
            options={[
              { label: '未生成账单', value: 'unbilled' },
              { label: '已生成账单', value: 'billed' }
            ]}
            onChange={handleBillStatusChange}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建订单
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            size: 'default',
          }}
        />
      </Card>

      <Modal
        title={editingOrder ? '编辑订单' : '新建订单'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
        width={1200}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Card title="订单信息" size="small">
                <Form.Item
                  name="clientId"
                  label="选择客户"
                  rules={[{ required: true, message: '请选择客户' }]}
                >
                  <Select
                    placeholder="请选择客户"
                    onChange={handleFormClientChange}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {clients.map(client => (
                      <Select.Option key={client.id} value={client.id}>
                        {client.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="passportNo"
                  label="选择护照"
                  rules={[{ required: true, message: '请选择护照' }]}
                >
                  <Select
                    placeholder="请先选择客户"
                    onChange={handlePassportChange}
                    showSearch
                    disabled={!form.getFieldValue('clientId')}
                    filterOption={(input, option) =>
                      String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {passports.map(passport => (
                      <Select.Option key={passport.passportNo} value={passport.passportNo}>
                        {passport.passportNo} - {passport.fullName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Row gutter={8}>
                  <Col span={8}>
                    <Form.Item
                      name="customerName"
                      label="姓名"
                    >
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="passportNumber"
                      label="护照号码"
                    >
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="country"
                      label="国家"
                    >
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item
                      name="gender"
                      label="性别"
                    >
                      <Radio.Group disabled>
                        <Radio value="male">男</Radio>
                        <Radio value="female">女</Radio>
                        <Radio value="other">其他</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="dateOfBirth"
                      label="出生日期"
                    >
                      <DatePicker disabled style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item
                      name="issueDate"
                      label="签发日期"
                    >
                      <DatePicker disabled style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="expiryDate"
                      label="到期日期"
                    >
                      <DatePicker disabled style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="remark"
                  label="备注"
                >
                  <Input.TextArea rows={2} placeholder="请输入备注信息" />
                </Form.Item>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="业务信息" size="small">
                <div style={{ marginBottom: 16 }}>
                  <Row gutter={6} align="middle">
                    <Col span={10}>
                      <Select
                        placeholder="选择产品"
                        style={{ width: '100%' }}
                        value={newOrderItem.productId}
                        onChange={handleProductChange}
                        showSearch
                        filterOption={(input, option) =>
                          String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {products.map(product => (
                          <Select.Option key={product.id} value={product.id}>
                            {product.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={6}>
                      <InputNumber
                        placeholder="销售价格"
                        style={{ width: '100%' }}
                        value={newOrderItem.salePrice}
                        onChange={(value) => setNewOrderItem({ ...newOrderItem, salePrice: value || 0 })}
                        min={0}
                        precision={2}
                        prefix="$"
                      />
                    </Col>
                    <Col span={6}>
                      <InputNumber
                        placeholder="成本价格"
                        style={{ width: '100%' }}
                        value={newOrderItem.costPrice}
                        onChange={(value) => setNewOrderItem({ ...newOrderItem, costPrice: value || 0 })}
                        min={0}
                        precision={2}
                        prefix="$"
                      />
                    </Col>
                    <Col span={2}>
                      <Button type="primary" size="small" onClick={handleAddOrderItem}>
                        添加
                      </Button>
                    </Col>
                  </Row>
                </div>

                <Divider />

                <div style={{ marginBottom: 16 }}>
                  <strong>总成本: ${Number(totalCost).toFixed(2)} 总销售额: ${Number(totalAmount).toFixed(2)}</strong>
                </div>

                {orderItems.length > 0 ? (
                  <Table
                    size="small"
                    dataSource={orderItems}
                    rowKey={(item, index) => index?.toString() || ''}
                    pagination={false}
                    columns={[
                      {
                        title: '产品名称',
                        dataIndex: ['product', 'name'],
                        key: 'productName',
                      },
                      {
                        title: '销售价格',
                        dataIndex: 'salePrice',
                        key: 'salePrice',
                        render: (price: number) => price ? `$${Number(price).toFixed(2)}` : '-',
                      },
                      {
                        title: '成本价格',
                        dataIndex: 'costPrice',
                        key: 'costPrice',
                        render: (cost: number) => cost ? `$${Number(cost).toFixed(2)}` : '-',
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string, record: OrderItem, index: number) => (
                          <Select
                            value={status}
                            size="small"
                            style={{ width: '100%' }}
                            onChange={(value) => handleStatusChange(index, value)}
                          >
                            <Select.Option value="pending">待处理</Select.Option>
                            <Select.Option value="processing">处理中</Select.Option>
                            <Select.Option value="completed">已完成</Select.Option>
                          </Select>
                        ),
                      },
                      {
                        title: '操作',
                        key: 'action',
                        render: (_: any, record: OrderItem, index: number) => (
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() => handleRemoveOrderItem(index)}
                          >
                            删除
                          </Button>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无业务信息数据
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingOrder ? '更新' : '创建'}
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
