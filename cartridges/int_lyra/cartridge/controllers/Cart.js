'use strict';

const server = require('server');
const Resource = require('dw/web/Resource');

server.extend(module.superModule);

server.append('Show',
    function (req, res, next) {
        this.on("route:BeforeComplete", function (req, res) {
            if (req.querystring.LyraError && req.querystring.LyraError === 'true') {
                const viewData = res.getViewData();
                viewData.lyra = {
                    'error': true,
                    'message': Resource.msg('error.payment.not.valid', 'checkout', null)
                };
    
                res.setViewData(viewData);
            }
        });

        next();
    }
);

module.exports = server.exports();
