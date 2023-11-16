'use strict';

const LyraAPIProvider = require("*/cartridge/services/api/LyraAPIProvider");
const lyraPaymentAPI = LyraAPIProvider.get("lyra");

function LyraPaymentModel() {}

/**
 *
 * @return Payment formToken
 */

LyraPaymentModel.prototype.createPayment = function createPayment(form) {
    const paymentStatus = lyraPaymentAPI.getFormToken(form);

    return paymentStatus;
}

LyraPaymentModel.prototype.getCustomerWalletList = function getCustomerWalletList() {
    const customerWalletList = lyraPaymentAPI.getCustomerWalletList();

    return customerWalletList;
}

LyraPaymentModel.prototype.removeCustomerCardFromWallet = function removeCustomerCardFromWallet(paymentMethodToken) {
    const removeCustomerCardFromWalletResponse = lyraPaymentAPI.removeCustomerCardFromWallet(paymentMethodToken);

    return removeCustomerCardFromWalletResponse;
}

module.exports = LyraPaymentModel;