'use strict';

/** Scripts Declaration */
const LyraServiceConfig = require('*/cartridge/services/LyraServiceConfig');


function LyraRemoveCustomerCardRequest(paymentMethodToken) {
    this.body = {
        paymentMethodToken: paymentMethodToken
    }
}

LyraRemoveCustomerCardRequest.prototype.getRequest = function getRequest() {
    return {
        endpoint: LyraServiceConfig.getRemoveCustomerCardEndpoint(),
        body: this.body
    };
}

module.exports = LyraRemoveCustomerCardRequest;
