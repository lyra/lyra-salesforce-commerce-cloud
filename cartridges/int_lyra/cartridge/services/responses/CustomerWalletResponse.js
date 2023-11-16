'use strict';

function CustomerWalletResponse(response) {
    this.response = response;
    this.walletList = this._getWalletList();
}

CustomerWalletResponse.prototype._getWalletList = function _getWalletList()
{
    if (this.response.answer.tokens && this.response.answer.tokens.length > 0) {
        return this.response.answer.tokens;
    }

    return false;
}

CustomerWalletResponse.prototype.getWalletList = function getWalletList()
{
    return this.walletList;
}


module.exports = CustomerWalletResponse;