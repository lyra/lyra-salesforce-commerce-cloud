'use strict';

const Mac = require('dw/crypto/Mac');
const Site = require('dw/system/Site');
const Calendar = require('dw/util/Calendar');
const OrderMgr = require('dw/order/OrderMgr');
const Encoding = require('dw/crypto/Encoding');
const BasketMgr = require('dw/order/BasketMgr');
const PaymentMgr = require('dw/order/PaymentMgr');
const StringUtils = require('dw/util/StringUtils');
const Transaction = require('dw/system/Transaction');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const Resource = require('dw/web/Resource');

function LyraUtils() { }

LyraUtils.createLyraNotificationObject = function createLyraNotificationObject(notificationJson) {
    var message = Resource.msg('notification.payment_ok', 'lyra', null);
    if (notificationJson.orderStatus == 'UNPAID') {
        message = Resource.msg('notification.payment_ko', 'lyra', null);
    }
    var keyValue = notificationJson.orderDetails.orderId + "-" + StringUtils.formatCalendar(new Calendar(), "yyyyMMddhhmmss");
    Transaction.wrap(function () {
        var lyraNotification = CustomObjectMgr.createCustomObject('LyraNotification', keyValue);
        lyraNotification.getCustom()['lyraLog'] = JSON.stringify(notificationJson, null, 3);
        lyraNotification.getCustom()['orderNo'] = notificationJson.orderDetails.orderId;
        lyraNotification.getCustom()['orderStatus'] = notificationJson.orderStatus;
    });

    return message;
}

LyraUtils.createLyraNotificationObjectHPP = function createLyraNotificationObjectHPP(notification) {
    var keyValue = notification.vads_order_id + "-" + StringUtils.formatCalendar(new Calendar(), "yyyyMMddhhmmss");
    var message = '';
    Transaction.wrap(function () {
        var lyraNotification = CustomObjectMgr.createCustomObject('LyraNotification', keyValue);
        lyraNotification.getCustom()['lyraLog'] = JSON.stringify(notification, null, 3);
        lyraNotification.getCustom()['orderNo'] = notification.vads_order_id;
        if (notification.vads_trans_status == 'ACCEPTED' || notification.vads_trans_status == 'AUTHORISED' ||notification.vads_trans_status == 'CAPTURED') {
            lyraNotification.getCustom()['orderStatus'] = 'PAID';
            message = Resource.msg('notification.payment_ok', 'lyra', null);
        } else if (notification.vads_trans_status == 'AUTHORISED_TO_VALIDATE' || notification.vads_trans_status == 'UNDER_VERIFICATION' || notification.vads_trans_status == 'WAITING_AUTHORISATION' ||
        notification.vads_trans_status == 'WAITING_AUTHORISATION_TO_VALIDATE') {
            lyraNotification.getCustom()['orderStatus'] = 'WAITING';
            message = Resource.msg('notification.waiting_payment', 'lyra', null);
        } else {
            lyraNotification.getCustom()['orderStatus'] = 'UNPAID';
            message = Resource.msg('notification.payment_ko', 'lyra', null);
        }
    });

    return message;
}

LyraUtils.checkSignature = function checkSignature(lyraResponse) {
    const mac = new Mac(Mac.HMAC_SHA_256);
    var password;

    if (LyraUtils.isProductionMode()) {
        password = Site.getCurrent().getCustomPreferenceValue('lyra_key_production');
    } else {
        password = Site.getCurrent().getCustomPreferenceValue('lyra_key_staging');
    }
    var signature = '';
    let params = lyraResponse.getParameterNames().toArray().sort();
    params.forEach(function (param) {
        if (param.indexOf('vads_') === 0) {
            signature = signature + lyraResponse.get(param) + '+';
        }
    });
    signature = signature + password;
    var calculatedHash = Encoding.toBase64(mac.digest(signature, password));
    return calculatedHash == lyraResponse.get('signature');
}

LyraUtils.createOrderNo = function createOrderNo() {
    const basket = BasketMgr.getCurrentBasket();
    if (empty(basket.getCustom()['lyraOrderNo'])) {
        Transaction.wrap(function () {
            basket.getCustom()['lyraOrderNo'] = OrderMgr.createOrderNo();
        });
    }

    return basket.getCustom()['lyraOrderNo'];
}

LyraUtils.getFormSignature = function getFormSignature (form) {
    let signatureString = '';
    var siteKey;
    if (LyraUtils.isProductionMode()) {
        siteKey = Site.getCurrent().getCustomPreferenceValue('lyra_key_production');
    } else {
        siteKey = Site.getCurrent().getCustomPreferenceValue('lyra_key_staging');
    }
    for (var elem in form) {
        signatureString += form[elem] + '+';
    }

    signatureString += siteKey;
    const mac = new Mac(Mac.HMAC_SHA_256);

    return Encoding.toBase64(mac.digest(signatureString, siteKey));
}

LyraUtils.getEmbeddedPaymentMethod = function getEmbeddedPaymentMethod() {
    const paymentMethods = PaymentMgr.getActivePaymentMethods().iterator();
    while (paymentMethods.hasNext()) {
        let paymentMethod = paymentMethods.next();
        if (paymentMethod.getPaymentProcessor().getID() === 'LYRA_COLLECT_EMBEDDED_PAYMENT') {
            return paymentMethod;
        }
    }
    return null;
}

LyraUtils.isPaymentMethodLyra = function isPaymentMethodLyra(paymentMethod) {
    return (paymentMethod.getPaymentProcessor().getID() === 'LYRA_COLLECT_PAYMENT' || paymentMethod.getPaymentProcessor().getID() === 'LYRA_COLLECT_EMBEDDED_PAYMENT');
}

LyraUtils.getPaymentMethodByID = function getPaymentMethodByID(paymentMethodID) {
    return PaymentMgr.getPaymentMethod(paymentMethodID);
}

LyraUtils.isProductionMode = function isProductionMode() {
    return (Site.getCurrent().getCustomPreferenceValue('lyra_mode').getValue() === 'PRODUCTION');
}

LyraUtils.pad2 = function pad2(n) {
    return n < 10 ? '0' + n : n;
}

LyraUtils.sortJson = function sortJson(o) {
    var sorted = {},
    key, a = [];

    for (key in o) {
        if (o.hasOwnProperty(key)) {
                a.push(key);
        }
    }

    a.sort();

    for (key = 0; key < a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }
    return sorted;
}

LyraUtils.getTransID = function getTransID() {
    var ts = String(new Date().getTime()),
        i = 0,
        out = '';

    for (i = 0; i < ts.length; i += 2) {
        out += Number(ts.substr(i, 2)).toString(36);
    }

    return (out.slice(-6));
}

module.exports = LyraUtils;