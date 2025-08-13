import { Button, Form, Input, Modal, Space, Switch, Table, message } from 'antd';
import { useEffect, useState } from 'react';
import http from '../../api/http';

interface User { id: string; username: string; isActive: boolean }

export default function UserList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await http.get('/users');
      setData(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const createUser = async () => {
    const v = await form.validateFields();
    try {
      await http.post('/users', v);
      message.success('用户已创建');
      setOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '创建失败');
    }
  };

  const toggleActive = async (record: User, isActive: boolean) => {
    try {
      await http.patch(`/users/${record.id}`, { isActive });
      message.success('已更新');
      fetchData();
    } catch (e: any) {
      message.error('更新失败');
    }
  };

  const resetPassword = async (record: User) => {
    openChangePassword(record);
  };

  const openChangePassword = (record: User) => {
    setCurrentUser(record);
    setPasswordModalOpen(true);
    passwordForm.resetFields();
  };

  const changePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }
      
      await http.patch(`/users/${currentUser!.id}`, { password: values.newPassword });
      message.success('密码修改成功');
      setPasswordModalOpen(false);
      setCurrentUser(null);
    } catch (e: any) {
      if (e.errorFields) return; // 表单验证错误
      message.error(e?.response?.data?.message || '修改密码失败');
    }
  };

  return (
    <div>
      <div className="page-header">用户管理</div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>新建用户</Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '启用', dataIndex: 'isActive', render: (_: any, r: User) => <Switch checked={r.isActive} onChange={(b) => toggleActive(r, b)} /> },
          { title: '操作', render: (_: any, r: User) => (
            <Space>
              <Button type="link" onClick={() => resetPassword(r)}>修改密码</Button>
            </Space>
          ) },
        ]}
      />

      <Modal open={open} title="新建用户" onOk={createUser} onCancel={() => setOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="isActive" label="启用" initialValue={true} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        open={passwordModalOpen} 
        title={`修改 ${currentUser?.username} 的密码`} 
        onOk={changePassword} 
        onCancel={() => { setPasswordModalOpen(false); setCurrentUser(null); }}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item 
            name="newPassword" 
            label="新密码" 
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item 
            name="confirmPassword" 
            label="确认密码" 
            rules={[{ required: true, message: '请确认新密码' }]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
