'use strict';

/**
 * API Includes
 */
const Logger = require('dw/system/Logger');

/** Scripts Declaration */
const ServiceModel = require('~/cartridge/services/models/ServiceModel');
const LyraServiceConfig = require('~/cartridge/services/LyraServiceConfig');
const LyraPaymentRequest = require('~/cartridge/services/requests/LyraPaymentRequest');
const LyraCustomerWalletRequest = require('~/cartridge/services/requests/LyraCustomerWalletRequest');
const LyraRemoveCustomerCardRequest = require('~/cartridge/services/requests/LyraRemoveCustomerCardRequest');

/** Constant Declaration */
const LOGGER_LYRA = Logger.getLogger("Lyra", "service");
const OVERLAY_RESPONSE = {
    PaymentResponse: require('*/cartridge/services/responses/PaymentResponse'),
    CustomerWalletResponse: require('*/cartridge/services/responses/CustomerWalletResponse'),
    RemoveCustomerCardResponse: require('*/cartridge/services/responses/RemoveCustomerCardResponse')
}

function LyraPaymentAPI() {
    this.serviceModel = new ServiceModel(
        LyraServiceConfig.getServiceName(),
        require('~/cartridge/services/callbacks/LyraCallbacks.js').getCallback()
    );
    this.serviceModel.setLogger(LOGGER_LYRA);
}

LyraPaymentAPI.prototype.getFormToken = function getFormToken(form) {
    return this.serviceModel.executeCall(new LyraPaymentRequest(form).getRequest(), OVERLAY_RESPONSE.PaymentResponse);
}

LyraPaymentAPI.prototype.getCustomerWalletList = function getCustomerWalletList() {
    return this.serviceModel.executeCall(new LyraCustomerWalletRequest().getRequest(), OVERLAY_RESPONSE.CustomerWalletResponse);
}

LyraPaymentAPI.prototype.removeCustomerCardFromWallet = function removeCustomerCardFromWallet(paymentMethodToken) {
    return this.serviceModel.executeCall(new LyraRemoveCustomerCardRequest(paymentMethodToken).getRequest(), OVERLAY_RESPONSE.RemoveCustomerCardResponse);
}

module.exports = LyraPaymentAPI;
