'use strict';

function PaymentResponse(response) {
    this.response = response;
    this.formToken = this._setFormToken();
}

PaymentResponse.prototype._setFormToken = function _setFormToken ()
{
    return this.response.answer.formToken;
}

PaymentResponse.prototype.getFormToken = function getFormToken ()
{
    return this.formToken;
}


module.exports = PaymentResponse;