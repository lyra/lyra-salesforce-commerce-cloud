'use strict';

function RemoveCustomerCardResponse(response) {
    this.response = response;
}

RemoveCustomerCardResponse.prototype.getResponse = function getResponse()
{
    return this.response;
}


module.exports = RemoveCustomerCardResponse;