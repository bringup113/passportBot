import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Space, Switch, Typography, message, Divider, Table, Modal, Popconfirm, Tag } from 'antd';
import http from '../../api/http';

type NotifySetting = {
  id: string;
  enabled: boolean;
  channel: string;
  telegramBotToken?: string | null;
  threshold15: boolean;
  threshold30: boolean;
  threshold90: boolean;
  threshold180: boolean;
  updatedAt: string;
};

type Whitelist = {
  id: string;
  chatId: string;
  displayName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function NotifySettingPage() {
  const [form] = Form.useForm<NotifySetting>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setting, setSetting] = useState<NotifySetting | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [whitelist, setWhitelist] = useState<Whitelist[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Whitelist | null>(null);

  const fetchSetting = async () => {
    setLoading(true);
    try {
      const res = await http.get('/notify/setting');
      setSetting(res.data);
      form.setFieldsValue(res.data);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '加载通知设置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchWhitelist = async () => {
    setListLoading(true);
    try {
      const res = await http.get('/notify/whitelist');
      setWhitelist(res.data);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '加载白名单失败');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchSetting();
    fetchWhitelist();
  }, []);

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      await http.patch('/notify/setting', values);
      message.success('保存成功');
      fetchSetting();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Chat ID', dataIndex: 'chatId', key: 'chatId' },
    { title: '显示名', dataIndex: 'displayName', key: 'displayName', render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean, record: Whitelist) => (
        <Switch
          checked={v}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={async (checked) => {
            try {
              await http.patch(`/notify/whitelist/${record.id}`, { isActive: checked });
              setWhitelist((prev) => prev.map((w) => (w.id === record.id ? { ...w, isActive: checked } : w)));
            } catch (e: any) {
              message.error(e?.response?.data?.message || '更新失败');
            }
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Whitelist) => (
        <Space size="small">
          <Button size="small" onClick={() => setEditOpen(record)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除白名单 ${record.chatId}？`}
            okText="删除"
            cancelText="取消"
            onConfirm={async () => {
              try {
                await http.delete(`/notify/whitelist/${record.id}`);
                setWhitelist((prev) => prev.filter((w) => w.id !== record.id));
                message.success('已删除');
              } catch (e: any) {
                message.error(e?.response?.data?.message || '删除失败');
              }
            }}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="通知设置" loading={loading}>
        <Form form={form} layout="vertical" onFinish={onSave} initialValues={{ enabled: false, channel: 'telegram' }}>
          <Space size={16} wrap>
            <Form.Item name="enabled" label="开启通知" valuePropName="checked">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item name="telegramBotToken" label="Telegram Bot Token" style={{ minWidth: 360 }}>
              <Input.Password
                placeholder="请输入 Telegram Bot Token"
                autoComplete="off"
                addonAfter={
                  <Space size="small">
                    <Button
                      size="small"
                      onClick={async () => {
                        try {
                          const token = form.getFieldValue('telegramBotToken');
                          if (!token) return message.warning('请先填写 Bot Token');
                          const res = await http.post('/notify/test-bot', { token });
                          const d = res?.data;
                          if (typeof d?.sent === 'number') {
                            if (d.failed > 0) message.warning(`已发送${d.sent}条，失败${d.failed}条`);
                            else message.success(`已发送${d.sent}条，全部成功`);
                          } else if (d?.message) {
                            if (d.ok) message.success(d.message);
                            else message.warning(d.message);
                          } else {
                            message.success('测试完成');
                          }
                        } catch (e: any) {
                          message.error(e?.response?.data?.message || '测试失败');
                        }
                      }}
                    >
                      测试
                    </Button>
                    <Button
                      size="small"
                      onClick={async () => {
                        try {
                          const res = await http.post('/notify/run-now');
                          message.success(`已触发通知：护照${res?.data?.passportsDue ?? 0}，签证${res?.data?.visasDue ?? 0}`);
                        } catch (e: any) {
                          message.error(e?.response?.data?.message || '触发失败');
                        }
                      }}
                    >
                      立即通知
                    </Button>
                  </Space>
                }
              />
            </Form.Item>
          </Space>
          <Divider style={{ margin: '12px 0' }} />
          <Typography.Text strong>到期提醒阈值</Typography.Text>
          <Space size={16} style={{ display: 'block', marginTop: 8 }}>
            <Space size={24} wrap>
              <Form.Item name="threshold15" valuePropName="checked">
                <Switch checkedChildren="15天" unCheckedChildren="15天" />
              </Form.Item>
              <Form.Item name="threshold30" valuePropName="checked">
                <Switch checkedChildren="30天" unCheckedChildren="30天" />
              </Form.Item>
              <Form.Item name="threshold90" valuePropName="checked">
                <Switch checkedChildren="90天" unCheckedChildren="90天" />
              </Form.Item>
              <Form.Item name="threshold180" valuePropName="checked">
                <Switch checkedChildren="180天" unCheckedChildren="180天" />
              </Form.Item>
            </Space>
          </Space>
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={saving} disabled={saving}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="Telegram 白名单"
        extra={
          <Space>
            <Button onClick={async () => {
              try {
                const token = form.getFieldValue('telegramBotToken');
                const res = await http.post('/notify/whitelist/sync', { token });
                message.success(`已同步，新增${res?.data?.created || 0}条`);
                fetchWhitelist();
              } catch (e: any) {
                message.error(e?.response?.data?.message || '同步失败');
              }
            }}>从机器人同步</Button>
            <Button type="primary" onClick={() => setAddOpen(true)}>
              新增
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={listLoading}
          dataSource={whitelist}
          columns={columns as any}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新增白名单 */}
      <Modal
        title="新增白名单"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={async () => {
          const values = await addForm.validateFields();
          try {
            const res = await http.post('/notify/whitelist', values);
            setWhitelist((prev) => [res.data, ...prev]);
            setAddOpen(false);
            addForm.resetFields();
            message.success('新增成功');
          } catch (e: any) {
            message.error(e?.response?.data?.message || '新增失败');
          }
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <AddEditForm mode="add" />
      </Modal>

      {/* 编辑白名单 */}
      <Modal
        title="编辑白名单"
        open={!!editOpen}
        onCancel={() => setEditOpen(null)}
        onOk={async () => {
          if (!editOpen) return;
          const values = await editForm.validateFields();
          try {
            const res = await http.patch(`/notify/whitelist/${editOpen.id}`, values);
            setWhitelist((prev) => prev.map((w) => (w.id === editOpen.id ? { ...w, ...values } : w)));
            setEditOpen(null);
            editForm.resetFields();
            message.success('保存成功');
          } catch (e: any) {
            message.error(e?.response?.data?.message || '保存失败');
          }
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <AddEditForm mode="edit" data={editOpen || undefined} />
      </Modal>
    </Space>
  );

  // 内部表单（新增/编辑）
  function AddEditForm({ mode, data }: { mode: 'add' | 'edit'; data?: Whitelist }) {
    const [formInstance] = Form.useForm();
    useEffect(() => {
      if (mode === 'edit' && data) {
        formInstance.setFieldsValue({ displayName: data.displayName || '', isActive: data.isActive });
      } else {
        formInstance.resetFields();
      }
      if (mode === 'add') formInstance.setFieldsValue({ isActive: true });
      if (mode === 'add') addForm = formInstance; else editForm = formInstance;
    }, [mode, data]);

    return (
      <Form form={formInstance} layout="vertical">
        {mode === 'add' && (
          <Form.Item name="chatId" label="Chat ID" rules={[{ required: true, message: '请输入 Chat ID' }]}> 
            <Input placeholder="Telegram 用户 chat_id" />
          </Form.Item>
        )}
        <Form.Item name="displayName" label="显示名">
          <Input placeholder="例如 张三" />
        </Form.Item>
        <Form.Item name="isActive" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    );
  }

  // 供 Modal 使用的表单实例容器
  // 注意：这样避免在 Modal 外层维护过多状态
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var addForm: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var editForm: any;
}


