'use strict';

function LyraAPIProvider() { }

LyraAPIProvider.APIAvailables = {
    "lyra": require('*/cartridge/services/api/LyraPaymentAPI'),
};

LyraAPIProvider.get = function get(APIName, args) {
    if (!(APIName in LyraAPIProvider.APIAvailables)) {
        throw new Error("Unsupported Lyra API : " + APIName);
    }

    return new (LyraAPIProvider.APIAvailables[APIName])(args);
}

module.exports = LyraAPIProvider;
