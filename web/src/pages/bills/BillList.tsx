import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Card, Row, Col, Select, InputNumber, DatePicker, Tabs, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons';
import http from '../../api/http';
import dayjs from 'dayjs';
import BillPreview from '../../components/BillPreview';

interface Client {
  id: string;
  name: string;
}

interface Order {
  id: string;
  customerName: string;
  passportNumber: string;
  totalAmount: number;
  totalCost: number;
  client: {
    id: string;
    name: string;
  };
  orderItems: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      costPrice: number;
      supplier: {
        id: string;
        name: string;
      };
    };
    salePrice: number;
    costPrice: number;
    status: string;
    remark?: string;
  }>;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  remark?: string;
  createdAt: string;
}

interface Bill {
  id: string;
  orderIds: string[];
  orderCount: number;
  clientId: string;
  client: Client;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  billStatus: string;
  orders: Order[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export default function BillList() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedBillStatus, setSelectedBillStatus] = useState<string>('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });

  const loadClients = async () => {
    try {
      const response = await http.get('/clients');
      setClients(response.data);
    } catch (error) {
      message.error('加载客户列表失败');
    }
  };

  const loadOrders = async (clientId?: string) => {
    try {
      const response = await http.get('/orders', {
        params: { 
          clientId, 
          billStatus: 'unbilled',
          pageSize: 1000 
        }
      });
      setOrders(response.data.items);
    } catch (error) {
      message.error('加载订单列表失败');
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

  const loadBills = async (page = 1, pageSize = 10, q = '', clientId = '', billStatus = '') => {
    setLoading(true);
    try {
      const response = await http.get('/bills', {
        params: { page, pageSize, q, clientId, billStatus }
      });
      setBills(response.data.items);
      setPagination({
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total,
        totalPages: response.data.totalPages || Math.ceil(response.data.total / response.data.pageSize)
      });
    } catch (error) {
      message.error('加载账单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadBills(pagination.current, pagination.pageSize, searchText, selectedClient, selectedBillStatus);
  }, [pagination.current, pagination.pageSize, searchText, selectedClient, selectedBillStatus]);

  const handleCreateBill = () => {
    setSelectedOrders([]);
    form.resetFields();
    // 重新加载订单列表，确保显示最新的订单状态
    loadOrders();
    setModalVisible(true);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    loadOrders(clientId);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleBillStatusChange = (billStatus: string) => {
    setSelectedBillStatus(billStatus);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleCreateBillSubmit = async (values: any) => {
    if (selectedOrders.length === 0) {
      message.error('请至少选择一个订单');
      return;
    }

    try {
      await http.post('/bills', { orderIds: selectedOrders });
      message.success('账单创建成功');
      setModalVisible(false);
      // 重新加载当前页数据
      loadBills(pagination.current, pagination.pageSize, searchText, selectedClient, selectedBillStatus);
      // 重新加载订单列表，确保已生成账单的订单不再显示
      loadOrders(selectedClient);
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建账单失败');
    }
  };

  const handleAddPayment = (bill: Bill) => {
    setSelectedBill(bill);
    paymentForm.resetFields();
    setPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async (values: any) => {
    if (!selectedBill) return;

    try {
      await http.post(`/bills/${selectedBill.id}/payment`, {
        amount: values.amount,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
        remark: values.remark
      });
      message.success('付款记录添加成功');
      setPaymentModalVisible(false);
      // 重新加载当前页数据
      loadBills(pagination.current, pagination.pageSize, searchText, selectedClient, selectedBillStatus);
      // 如果账单详情页是打开的，重新加载账单详情
      if (selectedBill) {
        const response = await http.get(`/bills/${selectedBill.id}`);
        setSelectedBill(response.data);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加付款记录失败');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await http.delete(`/bills/payment/${paymentId}`);
      message.success('付款记录删除成功');
      // 重新加载当前页数据
      loadBills(pagination.current, pagination.pageSize, searchText, selectedClient, selectedBillStatus);
      // 如果账单详情页是打开的，重新加载账单详情
      if (selectedBill) {
        const response = await http.get(`/bills/${selectedBill.id}`);
        setSelectedBill(response.data);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除付款记录失败');
    }
  };

  const handleViewDetail = async (bill: Bill) => {
    try {
      const response = await http.get(`/bills/${bill.id}`);
      setSelectedBill(response.data);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载账单详情失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/bills/${id}`);
      message.success('删除成功');
      // 重新加载当前页数据
      loadBills(pagination.current, pagination.pageSize, searchText, selectedClient, selectedBillStatus);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '删除失败';
      if (errorMessage.includes('已有付款记录')) {
        Modal.error({
          title: '无法删除账单',
          content: errorMessage,
          okText: '我知道了'
        });
      } else {
        message.error(errorMessage);
      }
    }
  };

  const columns = [
    {
      title: '客户',
      dataIndex: ['client', 'name'],
      key: 'client',
    },
    {
      title: '订单数量',
      dataIndex: 'orderCount',
      key: 'orderCount',
    },
    {
      title: '账单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => amount ? `$${Number(amount).toFixed(2)}` : '-',
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (amount: number) => amount ? `$${Number(amount).toFixed(2)}` : '-',
    },
    {
      title: '剩余款项',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      render: (amount: number) => amount ? `$${Number(amount).toFixed(2)}` : '-',
    },
    {
      title: '账单状态',
      dataIndex: 'billStatus',
      key: 'billStatus',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          unpaid: { text: '待付款', color: '#faad14' },
          partial: { text: '已付部分', color: '#1890ff' },
          paid: { text: '已付款', color: '#52c41a' }
        };
        const statusInfo = statusMap[status] || { text: status, color: '#666' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
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
      render: (_: any, record: Bill) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<DollarOutlined />}
            onClick={() => handleAddPayment(record)}
            disabled={record.billStatus === 'paid'}
          >
            付款
          </Button>
          <Popconfirm
            title="确定要删除这个账单吗？"
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
              placeholder="搜索客户名称"
              allowClear
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择客户"
              allowClear
              style={{ width: '100%' }}
              value={selectedClient}
              onChange={handleClientChange}
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="账单状态"
              allowClear
              style={{ width: '100%' }}
              value={selectedBillStatus}
              onChange={handleBillStatusChange}
            >
              <Select.Option value="unpaid">待付款</Select.Option>
              <Select.Option value="partial">已付部分</Select.Option>
              <Select.Option value="paid">已付款</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateBill}>
              生成账单
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={bills}
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

      {/* 生成账单模态框 */}
      <Modal
        title="生成账单"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateBillSubmit}
        >
          <Form.Item
            name="clientId"
            label="选择客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              placeholder="请选择客户"
              onChange={handleClientChange}
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="选择订单">
            <Table
              size="small"
              dataSource={orders}
              rowKey="id"
              pagination={false}
                             rowSelection={{
                 type: 'checkbox',
                 selectedRowKeys: selectedOrders,
                 onChange: (selectedRowKeys) => setSelectedOrders(selectedRowKeys as string[]),
               }}
              columns={[
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
                  title: '订单金额',
                  dataIndex: 'totalAmount',
                  key: 'totalAmount',
                  render: (amount: number) => amount ? `$${Number(amount).toFixed(2)}` : '-',
                },
                {
                  title: '订单成本',
                  dataIndex: 'totalCost',
                  key: 'totalCost',
                  render: (cost: number) => cost ? `$${Number(cost).toFixed(2)}` : '-',
                },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                生成账单
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 付款模态框 */}
      <Modal
        title="添加付款记录"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePaymentSubmit}
        >
          <Form.Item
            name="amount"
            label="付款金额"
            rules={[{ required: true, message: '请输入付款金额' }]}
          >
            <InputNumber
              placeholder="请输入付款金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="$"
            />
          </Form.Item>

          <Form.Item
            name="paymentDate"
            label="付款日期"
            rules={[{ required: true, message: '请选择付款日期' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} />
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
                添加付款
              </Button>
              <Button onClick={() => setPaymentModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 账单详情模态框 */}
      <Modal
        title="账单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        destroyOnClose
        width={1000}
      >
        {selectedBill && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <strong>客户：</strong>{selectedBill.client.name}
                </Col>
                <Col span={6}>
                  <strong>订单数量：</strong>{selectedBill.orderCount}
                </Col>
                <Col span={6}>
                  <strong>账单金额：</strong>${Number(selectedBill.totalAmount).toFixed(2)}
                </Col>
                <Col span={6}>
                  <strong>已付金额：</strong>${Number(selectedBill.paidAmount).toFixed(2)}
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={6}>
                  <strong>剩余款项：</strong>${Number(selectedBill.remainingAmount).toFixed(2)}
                </Col>
                <Col span={6}>
                  <strong>账单状态：</strong>
                  <Tag color={
                    selectedBill.billStatus === 'paid' ? 'green' :
                    selectedBill.billStatus === 'partial' ? 'blue' : 'orange'
                  }>
                    {selectedBill.billStatus === 'paid' ? '已付款' :
                     selectedBill.billStatus === 'partial' ? '已付部分' : '待付款'}
                  </Tag>
                </Col>
                <Col span={12}>
                  <strong>创建时间：</strong>{new Date(selectedBill.createdAt).toLocaleString()}
                </Col>
              </Row>
            </Card>

                         <Tabs
               items={[
                 {
                   key: 'preview',
                   label: '账单预览',
                   children: (
                     <BillPreview bill={selectedBill} />
                   ),
                 },
                 {
                   key: 'orders',
                   label: '关联订单',
                   children: (
                     <Table
                       size="small"
                       dataSource={selectedBill.orders}
                       rowKey="id"
                       pagination={false}
                       columns={[
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
                           title: '订单金额',
                           dataIndex: 'totalAmount',
                           key: 'totalAmount',
                           render: (amount: number) => amount ? `$${Number(amount).toFixed(2)}` : '-',
                         },
                         {
                           title: '订单成本',
                           dataIndex: 'totalCost',
                           key: 'totalCost',
                           render: (cost: number) => cost ? `$${Number(cost).toFixed(2)}` : '-',
                         },
                       ]}
                     />
                   ),
                 },
                 {
                   key: 'payments',
                   label: '付款记录',
                   children: (
                     <Table
                       size="small"
                       dataSource={selectedBill.payments}
                       rowKey="id"
                       pagination={false}
                       columns={[
                         {
                           title: '付款金额',
                           dataIndex: 'amount',
                           key: 'amount',
                           render: (amount: number) => amount ? `$${Number(amount).toFixed(2)}` : '-',
                         },
                         {
                           title: '付款日期',
                           dataIndex: 'paymentDate',
                           key: 'paymentDate',
                           render: (date: string) => new Date(date).toLocaleDateString(),
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
                           render: (_: any, record: Payment) => (
                             <Popconfirm
                               title="确定要删除这个付款记录吗？"
                               onConfirm={() => handleDeletePayment(record.id)}
                               okText="确定"
                               cancelText="取消"
                             >
                               <Button type="link" danger size="small">
                                 删除
                               </Button>
                             </Popconfirm>
                           ),
                         },
                       ]}
                     />
                   ),
                 },
               ]}
             />
          </div>
        )}
      </Modal>
    </div>
  );
}
