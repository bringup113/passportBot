import { useEffect, useState } from 'react';
import { Card, Col, List, Row, Space, Statistic, Tag, Typography, Button, Table } from 'antd';
import http from '../../api/http';
import dayjs from 'dayjs';

type Summary = {
  counts: {
    totalClients: number;
    totalPassports: number;
    totalVisas: number;
    passportsInStock: number;
    passportsFollowing: number;
    passportsExpired: number;
    visasExpired: number;
    notify: { enabled: boolean; whitelistActiveCount: number };
  };
  expiryBuckets: {
    passports: { expired: number; le15: number; le30: number; le90: number; le180: number; gt180: number };
    visas: { expired: number; le15: number; le30: number; le90: number; le180: number; gt180: number };
  };
  topClients90d: { clientId: string; clientName: string; dueCount: number }[];
  reminders: {
    passports: { passportNo: string; clientName?: string; fullName: string; expiryDate: string }[];
    visas: { id: string; passportNo: string; visaName: string; country: string; expiryDate: string }[];
  };
  recentAudits: { id: string; createdAt: string; user?: { username?: string } | null; action: string; entity: string; entityId: string }[];
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await http.get('/dashboard/summary');
        setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

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

  const kpis = (
    <Row gutter={[12, 12]}> 
      <Col xs={12} sm={8} md={6} lg={6} xl={4}>
        <Card loading={loading}><Statistic title="客户数" value={data?.counts?.totalClients ?? 0} /></Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={6} xl={4}>
        <Card loading={loading}><Statistic title="护照数" value={data?.counts?.totalPassports ?? 0} /></Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={6} xl={4}>
        <Card loading={loading}><Statistic title="签证数" value={data?.counts?.totalVisas ?? 0} /></Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={6} xl={4}>
        <Card loading={loading}><Statistic title="在库护照" value={data?.counts?.passportsInStock ?? 0} /></Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={6} xl={4}>
        <Card loading={loading}><Statistic title="过期护照" value={data?.counts?.passportsExpired ?? 0} /></Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={6} xl={4}>
        <Card loading={loading}><Statistic title="过期签证" value={data?.counts?.visasExpired ?? 0} /></Card>
      </Col>
    </Row>
  );

  const buckets = (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <Card title="护照到期分布" loading={loading}>
          <Space size="large" wrap>
            <Tag>已过期 {data?.expiryBuckets?.passports?.expired ?? 0}</Tag>
            <Tag color="volcano">≤15天 {data?.expiryBuckets?.passports?.le15 ?? 0}</Tag>
            <Tag color="orange">≤30天 {data?.expiryBuckets?.passports?.le30 ?? 0}</Tag>
            <Tag color="gold">≤90天 {data?.expiryBuckets?.passports?.le90 ?? 0}</Tag>
            <Tag color="green">≤180天 {data?.expiryBuckets?.passports?.le180 ?? 0}</Tag>
            <Tag>&gt;180天 {data?.expiryBuckets?.passports?.gt180 ?? 0}</Tag>
            <Button type="link" onClick={() => { window.history.pushState({}, '', '/overdue'); window.dispatchEvent(new PopStateEvent('popstate')); }}>查看逾期</Button>
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="签证到期分布" loading={loading}>
          <Space size="large" wrap>
            <Tag>已过期 {data?.expiryBuckets?.visas?.expired ?? 0}</Tag>
            <Tag color="volcano">≤15天 {data?.expiryBuckets?.visas?.le15 ?? 0}</Tag>
            <Tag color="orange">≤30天 {data?.expiryBuckets?.visas?.le30 ?? 0}</Tag>
            <Tag color="gold">≤90天 {data?.expiryBuckets?.visas?.le90 ?? 0}</Tag>
            <Tag color="green">≤180天 {data?.expiryBuckets?.visas?.le180 ?? 0}</Tag>
            <Tag>&gt;180天 {data?.expiryBuckets?.visas?.gt180 ?? 0}</Tag>
            <Button type="link" onClick={() => { window.history.pushState({}, '', '/overdue'); window.dispatchEvent(new PopStateEvent('popstate')); }}>查看逾期</Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  const topAndReminders = (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <Card title="客户 Top5（90天内将到期）" loading={loading}>
          <Table
            size="small"
            rowKey={(r) => r.clientId}
            dataSource={data?.topClients90d || []}
            pagination={false}
            columns={[
              { title: '客户', dataIndex: 'clientName' },
              { title: '到期数量', dataIndex: 'dueCount', width: 120 },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Row gutter={[12, 12]}>
          <Col span={24}>
            <Card title="关注护照（30天内）" loading={loading}>
              <List
                dataSource={data?.reminders?.passports || []}
                renderItem={(item) => (
                  <List.Item>
                    <Space size={12} wrap>
                      <Typography.Text strong>{item.passportNo}</Typography.Text>
                      <Typography.Text>{item.clientName || '-'}</Typography.Text>
                      <Typography.Text>{item.fullName}</Typography.Text>
                      <Typography.Text>{dayjs(item.expiryDate).format('YYYY-MM-DD')}</Typography.Text>
                      {statusTagByDate(item.expiryDate)}
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={24}>
            <Card title="关注签证（30天内）" loading={loading}>
              <List
                dataSource={data?.reminders?.visas || []}
                renderItem={(item) => (
                  <List.Item>
                    <Space size={12} wrap>
                      <Typography.Text strong>{item.passportNo}</Typography.Text>
                      <Typography.Text>{item.country}</Typography.Text>
                      <Typography.Text>{item.visaName}</Typography.Text>
                      <Typography.Text>{dayjs(item.expiryDate).format('YYYY-MM-DD')}</Typography.Text>
                      {statusTagByDate(item.expiryDate)}
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  );

  const recent = (
    <Card title="最近活动" loading={loading} style={{ marginTop: 12 }}>
      <Table
        rowKey={(r) => r.id}
        size="small"
        dataSource={data?.recentAudits || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
          { title: '用户', dataIndex: ['user','username'], render: (_: any, r: any) => r.user?.username || '-' },
          { title: '动作', dataIndex: 'action', render: (v: string) => <Tag color={v==='create'?'green':v==='update'?'blue':'red'}>{v}</Tag> },
          { title: '实体', dataIndex: 'entity' },
          { title: '对象', dataIndex: 'entityId' },
        ]}
      />
    </Card>
  );

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {kpis}
      {buckets}
      {topAndReminders}
      {recent}
    </Space>
  );
}


