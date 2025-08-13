import { Button, Card, Form, Input, message } from 'antd';
import { useState } from 'react';
import http from '../api/http';

export default function LoginPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: any) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await http.post('/auth/login', values);
      const token = res.data.token;
      localStorage.setItem('token', token);
      message.success('登录成功');
      window.location.href = '/';
    } catch (e: any) {
      const status = e?.response?.status;
      const msg: string | undefined = e?.response?.data?.message;
      if (status === 401) {
        if (msg === 'Account disabled') message.error('该账户已被禁用');
        else message.error('账号或密码错误');
      } else {
        message.error(e?.response?.data?.message || '登录失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card title="登录" style={{ width: 360 }}>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting} disabled={submitting}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
