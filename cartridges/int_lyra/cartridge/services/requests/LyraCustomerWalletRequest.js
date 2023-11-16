'use strict';

/** Scripts Declaration */
const LyraServiceConfig = require('*/cartridge/services/LyraServiceConfig');


function LyraCustomerWalletRequest() {
    this.body = {
        customerReference: customer.getID()
    }
}

LyraCustomerWalletRequest.prototype.getRequest = function getRequest() {
    return {
        endpoint: LyraServiceConfig.getCustomerWalletEndpoint(),
        body: this.body
    };
}

module.exports = LyraCustomerWalletRequest;
