import React from 'react';
import { Card } from 'antd';
import './BillPreview.css';

interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
  };
  salePrice: number;
  costPrice: number;
  status: string;
  remark?: string;
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
  orderItems: OrderItem[];
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
  client: {
    id: string;
    name: string;
  };
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  billStatus: string;
  orders: Order[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

interface BillPreviewProps {
  bill: Bill;
  companyName?: string;
  companyContact?: string;
}

const BillPreview: React.FC<BillPreviewProps> = ({ 
  bill, 
  companyName = "天成旅行社",
  companyContact = "如有疑问,请联系我们"
}) => {
  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 获取当前日期作为账单日期
  const billDate = new Date().toLocaleDateString('zh-CN');

  // 构建订单明细数据，支持单元格合并
  const buildOrderDetails = () => {
    const details: Array<{
      passportName: string;
      passportNumber: string;
      serviceName: string;
      servicePrice: number;
      passportSubtotal: number;
      passportRowspan?: number;
      passportNumberRowspan?: number;
      passportSubtotalRowspan?: number;
    }> = [];

    bill.orders.forEach(order => {
      const orderItems = order.orderItems;
      // 计算这本护照的总金额
      const passportSubtotal = orderItems.reduce((sum, item) => sum + Number(item.salePrice || 0), 0);
      
      orderItems.forEach((item, index) => {
        details.push({
          passportName: order.customerName,
          passportNumber: order.passportNumber,
          serviceName: item.product.name,
          servicePrice: Number(item.salePrice || 0),
          passportSubtotal: passportSubtotal,
          // 只有第一行设置 rowspan，其他行不显示
          passportRowspan: index === 0 ? orderItems.length : 0,
          passportNumberRowspan: index === 0 ? orderItems.length : 0,
          passportSubtotalRowspan: index === 0 ? orderItems.length : 0
        });
      });
    });

    return details;
  };

  const orderDetails = buildOrderDetails();

  // 重新计算正确的总金额
  const calculatedTotalAmount = orderDetails.reduce((sum, detail) => sum + detail.servicePrice, 0);

  return (
    <div className="bill-preview">
      <Card className="bill-card">
        {/* 头部 */}
        <div className="bill-header">
          <div className="company-name">{companyName}</div>
          <div className="bill-info">
            <div>账单日期: {billDate}</div>
            <div>客户名称: {bill.client.name}</div>
          </div>
        </div>

        {/* 订单明细标题 */}
        <div className="order-details-title">订单明细</div>

        {/* 订单明细表格 */}
        <table className="order-details-table">
          <thead>
            <tr>
              <th>护照名称</th>
              <th>护照号码</th>
              <th>业务名称</th>
              <th>业务价格</th>
              <th>小计</th>
            </tr>
          </thead>
          <tbody>
            {orderDetails.map((detail, index) => (
              <tr key={index}>
                {(detail.passportRowspan || 0) > 0 && (
                  <td rowSpan={detail.passportRowspan} className="passport-cell">
                    {detail.passportName}
                  </td>
                )}
                {(detail.passportNumberRowspan || 0) > 0 && (
                  <td rowSpan={detail.passportNumberRowspan} className="passport-cell">
                    {detail.passportNumber}
                  </td>
                )}
                <td>{detail.serviceName}</td>
                <td>${Number(detail.servicePrice || 0).toFixed(2)}</td>
                {(detail.passportSubtotalRowspan || 0) > 0 && (
                  <td rowSpan={detail.passportSubtotalRowspan} className="passport-cell subtotal-cell">
                    ${Number(detail.passportSubtotal || 0).toFixed(2)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

                 {/* 汇总信息 */}
         <div className="bill-summary">
           <div className="summary-row">
             <span>小计:</span>
             <span>${calculatedTotalAmount.toFixed(2)}</span>
           </div>
           <div className="summary-row">
             <span>已付金额:</span>
             <span>${Number(bill.paidAmount || 0).toFixed(2)}</span>
           </div>
           <div className="summary-row total">
             <span>合计:</span>
             <span>${(calculatedTotalAmount - Number(bill.paidAmount || 0)).toFixed(2)}</span>
           </div>
         </div>

        {/* 底部信息 */}
        <div className="bill-footer">
          <div>感谢您的惠顾</div>
          <div>{companyContact}</div>
        </div>
      </Card>
    </div>
  );
};

export default BillPreview;
