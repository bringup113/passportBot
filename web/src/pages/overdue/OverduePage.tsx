import { Button, Space, Table, Tabs, Tag, Input } from 'antd';
import { useEffect, useState } from 'react';
import http from '../../api/http';
import dayjs from 'dayjs';

interface Client { id: string; name: string }
interface Passport { passportNo: string; client?: Client; country: string; fullName: string; expiryDate: string }
interface Visa { id: string; passportNo: string; country: string; visaName: string; expiryDate: string }

function statusTagByDate(dateStr: string) {
  const d = dayjs(dateStr);
  const diff = d.diff(dayjs(), 'day');
  if (diff <= 0) return <Tag color="red">已过期</Tag>;
  if (diff <= 15) return <Tag color="volcano">≤15天</Tag>;
  if (diff <= 30) return <Tag color="orange">≤30天</Tag>;
  if (diff <= 90) return <Tag color="gold">≤90天</Tag>;
  if (diff <= 180) return <Tag color="green">≤180天</Tag>;
  return <Tag>有效</Tag>;
}

export default function OverduePage() {
  const [active, setActive] = useState<'passports' | 'visas'>('passports');
  const [days, setDays] = useState<number | undefined>(15);
  const [expired, setExpired] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [q, setQ] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (expired) params.expired = true;
      else if (days) params.days = days;
      if (active === 'passports') {
        const res = await http.get('/overdue/passports', { params });
        const list: Passport[] = res.data || [];
        setPassports(q ? list.filter(x => (x.passportNo + x.fullName + (x.client?.name || '')).toLowerCase().includes(q.toLowerCase())) : list);
      } else {
        const res = await http.get('/overdue/visas', { params });
        const list: Visa[] = res.data || [];
        setVisas(q ? list.filter(x => (x.passportNo + x.visaName + x.country).toLowerCase().includes(q.toLowerCase())) : list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [active, days, expired, q]);

  const toolbar = (
    <Space wrap>
      <Input.Search placeholder={active === 'passports' ? '护照号/姓名/客户' : '护照号/签证名称/国家'} allowClear value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
      <Space>
        <Button type={days === 15 && !expired ? 'primary' : 'default'} onClick={() => { setDays(15); setExpired(false); }}>≤15天</Button>
        <Button type={days === 30 && !expired ? 'primary' : 'default'} onClick={() => { setDays(30); setExpired(false); }}>≤30天</Button>
        <Button type={days === 90 && !expired ? 'primary' : 'default'} onClick={() => { setDays(90); setExpired(false); }}>≤90天</Button>
        <Button type={days === 180 && !expired ? 'primary' : 'default'} onClick={() => { setDays(180); setExpired(false); }}>≤180天</Button>
        <Button danger type={expired ? 'primary' : 'default'} onClick={() => { setExpired(true); setDays(undefined); }}>已过期</Button>
        <Button onClick={() => { setQ(''); setExpired(undefined); setDays(15); }}>重置</Button>
      </Space>
    </Space>
  );

  return (
    <div>
      <div className="page-header">逾期管理</div>
      <div style={{ marginBottom: 12 }}>{toolbar}</div>
      <Tabs
        activeKey={active}
        onChange={(k) => setActive(k as any)}
        items={[
          {
            key: 'passports',
            label: '护照',
            children: (
              <Table
                rowKey="passportNo"
                loading={loading}
                dataSource={passports}
                columns={[
                  { title: '护照号', dataIndex: 'passportNo' },
                  { title: '客户', dataIndex: ['client', 'name'], render: (_: any, r: Passport) => r.client?.name },
                  { title: '国家', dataIndex: 'country' },
                  { title: '姓名', dataIndex: 'fullName' },
                  { title: '到期日', dataIndex: 'expiryDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
                  { title: '状态', render: (_: any, r: Passport) => statusTagByDate(r.expiryDate) },
                ]}
              />
            ),
          },
          {
            key: 'visas',
            label: '签证',
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={visas}
                columns={[
                  { title: '护照号', dataIndex: 'passportNo' },
                  { title: '国家', dataIndex: 'country' },
                  { title: '签证名称', dataIndex: 'visaName' },
                  { title: '到期日', dataIndex: 'expiryDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
                  { title: '状态', render: (_: any, r: Visa) => statusTagByDate(r.expiryDate) },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
