// services/emailService.js
const nodemailer = require('nodemailer');

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.qq.com',
  port: process.env.EMAIL_PORT || 465,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * 发送订单创建邮件
 */
const sendOrderCreatedEmail = async (order, user) => {
  const subject = '订单创建成功';
  const html = generateOrderCreatedEmailHTML(order, user);
  
  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * 发送支付成功邮件
 */
const sendPaymentSuccessEmail = async (order, user) => {
  const subject = '支付成功通知';
  const html = generatePaymentSuccessEmailHTML(order, user);
  
  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * 发送发货通知邮件
 */
const sendShippedEmail = async (order, user, trackingNumber) => {
  const subject = '您的订单已发货';
  const html = generateShippedEmailHTML(order, user, trackingNumber);
  
  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * 通用邮件发送方法
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"购物商城" <${process.env.EMAIL_FROM || 'noreply@yourstore.com'}>`,
      to,
      subject,
      html: html || text
    };

    // 开发环境预览
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('\n📧 开发环境 - 邮件预览:');
    //   console.log('收件人:', to);
    //   console.log('主题:', subject);
    //   console.log('内容预览:', html ? html.substring(0, 200) + '...' : text);
    //   console.log('---\n');
    //   return { preview: true, ...mailOptions };
    // }

    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('邮件发送失败:', error);
    throw error;
  }
};

/**
 * 生成订单创建邮件HTML
 */
const generateOrderCreatedEmailHTML = (order, user) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
    .content { padding: 20px; background: white; }
    .order-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .item { border-bottom: 1px solid #eee; padding: 10px 0; }
    .total { font-size: 18px; font-weight: bold; color: #e1251b; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>订单创建成功</h2>
      <p>感谢您的购买！</p>
    </div>
    
    <div class="content">
      <p>亲爱的 ${user.username}，</p>
      <p>您的订单已创建成功，订单号为：<strong>${order.orderNo}</strong></p>
      
      <div class="order-info">
        <h3>订单信息</h3>
        <p>订单号: ${order.orderNo}</p>
        <p>订单状态: 待支付</p>
        <p>下单时间: ${new Date(order.createdAt).toLocaleString('zh-CN')}</p>
        
        <h4>订单商品</h4>
        ${order.orderItems.map(item => `
          <div class="item">
            <p>${item.product.name} × ${item.quantity}</p>
            <p>单价: ¥${item.price} 小计: ¥${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        `).join('')}
        
        <p>商品总额: ¥${order.totalPrice.toFixed(2)}</p>
        <p class="total">应付总额: ¥${order.totalPrice.toFixed(2)}</p>
      </div>
      
      <p>请尽快完成支付，支付完成后我们将尽快为您发货。</p>
      
      <p>如有任何问题，请随时联系我们。</p>
    </div>
    
    <div class="footer">
      <p>购物商城团队</p>
      <p>本邮件为系统自动发送，请勿回复。</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 生成支付成功邮件HTML
 */
const generatePaymentSuccessEmailHTML = (order, user) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f0f9f0; padding: 20px; text-align: center; border-radius: 5px; }
    .success-icon { color: #52c41a; font-size: 48px; margin: 10px 0; }
    .content { padding: 20px; background: white; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h2>支付成功！</h2>
    </div>
    
    <div class="content">
      <p>亲爱的 ${user.username}，</p>
      <p>您的订单支付已成功完成，我们将会尽快处理您的订单。</p>
      
      <p><strong>订单号:</strong> ${order.orderNo}</p>
      <p><strong>支付金额:</strong> ¥${order.totalPrice.toFixed(2)}</p>
      <p><strong>支付时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
      
      <p>您可以在"我的订单"中查看订单状态。</p>
      
      <p>感谢您的信任与支持！</p>
    </div>
    
    <div class="footer">
      <p>购物商城团队</p>
      <p>本邮件为系统自动发送，请勿回复。</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 生成发货通知邮件HTML
 */
const generateShippedEmailHTML = (order, user, trackingNumber) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #e6f7ff; padding: 20px; text-align: center; border-radius: 5px; }
    .content { padding: 20px; background: white; }
    .tracking-info { background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>您的订单已发货！</h2>
    </div>
    
    <div class="content">
      <p>亲爱的 ${user.username}，</p>
      <p>很高兴通知您，您的订单已经发货。</p>
      
      <div class="tracking-info">
        <h3>发货信息</h3>
        <p><strong>订单号:</strong> ${order.orderNo}</p>
        ${trackingNumber ? `<p><strong>运单号:</strong> ${trackingNumber}</p>` : ''}
        <p><strong>发货时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
      </div>
      
      <p>物流信息通常会在发货后的24小时内更新。</p>
      <p>您可以在"我的订单"中查看物流详情。</p>
      
      <p>感谢您的购买，祝您购物愉快！</p>
    </div>
    
    <div class="footer">
      <p>购物商城团队</p>
      <p>本邮件为系统自动发送，请勿回复。</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  sendOrderCreatedEmail,
  sendPaymentSuccessEmail,
  sendShippedEmail,
  sendEmail
};