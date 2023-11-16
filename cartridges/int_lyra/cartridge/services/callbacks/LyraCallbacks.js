'use strict';

const Site = require('dw/system/Site');
const StringUtils = require('dw/util/StringUtils');

const LyraUtils = require('~/cartridge/scripts/util/LyraUtils');

function LyraCallBacks() { }

LyraCallBacks.getCallback = function _getCallback() {
    return {
        createRequest: function (svc, params) {
            var password;
            if (LyraUtils.isProductionMode()) {
                password = Site.getCurrent().getCustomPreferenceValue('lyra_api_password_production');
            } else {
                password = Site.getCurrent().getCustomPreferenceValue('lyra_api_password_staging');
            }
            const base64 = StringUtils.encodeBase64(Site.getCurrent().getCustomPreferenceValue('lyra_site_id') + ':' + password);
            svc.setRequestMethod("POST");
            svc.addHeader('Authorization', 'Basic ' + base64);
            svc.setURL(svc.getURL() + params.endpoint);

            var body = JSON.stringify(params.body);
            return body;
        },
        parseResponse: this.parseResponse
    };
}

LyraCallBacks.parseResponse = function parseResponse(svc, svcResponse) {
    try {
        return JSON.parse(svcResponse.getText());
    } catch (error) {
        return false;
    }
}

module.exports = LyraCallBacks;
