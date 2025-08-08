import { Alert, Button, Drawer, Form, Input, Modal, Select, Space, Table, Tag, message, DatePicker, Popconfirm, Tabs, Row, Col } from 'antd';
import { useEffect, useState } from 'react';
import http from '../../api/http';
import dayjs from 'dayjs';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface Client { id: string; name: string }
interface Visa { id?: string; country: string; visaName: string; expiryDate: string | any }
interface Passport {
  passportNo: string;
  clientId: string;
  country: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  issueDate: string;
  expiryDate: string;
  status?: string;
  client?: Client;
  visas?: Visa[];
}

export default function PassportList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Passport[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState('');
  const [clientId, setClientId] = useState<string | undefined>();
  const [days, setDays] = useState<number | undefined>();
  const [expired, setExpired] = useState<boolean | undefined>();

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Passport | null>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Passport | null>(null);
  const [form] = Form.useForm<Passport & { visas?: (Visa & { id?: string })[] }>();
  const [visasTouched, setVisasTouched] = useState(false);

  const [openVisa, setOpenVisa] = useState(false);
  const [visaForm] = Form.useForm<Visa>();

  const fetchClients = async () => {
    const res = await http.get('/clients');
    setClients(res.data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (q) params.q = q;
      if (clientId) params.clientId = clientId;
      if (days) params.days = days;
      if (expired) params.expired = true;
      const res = await http.get('/passports', { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { fetchData(); }, [q, clientId, days, expired]);

  const refreshDetail = async (passportNo: string) => {
    const res = await http.get(`/passports/${passportNo}`);
    setDetail(res.data);
  };

  const statusTag = (record: Passport) => {
    const d = dayjs(record.expiryDate);
    const diff = d.diff(dayjs(), 'day');
    if (diff <= 0) return <Tag color="red">已过期</Tag>;
    if (diff <= 15) return <Tag color="volcano">≤15天</Tag>;
    if (diff <= 30) return <Tag color="orange">≤30天</Tag>;
    if (diff <= 90) return <Tag color="gold">≤90天</Tag>;
    if (diff <= 180) return <Tag color="green">≤180天</Tag>;
    return <Tag>有效</Tag>;
  };

  const statusTagByDate = (dateStr: string) => {
    const d = dayjs(dateStr);
    const diff = d.diff(dayjs(), 'day');
    if (diff <= 0) return <Tag color="red">已过期</Tag>;
    if (diff <= 15) return <Tag color="volcano">≤15天</Tag>;
    if (diff <= 30) return <Tag color="orange">≤30天</Tag>;
    if (diff <= 90) return <Tag color="gold">≤90天</Tag>;
    if (diff <= 180) return <Tag color="green">≤180天</Tag>;
    return <Tag>有效</Tag>;
  };

  const onRowClick = (record: Passport) => {
    setOpen(true);
    refreshDetail(record.passportNo);
  };

  const onCreate = () => { setEditing(null); setVisasTouched(false); form.resetFields(); form.setFieldValue('visas', []); setOpenEdit(true); };
  const onEdit = async (record: Passport) => {
    // 先清空，避免上一次的签证信息残留
    form.resetFields();
    form.setFieldValue('visas', []);
    try {
      const res = await http.get(`/passports/${record.passportNo}`);
      const full = res.data as Passport;
      setEditing(full);
      setVisasTouched(false);
      form.setFieldsValue({
        ...full,
        dateOfBirth: dayjs(full.dateOfBirth),
        issueDate: dayjs(full.issueDate),
        expiryDate: dayjs(full.expiryDate),
        visas: (full.visas || []).map((v) => ({ id: (v as any).id, country: v.country, visaName: v.visaName, expiryDate: dayjs(v.expiryDate) })) as any,
      } as any);
      setOpenEdit(true);
    } catch (e) {
      message.error('加载详情失败');
    }
  };

  const onSubmit = async () => {
    const v: any = await form.validateFields();
    const payload = {
      passportNo: v.passportNo,
      clientId: v.clientId,
      country: v.country,
      fullName: v.fullName,
      gender: v.gender,
      dateOfBirth: v.dateOfBirth?.format('YYYY-MM-DD'),
      issueDate: v.issueDate?.format('YYYY-MM-DD'),
      expiryDate: v.expiryDate?.format('YYYY-MM-DD'),
    };
    // 判断护照是否真的发生变化，避免无效 PATCH 产生空变更日志
    const passportChanged = editing ? (
      editing.clientId !== payload.clientId ||
      editing.country !== payload.country ||
      editing.fullName !== payload.fullName ||
      editing.gender !== payload.gender ||
      dayjs(editing.dateOfBirth).format('YYYY-MM-DD') !== payload.dateOfBirth ||
      dayjs(editing.issueDate).format('YYYY-MM-DD') !== payload.issueDate ||
      dayjs(editing.expiryDate).format('YYYY-MM-DD') !== payload.expiryDate
    ) : true;
    // 仅在用户确实进入或修改过签证时处理签证增删改
    let visasToCreate: Visa[] = [];
    let visasToUpdate: any[] = [];
    let visasToDelete: string[] = [];
    if (editing && visasTouched) {
      const original = (editing.visas || []).map((vv: any) => ({
        id: vv.id as string,
        country: vv.country,
        visaName: vv.visaName,
        expiryDate: dayjs(vv.expiryDate).format('YYYY-MM-DD'),
      }));
      const submitted: any[] = (v.visas || [])
        .filter((x: any) => x && (x.id || x.country || x.visaName || x.expiryDate))
        .map((x: any) => ({
          id: x.id,
          country: x.country,
          visaName: x.visaName,
          expiryDate: x.expiryDate?.format ? x.expiryDate.format('YYYY-MM-DD') : x.expiryDate,
        }));

      const byId = new Map(original.map((o) => [o.id, o]));
      // 创建
      visasToCreate = submitted.filter((s) => !s.id && s.country && s.visaName && s.expiryDate);
      // 更新（只挑改动过的）
      visasToUpdate = submitted.filter((s) => {
        if (!s.id) return false;
        const o = byId.get(s.id);
        if (!o) return true; // 不在原列表，按更新处理
        return o.country !== s.country || o.visaName !== s.visaName || o.expiryDate !== s.expiryDate;
      });
      // 删除
      const submittedIds = new Set(submitted.filter((s) => !!s.id).map((s) => s.id as string));
      visasToDelete = original.filter((o) => !submittedIds.has(o.id)).map((o) => o.id);
    }

    try {
      if (editing) {
        if (passportChanged) {
          await http.patch(`/passports/${editing.passportNo}`, payload);
        }
        if (visasTouched) {
          if (visasToUpdate.length > 0) {
            await Promise.all(visasToUpdate.map((vz) => http.patch(`/visas/${vz.id}`, { country: vz.country, visaName: vz.visaName, expiryDate: vz.expiryDate })));
          }
          if (visasToCreate.length > 0) {
            await Promise.all(visasToCreate.map((vz) => http.post('/visas', { ...vz, passportNo: editing.passportNo })));
          }
          if (visasToDelete.length > 0) {
            await Promise.all(visasToDelete.map((id) => http.delete(`/visas/${id}`)));
          }
        }
      } else {
        await http.post('/passports', payload);
        if (visasToCreate.length > 0) {
          await Promise.all(visasToCreate.map(vz => http.post('/visas', { ...vz, passportNo: payload.passportNo })));
        }
      }
      message.success('保存成功');
      setOpenEdit(false);
      fetchData();
      if (editing) refreshDetail(editing.passportNo);
    } catch (e: any) {
      const resp = e?.response;
      if (resp?.status === 409 && resp.data?.code === 'PASSPORT_EXISTS') {
        const { passportNo, clientName } = resp.data;
        message.warning(`护照号 ${passportNo} 已在库中，所属客户：${clientName || '未知'}`);
        form.setFields([
          { name: 'passportNo', errors: [`护照号 ${passportNo} 已存在（所属：${clientName || '未知'}）`] },
        ]);
        try { (document.querySelector('input#passportNo') as any)?.focus?.(); } catch {}
      } else {
        message.error(resp?.data?.message || '保存失败');
      }
    }
  };

  const onRemove = async (record: Passport) => {
    try {
      await http.delete(`/passports/${record.passportNo}`);
      message.success('已删除');
      fetchData();
      if (detail?.passportNo === record.passportNo) setOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '删除失败');
    }
  };

  const addVisa = async () => {
    const v = await visaForm.validateFields();
    try {
      await http.post('/visas', { ...v, passportNo: detail!.passportNo, expiryDate: v.expiryDate as any ? (v.expiryDate as any).format('YYYY-MM-DD') : undefined });
      message.success('已新增签证');
      setOpenVisa(false);
      refreshDetail(detail!.passportNo);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '新增失败');
    }
  };

  const visaColumns = [
    { title: '国家', dataIndex: 'country' },
    { title: '签证名称', dataIndex: 'visaName' },
    { title: '到期日', dataIndex: 'expiryDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '状态', render: (_: any, r: Visa) => statusTagByDate(r.expiryDate as string) },
  ];

  const toolbar = (
    <Space wrap>
      <Input.Search placeholder="护照号/姓名" allowClear value={q} onChange={(e) => setQ(e.target.value)} onSearch={() => fetchData()} style={{ width: 220 }} />
      <Select
        placeholder="选择客户"
        allowClear
        style={{ width: 180 }}
        value={clientId}
        options={clients.map(c => ({ label: c.name, value: c.id }))}
        onChange={setClientId}
      />
      <Space>
        <Button type={days === 15 ? 'primary' : 'default'} onClick={() => { setDays(15); setExpired(false); }}>≤15天</Button>
        <Button type={days === 30 ? 'primary' : 'default'} onClick={() => { setDays(30); setExpired(false); }}>≤30天</Button>
        <Button type={days === 90 ? 'primary' : 'default'} onClick={() => { setDays(90); setExpired(false); }}>≤90天</Button>
        <Button type={days === 180 ? 'primary' : 'default'} onClick={() => { setDays(180); setExpired(false); }}>≤180天</Button>
        <Button danger type={expired ? 'primary' : 'default'} onClick={() => { setExpired(true); setDays(undefined); }}>已过期</Button>
        <Button onClick={() => { setQ(''); setClientId(undefined); setDays(undefined); setExpired(undefined); }}>重置</Button>
      </Space>
      <Button type="primary" onClick={onCreate}>新建护照</Button>
    </Space>
  );

  return (
    <div>
      <div className="page-header">护照管理</div>
      <div style={{ marginBottom: 12 }}>{toolbar}</div>
      <Table
        rowKey="passportNo"
        loading={loading}
        dataSource={data}
        onRow={(record) => ({ onClick: () => onRowClick(record) })}
        columns={[
          { title: '护照号', dataIndex: 'passportNo' },
          { title: '客户', dataIndex: ['client','name'], render: (_: any, r: Passport) => r.client?.name },
          { title: '国家', dataIndex: 'country' },
          { title: '姓名', dataIndex: 'fullName' },
          { title: '签发日', dataIndex: 'issueDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
          { title: '到期日', dataIndex: 'expiryDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
          { title: '状态', render: (_: any, r: Passport) => statusTag(r) },
          { 
            title: '操作',
            onCell: () => ({ onClick: (e: any) => e.stopPropagation() }),
            render: (_: any, r: Passport) => (
              <Space>
                <Button type="link" onClick={(e) => { e.stopPropagation(); onEdit(r); }}>编辑</Button>
                <Popconfirm
                  title={`删除护照 ${r.passportNo}？`}
                  onConfirm={(e) => { (e as any)?.stopPropagation?.(); onRemove(r); }}
                  onCancel={(e) => (e as any)?.stopPropagation?.()}
                >
                  <Button type="link" danger onClick={(e) => e.stopPropagation()}>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer width={640} open={open} onClose={() => setOpen(false)} title={`护照详情 ${detail?.passportNo ?? ''}`}> 
        {detail ? (
          <div>
            <Alert type="info" showIcon message={`客户：${detail.client?.name ?? ''} | 姓名：${detail.fullName} | 国家：${detail.country}`} style={{ marginBottom: 12 }} />
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div className="page-header">签证</div>
                <div style={{ marginBottom: 8 }}>
                  <Button type="primary" onClick={() => { visaForm.resetFields(); setOpenVisa(true); }}>新增签证</Button>
                </div>
                <Table rowKey="id" dataSource={detail.visas || []} columns={visaColumns} pagination={{ pageSize: 5 }} />
              </div>
            </Space>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={openEdit}
        width={720}
        title={editing ? '编辑护照' : '新建护照'}
        onOk={onSubmit}
        onCancel={() => { setOpenEdit(false); form.resetFields(); form.setFieldValue('visas', []); setEditing(null); }}
        destroyOnHidden
        forceRender
      >
        <Tabs
          defaultActiveKey="base"
          items={[
            {
              key: 'base',
              label: '基本信息',
              children: (
                <Form form={form} layout="vertical" labelCol={{ span: 6 }}>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="passportNo" label="护照号码" rules={[{ required: true, message: '请输入护照号码' }]}> 
                        <Input autoFocus id="passportNo" disabled={!!editing} placeholder="唯一护照号" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="clientId" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
                        <Select options={clients.map(c => ({ label: c.name, value: c.id }))} placeholder="选择客户" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="country" label="国家代码" rules={[{ required: true, message: '请输入国家代码' }]}>
                        <Input placeholder="如 CN/US" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="fullName" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
                        <Select
                          options={[
                            { label: 'male', value: 'male' },
                            { label: 'female', value: 'female' },
                            { label: 'other', value: 'other' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="dateOfBirth" label="出生日期" rules={[{ required: true, message: '请选择出生日期' }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="issueDate" label="签发日期" rules={[{ required: true, message: '请选择签发日期' }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="expiryDate" label="到期日期" rules={[{ required: true, message: '请选择到期日期' }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              ),
            },
            {
              key: 'visas',
              label: '签证（可选）',
              children: (
                <Form form={form} layout="vertical" onValuesChange={(changed) => { if ('visas' in changed) setVisasTouched(true); }}>
                  <Form.List name="visas">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map((field) => (
                          <Row key={field.key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                            <Col span={6}>
                              <Form.Item name={[field.name, 'country']} fieldKey={[field.fieldKey!, 'country']} rules={[{ required: true, message: '国家' }]}>
                                <Input placeholder="国家代码" />
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item name={[field.name, 'visaName']} fieldKey={[field.fieldKey!, 'visaName']} rules={[{ required: true, message: '签证名称' }]}>
                                <Input placeholder="签证名称" />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item name={[field.name, 'expiryDate']} fieldKey={[field.fieldKey!, 'expiryDate']} rules={[{ required: true, message: '到期日' }]}>
                                <DatePicker style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={2}>
                              <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                            </Col>
                          </Row>
                        ))}
                        <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>
                          新增一条签证
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Form>
              ),
            },
          ]}
        />
      </Modal>

      <Modal open={openVisa} title="新增签证" onOk={addVisa} onCancel={() => setOpenVisa(false)} destroyOnHidden>
        <Form form={visaForm} layout="vertical">
          <Form.Item name="country" label="国家代码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="visaName" label="签证名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expiryDate" label="到期日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
