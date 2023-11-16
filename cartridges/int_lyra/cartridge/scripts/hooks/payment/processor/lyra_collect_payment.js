'use strict';

// API Include
const Mac = require('dw/crypto/Mac');
const Site = require('dw/system/Site');
const Resource = require('dw/web/Resource');
const Encoding = require('dw/crypto/Encoding');
const Transaction = require('dw/system/Transaction');
const OrderMgr = require('dw/order/OrderMgr');
const Order = require('dw/order/Order');

const currentSite = Site.getCurrent();

const LyraUtils = require('~/cartridge/scripts/util/LyraUtils');

/**
 * default hook if no payment processor is supported
 * @return {Object} an object that contains error information
 */
function Handle(basket, paymentInformation, paymentMethodID) {
    Transaction.wrap(function () {
        basket.removeAllPaymentInstruments();
        basket.createPaymentInstrument(paymentMethodID, basket.totalGrossPrice);
    });

    return {
        error: false
    };
}

/**
 * Authorizes a payment using a credit card. Customizations may use other processors and custom
 *      logic to authorize credit card payment.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;
    var valid = false;
    var lyraData;
    var lyraResponse = request.getHttpParameterMap();
    const order = OrderMgr.getOrder(orderNumber);
    var paymentResult = "NOT_PAID";

    if (currentSite.getCustomPreferenceValue('lyra_paymentFormUrl').indexOf(request.getHttpReferer()) !== -1) {
        if (LyraUtils.checkSignature(lyraResponse)) {
            let objectNotification = {};
            let params = lyraResponse.getParameterNames().toArray().sort();
            params.forEach(function (param) {
                if (param.indexOf('vads_') === 0) {
                    objectNotification[param] = lyraResponse.get(param).getValue();
                }
            });
            valid = true;
            lyraData = JSON.stringify(objectNotification);
            if (lyraResponse.get('vads_trans_status').getValue() === "ACCEPTED" || lyraResponse.get('vads_trans_status').getValue() === "AUTHORISED") {
                paymentResult = "PAID";
            }
        }
    } else {
        var krAnswer = lyraResponse.get('kr-answer');
        var krAnswerType = lyraResponse.get('kr-answer-type');
        var krHash = lyraResponse.get('kr-hash');
        var krHashAlgorithm = lyraResponse.get('kr-hash-algorithm');
        var krHashKey = lyraResponse.get('kr-hash-key');
        var key = null;
        if (krAnswer != '' && krHash != '' && krAnswerType != '' && krHashAlgorithm != '' && krHashKey != '') {
            if (krHashKey.getValue() === 'sha256_hmac') {
                if (LyraUtils.isProductionMode()) {
                    key = currentSite.getCustomPreferenceValue('lyra_hmac_sha_256_production');
                } else {
                    key = currentSite.getCustomPreferenceValue('lyra_hmac_sha_256_staging');
                }
            } else if (krHashKey.getValue() === 'password') {
                if (LyraUtils.isProductionMode()) {
                    key = currentSite.getCustomPreferenceValue('lyra_api_password_production');
                } else {
                    key = currentSite.getCustomPreferenceValue('lyra_api_password_staging');
                }
            } else {
                if (LyraUtils.isProductionMode()) {
                    key = currentSite.getCustomPreferenceValue('lyra_key_production')
                } else {
                    key = currentSite.getCustomPreferenceValue('lyra_key_staging')
                }
            }
            if (key !== null) {
                const mac = new Mac(Mac.HMAC_SHA_256);
                const calculatedHash = Encoding.toHex(mac.digest(krAnswer, key));
                if (calculatedHash === krHash.getValue()) {
                    valid = true;
                    lyraData = krAnswer.getValue();
                } else {
                    error = true;
                    serverErrors.push(
                        Resource.msg('lyra.invalid.kr-hash', 'checkout', null)
                    );
                }
            } else {
                error = true;
                serverErrors.push(
                    Resource.msg('lyra.invalid.kr-hash-key', 'checkout', null)
                );
            }
        } else {
            error = true;
            serverErrors.push(
                Resource.msg('lyra.response.is_empty', 'checkout', null)
            );
        }

        paymentResult = JSON.parse(krAnswer).orderStatus;
    }
    try {
        Transaction.wrap(function () {
            order.setPaymentStatus(paymentResult !== 'PAID' ? Order.PAYMENT_STATUS_NOTPAID : Order.PAYMENT_STATUS_PAID);
            paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            order.custom.lyraPaymentData = lyraData;
        });
    } catch (e) {
        error = true;
        serverErrors.push(
            Resource.msg('lyra.error.sfcc_technical', 'checkout', null)
        );
    }
    return {
        fieldErrors: fieldErrors,
        serverErrors: serverErrors,
        error: error
    };
}

exports.Handle = Handle;
exports.Authorize = Authorize;