'use strict';

const Order = require('dw/order/Order');
const Logger = require('dw/system/Logger');
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');

module.exports.execute = function (args) {
    const lyraNotifications = CustomObjectMgr.getAllCustomObjects('LyraNotification');

    while (lyraNotifications.hasNext()) {
        let notification = lyraNotifications.next();
        let message = notification.getCustom()['lyraLog'];
        if (message.length >= 4000) {
            message = message.substring(0, 4000 - 3) + '...';
        }

        var order = OrderMgr.getOrder(notification.getCustom()['orderNo']);
        Transaction.begin();
        if (order) {
            if (notification.getCustom()['orderStatus'] === 'PAID') {
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
                order.custom.lyraPaymentData = notification.getCustom()['lyraLog'];
                order.addNote('LYRA NOTIFICATION - Success', message);
            } else if (notification.getCustom()['orderStatus'] === 'UNPAID' || notification.getCustom()['orderStatus'] === 'ABANDONED') {
                order.addNote('LYRA NOTIFICATION - Error', message);
                order.custom.lyraPaymentData = notification.getCustom()['lyraLog'];
                OrderMgr.failOrder(order, true);
            } else {
                order.addNote('LYRA NOTIFICATION - Pending', message);
                order.custom.lyraPaymentData = notification.getCustom()['lyraLog'];
            }
            Logger.info('Process notification for order {0}', notification.getCustom()['orderNo']);
            CustomObjectMgr.remove(notification);

        } else {
            Logger.info('Order not found {0}', notification.getCustom()['orderNo']);
            CustomObjectMgr.remove(notification);
        }
        Transaction.commit();
    }

    lyraNotifications.close();
}