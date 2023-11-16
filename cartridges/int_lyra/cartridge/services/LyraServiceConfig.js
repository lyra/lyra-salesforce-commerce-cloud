'use strict';

/** API Include */
const Site = require('dw/system/Site');
const System = require('dw/system/System');
const StringUtils = require('dw/util/StringUtils');

/** Constants Declaration */
const API_VERSION = 'V4';

function LyraServiceConfig() { }

LyraServiceConfig.getServiceName = function getServiceName() {
    return "Lyra"
}

LyraServiceConfig.getPaymentRequestEndpoint = function getPaymentRequestEndpoint() {
    return StringUtils.format("api-payment/{0}/Charge/CreatePayment", API_VERSION);
}

LyraServiceConfig.getCustomerWalletEndpoint = function getCustomerWalletEndpoint() {
    return StringUtils.format("api-payment/{0}/CustomerWallet/Get", API_VERSION);
}

LyraServiceConfig.getRemoveCustomerCardEndpoint = function getRemoveCustomerCardEndpoint() {
    return StringUtils.format("api-payment/{0}/Token/Cancel", API_VERSION);
}

module.exports = LyraServiceConfig;
