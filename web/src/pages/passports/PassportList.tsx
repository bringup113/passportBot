import { Alert, Button, Drawer, Form, Input, Modal, Select, Space, Table, Tag, message, DatePicker, Popconfirm, Tabs, Row, Col, Switch, Radio } from 'antd';
import { useEffect, useState } from 'react';
import http from '../../api/http';
import dayjs from 'dayjs';
import { PlusOutlined, DeleteOutlined, ScanOutlined } from '@ant-design/icons';
import parseMRZ from 'mrz/lib/parse/parse';

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
  inStock?: boolean;
  isFollowing?: boolean;
  remark?: string | null;
  mrzCode?: string | null;
}

export default function PassportList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Passport[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState('');
  const [clientId, setClientId] = useState<string | undefined>();
  const [days, setDays] = useState<number | undefined>();
  const [expired, setExpired] = useState<boolean | undefined>();

  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Passport | null>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Passport | null>(null);
  const [form] = Form.useForm<Passport & { visas?: (Visa & { id?: string })[] }>();
  const [visasTouched, setVisasTouched] = useState(false);

  const [openVisa, setOpenVisa] = useState(false);
  const [visaForm] = Form.useForm<Visa>();
  
  // MRZ验证状态
  const [mrzError, setMrzError] = useState<string | null>(null);
  const [mrzValid, setMrzValid] = useState(false);

  const fetchClients = async () => {
    const res = await http.get('/clients');
    setClients(res.data);
  };

  // MRZ验证和自动填充函数
  const validateAndFillMrz = (mrzText: string) => {
    try {
      // 清理MRZ文本，移除首尾空格
      const cleanMrz = mrzText.trim();
      
      let lines: string[] = [];
      
      // 如果输入包含换行符，按换行符分割
      if (cleanMrz.includes('\n')) {
        lines = cleanMrz.split('\n').filter(line => line.trim().length > 0);
      } else {
        // 如果没有换行符，尝试按TD3格式自动分割（每行44个字符）
        if (cleanMrz.length >= 88) { // TD3格式总长度通常是88个字符
          lines = [
            cleanMrz.substring(0, 44), // 第一行：44个字符
            cleanMrz.substring(44, 88) // 第二行：44个字符
          ];
        } else if (cleanMrz.length >= 44) {
          // 如果长度不够88个字符，尝试分割成两行
          const midPoint = Math.ceil(cleanMrz.length / 2);
          lines = [
            cleanMrz.substring(0, midPoint),
            cleanMrz.substring(midPoint)
          ];
        }
      }
      
      if (lines.length < 2) {
        setMrzValid(false);
        setMrzError('MRZ码需要至少两行');
        return;
      }

      const result = parseMRZ(lines);
      
      if (result && result.valid) {
        const fields = result.fields;
        
        // 自动填充表单
        let issueDate = undefined;
        
        // 如果MRZ中有签发日期，使用MRZ中的签发日期
        if (fields.issueDate) {
          issueDate = dayjs(fields.issueDate, 'YYMMDD');
        } else if (fields.expirationDate) {
          // 如果MRZ中没有签发日期，但有到期日期，则计算签发日期
          // 签发日期 = 到期日期的年份减10年，然后整个日期再加1天
          const expiryDate = dayjs(fields.expirationDate, 'YYMMDD');
          issueDate = expiryDate.subtract(10, 'year').add(1, 'day');
        }
        
        // 处理性别字段 - MRZ库返回的是小写的性别值
        let genderValue = 'other';
        if (fields.sex) {
          const sexStr = String(fields.sex).toLowerCase();
          if (sexStr === 'male' || sexStr === 'm' || sexStr === '1') {
            genderValue = 'male';
          } else if (sexStr === 'female' || sexStr === 'f' || sexStr === '2') {
            genderValue = 'female';
          } else if (sexStr === 'x' || sexStr === 'unspecified' || sexStr === '0' || sexStr === 'unknown') {
            genderValue = 'other';
          }
        }
        
        form.setFieldsValue({
          passportNo: fields.documentNumber || '',
          fullName: fields.firstName && fields.lastName ? `${fields.firstName} ${fields.lastName}`.trim() : '',
          country: fields.issuingState || '',
          gender: genderValue,
          dateOfBirth: fields.birthDate ? dayjs(fields.birthDate, 'YYMMDD') : undefined,
          issueDate: issueDate,
          expiryDate: fields.expirationDate ? dayjs(fields.expirationDate, 'YYMMDD') : undefined,
        } as any);
        
        setMrzValid(true);
        setMrzError(null);
        message.success('MRZ码验证成功，已自动填充表单');
      } else {
        setMrzValid(false);
        setMrzError('MRZ码格式错误');
        message.error('MRZ码格式错误');
      }
    } catch (error) {
      setMrzValid(false);
      setMrzError('MRZ码解析失败');
      message.error('MRZ码解析失败');
    }
  };

  // 处理MRZ码输入变化
  const handleMrzChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length >= 44) { // TD3格式的MRZ码通常是44个字符
      validateAndFillMrz(value);
    } else {
      setMrzValid(false);
      setMrzError(null);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (q) params.q = q;
      if (clientId) params.clientId = clientId;
      if (days) params.days = days;
      if (expired) params.expired = true;
      params.page = pagination.current;
      params.pageSize = pagination.pageSize;
      const res = await http.get('/passports', { params });
      setData(res.data.data);
      setPagination(prev => ({ ...prev, total: res.data.total, totalPages: res.data.totalPages }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { fetchData(); }, [q, clientId, days, expired, pagination.current, pagination.pageSize]);

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

  const onCreate = () => {
    setEditing(null);
    setVisasTouched(false);
    form.resetFields();
    // 设置新建护照的默认值
    form.setFieldsValue({ 
      inStock: true, 
      isFollowing: false, 
      remark: '',
      mrzCode: '',
      visas: [] // 确保签证数组为空
    });
    // 重置MRZ验证状态
    setMrzValid(false);
    setMrzError(null);
    setOpenEdit(true);
  };
  const onEdit = async (record: Passport) => {
    // 先清空，避免上一次的签证信息残留
    form.resetFields();
    try {
      const res = await http.get(`/passports/${record.passportNo}`);
      const full = res.data as Passport;
      setEditing(full);
      setVisasTouched(false);
      
      // 填充表单数据，包括签证信息
      form.setFieldsValue({
        ...full,
        dateOfBirth: dayjs(full.dateOfBirth),
        issueDate: dayjs(full.issueDate),
        expiryDate: dayjs(full.expiryDate),
        // 处理签证信息，确保日期格式正确
        visas: (full.visas || []).map((v) => ({ 
          id: (v as any).id, 
          country: v.country, 
          visaName: v.visaName, 
          expiryDate: dayjs(v.expiryDate) 
        })) as any,
        inStock: full.inStock ?? true,
        isFollowing: full.isFollowing ?? false,
        remark: full.remark ?? '',
        mrzCode: full.mrzCode ?? '',
      } as any);
      
      // 重置MRZ验证状态
      setMrzValid(false);
      setMrzError(null);
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
      mrzCode: v.mrzCode,
      inStock: v.inStock,
      isFollowing: v.isFollowing,
      remark: v.remark,
    };
    // 判断护照是否真的发生变化，避免无效 PATCH 产生空变更日志
    const passportChanged = editing ? (
      editing.clientId !== payload.clientId ||
      editing.country !== payload.country ||
      editing.fullName !== payload.fullName ||
      editing.gender !== payload.gender ||
      dayjs(editing.dateOfBirth).format('YYYY-MM-DD') !== payload.dateOfBirth ||
      dayjs(editing.issueDate).format('YYYY-MM-DD') !== payload.issueDate ||
      dayjs(editing.expiryDate).format('YYYY-MM-DD') !== payload.expiryDate ||
      editing.mrzCode !== payload.mrzCode ||
      editing.inStock !== payload.inStock ||
      editing.isFollowing !== payload.isFollowing ||
      editing.remark !== payload.remark
    ) : true;
    // 处理签证信息
    let visasToCreate: Visa[] = [];
    let visasToUpdate: any[] = [];
    let visasToDelete: string[] = [];
    
    // 过滤并格式化提交的签证数据
    const submitted: any[] = (v.visas || [])
      .filter((x: any) => x && (x.id || x.country || x.visaName || x.expiryDate))
      .map((x: any) => ({
        id: x.id,
        country: x.country,
        visaName: x.visaName,
        expiryDate: x.expiryDate?.format ? x.expiryDate.format('YYYY-MM-DD') : x.expiryDate,
      }));

    if (editing) {
      // 编辑模式：仅在用户确实修改过签证时处理签证增删改
      if (visasTouched) {
        const original = (editing.visas || []).map((vv: any) => ({
          id: vv.id as string,
          country: vv.country,
          visaName: vv.visaName,
          expiryDate: dayjs(vv.expiryDate).format('YYYY-MM-DD'),
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
    } else {
      // 新建模式：处理所有提交的签证数据
      visasToCreate = submitted.filter((s) => s.country && s.visaName && s.expiryDate);
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
        onChange={handleTableChange}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          size: 'default',
          showLessItems: false,
          hideOnSinglePage: false,
          locale: {
            items_per_page: '条/页',
            jump_to: '跳至',
            jump_to_confirm: '确定',
            page: '页',
            prev_page: '上一页',
            next_page: '下一页'
          }
        }}
        columns={[
          { title: '护照号', dataIndex: 'passportNo' },
          { title: '客户', dataIndex: ['client','name'], render: (_: any, r: Passport) => r.client?.name },
          { title: '国家', dataIndex: 'country' },
          { title: '姓名', dataIndex: 'fullName' },
              { title: '在库', dataIndex: 'inStock', render: (_: any, r: Passport) => (
                <Switch
                  checked={r.inStock ?? true}
                  checkedChildren="在库"
                  unCheckedChildren="不在库"
                  onClick={(_, e) => e?.stopPropagation?.()}
                  onChange={async (checked) => {
                    if (!checked) {
                      let remarkVal = r.remark || '';
                      Modal.confirm({
                        title: `设置为不在库：${r.passportNo}`,
                        content: (
                          <div>
                            <div style={{ marginBottom: 8 }}>请填写备注（必填）：</div>
                            <Input.TextArea defaultValue={remarkVal} rows={3} onChange={(e) => { remarkVal = e.target.value; }} />
                          </div>
                        ),
                        okText: '确定',
                        cancelText: '取消',
                        onOk: async () => {
                          if (!remarkVal || !remarkVal.trim()) {
                            message.warning('备注不能为空');
                            throw new Error('no remark');
                          }
                          await http.patch(`/passports/${r.passportNo}`, { inStock: false, remark: remarkVal.trim() });
                          fetchData();
                        },
                        onCancel: () => fetchData(),
                      });
                    } else {
                      await http.patch(`/passports/${r.passportNo}`, { inStock: true });
                      fetchData();
                    }
                  }}
                />
              ) },
              { title: '关注', dataIndex: 'isFollowing', render: (_: any, r: Passport) => (
                <Switch
                  checked={r.isFollowing ?? false}
                  checkedChildren="关注"
                  unCheckedChildren="不关注"
                  onClick={(_, e) => e?.stopPropagation?.()}
                  onChange={async (checked) => { await http.patch(`/passports/${r.passportNo}`, { isFollowing: checked }); fetchData(); }}
                />
              ) },
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
        width={1200}
        title={editing ? '编辑护照' : '新建护照'}
        onOk={onSubmit}
        onCancel={() => { 
          setOpenEdit(false); 
          form.resetFields(); 
          setEditing(null); 
        }}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }} onValuesChange={(changed) => { if ('visas' in changed) setVisasTouched(true); }}>
          <Row gutter={24}>
            {/* 左侧：护照基本信息 */}
            <Col span={14}>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: '#1890ff' }}>护照基本信息</div>
              
              {/* 第一行和第二行：MRZ码（左侧）+ 客户、护照号码（右侧） */}
              <Row gutter={12}>
                {/* 左侧：MRZ码，横跨两行，宽度更大 */}
                <Col span={18}>
                  <Form.Item 
                    name="mrzCode" 
                    label={
                      <span>
                        MRZ码
                        <Button 
                          type="link" 
                          icon={<ScanOutlined />} 
                          size="small" 
                          style={{ marginLeft: 8 }}
                          title="点击扫码或手动输入MRZ码"
                        >
                          扫码
                        </Button>
                      </span>
                    }
                    validateStatus={mrzError ? 'error' : mrzValid ? 'success' : undefined}
                    help={mrzError}
                  >
                    <Input.TextArea 
                      rows={6} 
                      placeholder="MRZ码（两行，非必填）" 
                      onChange={handleMrzChange}
                      style={{ 
                        borderColor: mrzError ? '#ff4d4f' : mrzValid ? '#52c41a' : undefined 
                      }}
                    />
                  </Form.Item>
                  {mrzValid && (
                    <div style={{ color: '#52c41a', fontSize: '12px', marginTop: '4px' }}>
                      ✓ MRZ码验证成功
                    </div>
                  )}
                </Col>
                
                {/* 右侧：第一行 - 客户 */}
                <Col span={6}>
                  <Row gutter={12}>
                    <Col span={24}>
                      <Form.Item name="clientId" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
                        <Select options={clients.map(c => ({ label: c.name, value: c.id }))} placeholder="选择客户" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  {/* 第二行 - 护照号码 */}
                  <Row gutter={12}>
                    <Col span={24}>
                      <Form.Item name="passportNo" label="护照号码" rules={[{ required: true, message: '请输入护照号码' }]}> 
                        <Input autoFocus id="passportNo" disabled={!!editing} placeholder="唯一护照号" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* 新增的第三行：姓名 + 国籍 */}
              <Row gutter={12}>
                <Col span={18}>
                  <Form.Item name="fullName" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="country" label="国籍" rules={[{ required: true, message: '请输入国籍' }]}>
                    <Input placeholder="如 CN/US" />
                  </Form.Item>
                </Col>
              </Row>

                              {/* 第四行：性别 + 是否在库 + 是否关注 */}
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
                    <Radio.Group>
                      <Radio value="male">男</Radio>
                      <Radio value="female">女</Radio>
                      <Radio value="other">其他</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="inStock" label="是否在库" rules={[{ required: true }]}>
                    <Radio.Group defaultValue={true}>
                      <Radio value={true}>在库</Radio>
                      <Radio value={false}>不在库</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="isFollowing" label="是否关注" rules={[{ required: true }]}>
                    <Radio.Group defaultValue={false}>
                      <Radio value={true}>关注</Radio>
                      <Radio value={false}>不关注</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

                              {/* 第五行：出生日期 + 签发日期 + 到期日期 */}
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="dateOfBirth" label="出生日期">
                    <DatePicker style={{ width: '100%' }} placeholder="非必填" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="issueDate" label="签发日期" rules={[{ required: true, message: '请选择签发日期' }]}>
                    <DatePicker 
                      style={{ width: '100%' }} 
                      onChange={(date) => {
                        if (date) {
                          // 自动计算到期日期：签发日期 + 10年 - 1天
                          const expiryDate = dayjs(date).add(10, 'year').subtract(1, 'day');
                          form.setFieldValue('expiryDate', expiryDate);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="expiryDate" label="到期日期" rules={[{ required: true, message: '请选择到期日期' }]}>
                    <DatePicker 
                      style={{ width: '100%' }}
                      onChange={(date) => {
                        if (date) {
                          // 如果没有签发日期，自动计算签发日期
                          const currentIssueDate = form.getFieldValue('issueDate');
                          if (!currentIssueDate) {
                            // 签发日期 = 到期日期的年份减10年，然后整个日期再加1天
                            const issueDate = dayjs(date).subtract(10, 'year').add(1, 'day');
                            form.setFieldValue('issueDate', issueDate);
                          }
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

                              {/* 第六行：备注 */}
              <Row>
                <Col span={24}>
                  <Form.Item noStyle shouldUpdate>
                    {() => {
                      const inStock = form.getFieldValue('inStock');
                      return (
                        <Form.Item name="remark" label="备注" rules={!inStock ? [{ required: true, message: '不在库时必须填写备注' }] : []}>
                          <Input.TextArea rows={3} placeholder="当不在库时必须填写备注" />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </Col>
              </Row>
            </Col>

            {/* 右侧：签证信息 */}
            <Col span={10}>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: '#1890ff' }}>签证信息（可选）</div>
              <Form.List name="visas">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                                              <Row key={field.key} gutter={8} align="middle" style={{ marginBottom: 12 }}>
                          <Col span={6}>
                            <Form.Item name={[field.name, 'country']} fieldKey={[field.fieldKey!, 'country']} rules={[{ required: true, message: '请输入国籍' }]}>
                              <Input placeholder="国籍" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name={[field.name, 'visaName']} fieldKey={[field.fieldKey!, 'visaName']} rules={[{ required: true, message: '请输入签证名称' }]}>
                              <Input placeholder="签证名称" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name={[field.name, 'expiryDate']} fieldKey={[field.fieldKey!, 'expiryDate']} rules={[{ required: true, message: '请选择到期日' }]}>
                              <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={2}>
                            <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} title="删除" />
                          </Col>
                        </Row>
                    ))}
                                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block style={{ marginTop: 8 }}>
                    + 新增一条签证
                  </Button>
                  </>
                )}
              </Form.List>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal open={openVisa} title="新增签证" onOk={addVisa} onCancel={() => setOpenVisa(false)} okText="确定" cancelText="取消" destroyOnHidden>
        <Form form={visaForm} layout="vertical">
          <Form.Item name="country" label="国籍" rules={[{ required: true }]}>
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
