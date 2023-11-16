'use strict';

const server = require('server');
const Resource = require('dw/web/Resource');

server.extend(module.superModule);

server.append('Begin',
    function (req, res, next) {
        if (req.querystring.LyraError && req.querystring.LyraError === 'true') {
            const viewData = res.getViewData();
            viewData.lyra = {
                'error': true,
                'message': Resource.msg('lyra.payment.cancel', 'lyra', null)
            };

            res.setViewData(viewData);
        }

        next();
    }
);

module.exports = server.exports();
