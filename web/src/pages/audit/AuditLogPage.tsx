import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography, Tabs, Descriptions, Empty, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import http from '../../api/http';
import dayjs from 'dayjs';

type Audit = {
  id: string;
  user?: { id: string; username: string } | null;
  action: string;
  entity: string;
  entityId: string;
  diffJson?: any;
  ip?: string;
  createdAt: string;
};

export default function AuditLogPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Audit[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Audit | null>(null);

  const actionMap = useMemo(() => ({ create: '新增', update: '更新', delete: '删除' }), []);
  const entityMap = useMemo(() => ({ USER: '用户', CLIENT: '客户', PASSPORT: '护照', VISA: '签证', NOTIFY: '通知' }), []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params: any = {};
      if (values.entity) params.entity = values.entity;
      if (values.entityId) params.entityId = values.entityId.trim();
      if (values.range && values.range.length === 2) {
        params.from = values.range[0].toISOString();
        params.to = values.range[1].toISOString();
      }
      const res = await http.get('/audit', { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({ range: [dayjs().startOf('day'), dayjs().endOf('day')] });
    fetchData();
  }, []);

  // 后端已直接把 entityId 写成人类可读名称，这里不再额外映射
  function getEntityDisplay(r: Audit) { return r.entityId; }

  const columns = [
    { title: '时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    { title: '用户', dataIndex: ['user','username'], render: (_: any, r: Audit) => r.user?.username || '-' },
    { title: '动作', dataIndex: 'action', render: (v: string) => <Tag color={v==='create'?'green':v==='update'?'blue':'red'}>{actionMap[v as keyof typeof actionMap] || v}</Tag> },
    { title: '实体', dataIndex: 'entity', render: (v: string) => entityMap[v as keyof typeof entityMap] || v },
    { title: '对象', dataIndex: 'entityId', render: (_: any, r: Audit) => getEntityDisplay(r) },
    {
      title: '详情',
      render: (_: any, r: Audit) => (
        <Button size="small" onClick={() => { setDetail(r); setDetailOpen(true); }}>查看</Button>
      )
    }
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Form form={form} layout="inline" onFinish={fetchData}>
          <Form.Item name="entity" label="实体">
            <Select allowClear style={{ width: 160 }} options={[
              { value: 'USER', label: 'USER' },
              { value: 'CLIENT', label: 'CLIENT' },
              { value: 'PASSPORT', label: 'PASSPORT' },
              { value: 'VISA', label: 'VISA' },
              { value: 'NOTIFY', label: 'NOTIFY' },
            ]} />
          </Form.Item>
          <Form.Item name="entityId" label="实体ID">
            <Input placeholder="按实体ID过滤" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="range" label="时间范围">
            <DatePicker.RangePicker showTime allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>查询</Button>
              <Button onClick={() => { form.resetFields(); }}>重置</Button>
              <Dropdown
                placement="bottom"
                menu={{
                  items: [
                    { key: '90', label: '清空三个月前的日志' },
                    { key: '30', label: '清空一个月前的日志' },
                  ],
                  onClick: async (info) => {
                    const days = Number(info.key);
                    Modal.confirm({
                      title: info.key === '90' ? '确认清空三个月前的日志？' : '确认清空一个月前的日志？',
                      onOk: async () => {
                        try {
                          const res = await http.post('/audit/cleanup', { days });
                          Modal.success({ title: '清理完成', content: `已删除 ${res?.data?.deleted || 0} 条日志` });
                          fetchData();
                        } catch (e: any) {
                          Modal.error({ title: '清理失败', content: e?.response?.data?.message || '请稍后再试' });
                        }
                      },
                    });
                  },
                } as MenuProps}
              >
                <Button danger>清空日志</Button>
              </Dropdown>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Card>
        <Table rowKey="id" loading={loading} dataSource={data} columns={columns as any} pagination={{ pageSize: 20 }} />
      </Card>
      <Modal
        title={
          <Space size={12} align="center">
            <Typography.Text strong>操作详情</Typography.Text>
            {detail ? (
              <Tag color={detail.action==='create'?'green':detail.action==='update'?'blue':'red'}>
                {actionMap[detail.action as keyof typeof actionMap] || detail.action}
              </Tag>
            ) : null}
          </Space>
        }
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetail(null); }}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        width={860}
        destroyOnClose
      >
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2} items={[
              { key: 'time', label: '时间', children: dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss') },
              { key: 'user', label: '用户', children: detail.user?.username || '-' },
              { key: 'entity', label: '实体', children: entityMap[detail.entity as keyof typeof entityMap] || detail.entity },
              { key: 'target', label: '对象', children: detail.entityId },
            ]} />

            <Tabs
              defaultActiveKey={detail.diffJson?.changes ? 'changes' : detail.diffJson?.after ? 'after' : detail.diffJson?.before ? 'before' : 'raw'}
              items={[
                {
                  key: 'changes',
                  label: '字段变更',
                  children: detail.diffJson?.changes ? (
                    <Table
                      size="small"
                      bordered
                      pagination={false}
                      rowKey={(r) => r.field}
                      dataSource={Object.entries(detail.diffJson.changes).map(([field, v]: any) => ({ field, from: v.from, to: v.to }))}
                      columns={[
                        { title: '字段', dataIndex: 'field', width: 200, render: (f: string) => <Typography.Text>{(fieldMap(detail.entity) as any)[f] || f}</Typography.Text> },
                        { title: '原值', dataIndex: 'from', render: (v) => <Typography.Text code>{formatVal(v)}</Typography.Text> },
                        { title: '新值', dataIndex: 'to', render: (v) => <Typography.Text code>{formatVal(v)}</Typography.Text> },
                      ]}
                    />
                  ) : <Empty description="无字段变更" />,
                },
                {
                  key: 'after',
                  label: '创建内容',
                  children: detail.diffJson?.after ? renderFieldList(detail.entity, detail.diffJson.after) : <Empty description="无创建内容" />,
                },
                {
                  key: 'before',
                  label: '删除前内容',
                  children: detail.diffJson?.before ? renderFieldList(detail.entity, detail.diffJson.before) : <Empty description="无删除前内容" />,
                },
                {
                  key: 'raw',
                  label: '原始JSON',
                  children: (
                    <pre style={{ background:'#fafafa', padding:12, border:'1px solid #f0f0f0', borderRadius:6, maxHeight: 360, overflow: 'auto' }}>
{JSON.stringify(detail.diffJson ?? {}, null, 2)}
                    </pre>
                  ),
                },
              ]}
            />
          </Space>
        ) : null}
      </Modal>
    </Space>
  );

  function formatVal(v: any) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    try { return JSON.stringify(v); } catch { return String(v); }
  }

  function formatJson(entity: string, obj: any) {
    const mapAll: Record<string, Record<string, string>> = {
      USER: { username: '用户名', isActive: '启用状态', id: 'ID' },
      CLIENT: { name: '名称', remark: '备注', id: 'ID' },
      PASSPORT: {
        passportNo: '护照号码', clientId: '客户', country: '国家', fullName: '姓名', gender: '性别',
        dateOfBirth: '出生日期', issueDate: '签发日期', expiryDate: '到期日期', inStock: '在库', isFollowing: '关注', status: '状态', id: 'ID'
      },
      VISA: { country: '国家', visaName: '签证名称', expiryDate: '到期日期', status: '状态', id: 'ID' },
      NOTIFY: {
        enabled: '开启通知', telegramBotToken: 'Bot Token', threshold15: '15天阈值', threshold30: '30天阈值', threshold90: '90天阈值', threshold180: '180天阈值',
        chatId: 'Chat ID', displayName: '显示名', isActive: '启用状态', id: 'ID'
      },
    };
    const map = mapAll[entity] || {};
    const entries = Object.entries(obj || {});
    return entries.length ? (
      <Descriptions bordered size="small" column={1} items={entries.map(([k, v]) => ({ key: k, label: map[k] || k, children: <Typography.Text code>{formatValForField(entity, k, v)}</Typography.Text> }))} />
    ) : (
      <span>-</span>
    );
  }

  function renderFieldList(entity: string, obj: any) {
    return (
      <div style={{ marginTop: 4 }}>
        {formatJson(entity, obj)}
      </div>
    );
  }

  function formatValForField(_entity: string, key: string, v: any) {
    // 特定字段格式
    if (typeof v === 'boolean') return v ? '是' : '否';
    if (key.toLowerCase().includes('date')) return v ? dayjs(v).format('YYYY-MM-DD') : '';
    if (key.toLowerCase().includes('at')) return v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '';
    return formatVal(v);
  }

  function fieldMap(entity: string) {
    const dict: Record<string, Record<string, string>> = {
      USER: { username: '用户名', isActive: '启用状态', id: 'ID' },
      CLIENT: { name: '名称', remark: '备注', id: 'ID' },
      PASSPORT: {
        passportNo: '护照号码', clientId: '客户', country: '国家', fullName: '姓名', gender: '性别',
        dateOfBirth: '出生日期', issueDate: '签发日期', expiryDate: '到期日期', inStock: '在库', isFollowing: '关注', status: '状态', id: 'ID'
      },
      VISA: { country: '国家', visaName: '签证名称', expiryDate: '到期日期', status: '状态', id: 'ID' },
      NOTIFY: {
        enabled: '开启通知', telegramBotToken: 'Bot Token', threshold15: '15天阈值', threshold30: '30天阈值', threshold90: '90天阈值', threshold180: '180天阈值',
        chatId: 'Chat ID', displayName: '显示名', isActive: '启用状态', id: 'ID'
      },
    };
    return dict[entity] || {};
  }
}


