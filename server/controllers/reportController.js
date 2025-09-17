const Order = require('../models/orderModel');

exports.getInvoiceReports = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });

    const invoices = orders.map(order => ({
      orderId: order._id,
      customerName: order.user.name,
      orderDate: order.createdAt,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      items: order.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      }))
    }));

    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error getting invoice reports:', error);
    res.status(500).json({ message: 'Error fetching invoice reports', error: error.message });
  }
};

// Add more report-related controller functions as needed
