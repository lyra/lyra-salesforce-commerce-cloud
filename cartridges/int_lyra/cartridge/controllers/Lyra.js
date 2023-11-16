'use strict';

var server = require('server');
var cache = require('*/cartridge/scripts/middleware/cache');

const Mac = require('dw/crypto/Mac');
const Site = require('dw/system/Site');
const Locale = require('dw/util/Locale');
const System = require('dw/system/System');
const URLUtils = require('dw/web/URLUtils');
const Resource = require('dw/web/Resource');
const HookMgr = require('dw/system/HookMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Encoding = require('dw/crypto/Encoding');
const BasketMgr = require('dw/order/BasketMgr');
const Transaction = require('dw/system/Transaction');
const PaymentManager = require('dw/order/PaymentMgr');
const basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
const hooksHelper = require('*/cartridge/scripts/helpers/hooks');
const COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
const validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
const addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
const orderHelpers = require('*/cartridge/scripts/order/orderHelpers');

const LyraCurrencyNumber = require('~/cartridge/currency');
const LyraUtils = require('~/cartridge/scripts/util/LyraUtils');
const LyraPaymentModel = require('~/cartridge/models/LyraPaymentModel');

server.get('CreateForm', cache.applyDefaultCache, function (req, res, next) {
    res.render('lyra/embeddedForm', {
        displayInPopin: Site.getCurrent().getCustomPreferenceValue('displayInPopin'),
        paymentMethodID: LyraUtils.getEmbeddedPaymentMethod().getID(),
        embeddedMode: Site.getCurrent().getCustomPreferenceValue('lyra_embedded_mode'),
        compactMode: Site.getCurrent().getCustomPreferenceValue('lyra_compact_mode'),
        groupingThreshold: Site.getCurrent().getCustomPreferenceValue('lyra_groupingthreshold')
    });
    next();
});

server.get('RemoveCustomerCardFromWallet', cache.applyDefaultCache, function (req, res, next) {
    const LyraPayment = new LyraPaymentModel();
    LyraPayment.removeCustomerCardFromWallet(request.getHttpParameterMap().get('paymentMethodToken').getValue());
    res.redirect(URLUtils.url('Account-Show'));
    next();
});

server.get('GetCustomerWallet', cache.applyDefaultCache, function (req, res, next) {
    const LyraPayment = new LyraPaymentModel();
    res.render('account/lyraWalletList', {
        customerWalletList: LyraPayment.getCustomerWalletList().getWalletList()
    });
    next();
});

server.get('FormToken', cache.applyDefaultCache, function (req, res, next) {
    const LyraPayment = new LyraPaymentModel();
    res.json({
        formToken: LyraPayment.createPayment(req.querystring)
    });
    next();
});

server.get('PaymentForm', cache.applyDefaultCache, function (req, res, next) {
    let currentSite = Site.getCurrent();
    const basket = BasketMgr.getCurrentBasket();
    if (empty(basket) || empty(basket.getPaymentInstrument())) {
        res.json({});
        return next();
    }
    const paymentMethod = PaymentManager.getPaymentMethod(basket.getPaymentInstrument().getPaymentMethod());
    if (!LyraUtils.isPaymentMethodLyra(paymentMethod)) {
        res.json({});
        return next();
    }
    const date = new Date();
    var form = {
        vads_action_mode: "INTERACTIVE",
        vads_amount: Math.round(basket.getTotalGrossPrice().getValue() * 100).toFixed(0),
        vads_ctx_mode: currentSite.getCustomPreferenceValue('lyra_mode'),
        vads_currency: LyraCurrencyNumber[basket.getCurrencyCode()],
        vads_cust_address: basket.getBillingAddress().getAddress1(),
        vads_cust_address2: basket.getBillingAddress().getAddress2(),
        vads_cust_city: basket.getBillingAddress().getCity(),
        vads_cust_country: basket.getBillingAddress().getCountryCode().getValue().toUpperCase(),
        vads_cust_email: basket.getCustomerEmail(),
        vads_cust_first_name: basket.getBillingAddress().getFirstName(),
        vads_cust_id: customer.getProfile() ? customer.getProfile().getCustomerNo() : '',
        vads_cust_last_name: basket.getBillingAddress().getLastName(),
        vads_cust_phone: basket.getBillingAddress().getPhone(),
        vads_cust_zip: basket.getBillingAddress().getPostalCode(),
        vads_language: Locale.getLocale(request.getLocale()).getLanguage(),
        vads_nb_products: basket.getProductQuantityTotal().toFixed(0),
        vads_order_id: LyraUtils.createOrderNo(),
        vads_page_action: "PAYMENT",
        vads_payment_cards: empty(paymentMethod.getCustom()['lyra_methode_paiement'].getValue()) ? '' : paymentMethod.getCustom()['lyra_methode_paiement'].getValue(),
        vads_payment_config: "SINGLE",
        vads_return_mode: currentSite.getCustomPreferenceValue('lyra_return_mode'),
        vads_ship_to_city: basket.getDefaultShipment().getShippingAddress().getCity(),
        vads_ship_to_country: basket.getDefaultShipment().getShippingAddress().getCountryCode().getValue().toUpperCase(),
        vads_ship_to_first_name: basket.getDefaultShipment().getShippingAddress().getFirstName(),
        vads_ship_to_last_name: basket.getDefaultShipment().getShippingAddress().getLastName(),
        vads_ship_to_phone_num: basket.getDefaultShipment().getShippingAddress().getPhone(),
        vads_ship_to_street: basket.getDefaultShipment().getShippingAddress().getAddress1(),
        vads_ship_to_street2: basket.getDefaultShipment().getShippingAddress().getAddress2(),
        vads_ship_to_zip: basket.getDefaultShipment().getShippingAddress().getPostalCode(),
        vads_site_id: currentSite.getCustomPreferenceValue('lyra_site_id'),
        vads_trans_date: date.getFullYear().toString() + LyraUtils.pad2(date.getMonth() + 1) + LyraUtils.pad2(date.getDate()) + LyraUtils.pad2(date.getHours()) + LyraUtils.pad2(date.getMinutes()) + LyraUtils.pad2(date.getSeconds()),
        vads_trans_id: LyraUtils.getTransID(),
        vads_threeds_mpi: '',
        vads_available_languages: '',
        vads_url_cancel: currentSite.getCustomPreferenceValue('lyra_return_mode').getValue() === 'GET' ? URLUtils.https('Lyra-ReturnGet') : URLUtils.https('Lyra-ReturnPost'),
        vads_url_error: URLUtils.https('Lyra-ReturnPost'),
        vads_url_refused: currentSite.getCustomPreferenceValue('lyra_return_mode').getValue() === 'GET' ? URLUtils.https('Lyra-ReturnGet') : URLUtils.https('Lyra-ReturnPost'),
        vads_url_return: currentSite.getCustomPreferenceValue('lyra_return_mode').getValue() === 'GET' ? URLUtils.https('Lyra-ReturnGet') : URLUtils.https('Lyra-ReturnPost'),
        vads_url_success: currentSite.getCustomPreferenceValue('lyra_return_mode').getValue() === 'GET' ? URLUtils.https('Lyra-PlaceOrderGetHpp') : URLUtils.https('Lyra-PlaceOrderPostHpp'),
        vads_url_check: URLUtils.https('Lyra-Notification'),
        vads_version: "V2",
        vads_contrib: "Salesforce_Commerce_Cloud_1.0.0/" + System.getCompatibilityMode()
    }

    let pliIte = basket.getProductLineItems().iterator();
    let i = 0;
    while (pliIte.hasNext()) {
        let pli = pliIte.next();
        form['vads_product_ext_id' + i] = pli.getProductID();
        form['vads_product_label' + i] = pli.getProductName();
        form['vads_product_amount' + i] = Math.round(pli.getGrossPrice().getValue() * 100).toFixed(0);
        form['vads_product_ref' + i] = pli.getProductID();
        form['vads_product_qty' + i] = pli.getQuantityValue().toFixed(0);
        i++;
    }

    if (currentSite.getCustomPreferenceValue('lyra_automatic_return')) {
        form['vads_redirect_success_timeout'] = currentSite.getCustomPreferenceValue('lyra_timeout_redirection_success');
        form['vads_redirect_success_message'] = currentSite.getCustomPreferenceValue('lyra_redirection_message_success');
        form['vads_redirect_error_timeout'] = currentSite.getCustomPreferenceValue('lyra_timeout_redirection_failure');
        form['vads_redirect_error_message'] = currentSite.getCustomPreferenceValue('lyra_redirection_message_failure');
    }

    if (!empty(paymentMethod.getCustom()['lyra_mode_validation'].getValue())) {
        if (paymentMethod.getCustom()['lyra_mode_validation'].getValue().toString() !== "null") {
            form.vads_validation_mode = paymentMethod.getCustom()['lyra_mode_validation'].getValue().toString() === 'NO' ? '0' : '1';
        }
    } else if (!empty(Site.getCurrent().getCustomPreferenceValue('lyra_validation_mode'))) {
        if (Site.getCurrent().getCustomPreferenceValue('lyra_validation_mode').getValue().toString() !== "null") {
            form.vads_validation_mode = Site.getCurrent().getCustomPreferenceValue('lyra_validation_mode').getValue().toString() === 'NO' ? '0' : '1';
        }
    }

    form.signature = LyraUtils.getFormSignature(LyraUtils.sortJson(form));
    res.render('lyra/paymentForm', {
        form: form,
        paymentMethodName: paymentMethod.getName(),
        urlHPP: Site.getCurrent().getCustomPreferenceValue('lyra_paymentFormUrl')
    });
    next();
});

server.get('FailOrder', server.middleware.https, function (req, res, next) {
    const currentBasket = BasketMgr.getCurrentBasket();

    // Creates a new order.
    Transaction.wrap(function () {
        const order = OrderMgr.createOrder(currentBasket, currentBasket.getCustom()['lyraOrderNo']);
        currentBasket.getCustom()['lyraOrderNo'] = null;
        order.addNote('Order Failed - Lyra', 'Order failed');
        order.getCustom()['lyraPaymentData'] = request.getHttpParameterMap().get('kr-answer').getValue()
        OrderMgr.failOrder(order, true);
    });

    res.redirect(URLUtils.url('Cart-Show', 'LyraError', true));
    return next();

});

server.post('ReturnPost', server.middleware.https, function (req, res, next) {
    // In case of error on Lyra's side
    // Technical error, payment method not enabled in your contract ...
    const lastorder = orderHelpers.getLastOrder(req);
    const order = OrderMgr.getOrder(lastorder.orderNumber);
    Transaction.wrap(function () {
        order.addNote('Order Failed - Lyra', 'Order failed');
        OrderMgr.failOrder(order, true);
    });

    res.redirect(URLUtils.url('Checkout-Begin', 'LyraError', true));
    return next();
});

server.get('ReturnGet', server.middleware.https, function (req, res, next) {
    const lastorder = orderHelpers.getLastOrder(req);
    const order = OrderMgr.getOrder(lastorder.orderNumber);
    const lyraResponse = request.getHttpParameterMap();
    var objectNotification = {};
    let params = lyraResponse.getParameterNames().toArray().sort();
    params.forEach(function (param) {
        if (param.indexOf('vads_') === 0) {
            objectNotification[param] = lyraResponse.get(param).getValue();
        }
    });
    Transaction.wrap(function () {
        order.addNote('Order Failed - Lyra', 'Order failed');
        order.getCustom()['lyraPaymentData'] = JSON.stringify(objectNotification);
        OrderMgr.failOrder(order, true);
    });

    res.redirect(URLUtils.url('Checkout-Begin', 'LyraError', true));
    return next();
});

server.post('Notification', server.middleware.https, function (req, res, next) {
    const mac = new Mac(Mac.HMAC_SHA_256);
    var lyraResponse = request.getHttpParameterMap();
    var password;
    var message = '';
    res.setStatusCode(400);
    res.json({
        error: true,
        message: Resource.msg('notification.unknown_error', 'lyra', null)
    });

    if (lyraResponse.isParameterSubmitted('vads_hash')) {
        if (LyraUtils.checkSignature(lyraResponse)) {
            var objectNotification = {};
            let params = lyraResponse.getParameterNames().toArray().sort();
            params.forEach(function (param) {
                if (param.indexOf('vads_') === 0) {
                    objectNotification[param] = lyraResponse.get(param).getValue();
                }
            });
            message = LyraUtils.createLyraNotificationObjectHPP(objectNotification);
            res.setStatusCode(201);
            res.json({
                error: false,
                message: message
            });
        } else {
            res.setStatusCode(400);
            res.json({
                error: true,
                message: Resource.msg('notification.auth_fail', 'lyra', null)
            });
        }
    } else {
        if (LyraUtils.isProductionMode()) {
            password = Site.getCurrent().getCustomPreferenceValue('lyra_api_password_production');
        } else {
            password = Site.getCurrent().getCustomPreferenceValue('lyra_api_password_staging');
        }
        var krAnswer = lyraResponse.get('kr-answer');
        var krHash = lyraResponse.get('kr-hash').getValue();
        var calculatedHash = Encoding.toHex(mac.digest(krAnswer, password));
        if (krAnswer != '' && krHash != '') {
            var krAnswerObject = JSON.parse(krAnswer.getValue());
            if (calculatedHash === krHash) {
                message = LyraUtils.createLyraNotificationObject(krAnswerObject);
                res.setStatusCode(201);
                res.json({
                    error: false,
                    message: message
                });
            } else {
                res.setStatusCode(400);
                res.json({
                    error: true,
                    message: Resource.msg('notification.auth_fail', 'lyra', null)
                });
            }
        } else {
            res.setStatusCode(400);
            res.json({
                error: true,
                message: Resource.msg('notification.empty_response', 'lyra', null)
            });
        }
    }

    delete res.viewData.action;
    delete res.viewData.error;
    delete res.viewData.queryString;
    delete res.viewData.locale;

    next();
});

/** For Hosted payment page */
server.get('CreateOrderHPP', server.middleware.https, function (req, res, next) {
    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message
        });
        return next();
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });
        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });
        return next();
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    var validPayment = COHelpers.validatePayment(req, currentBasket);
    if (validPayment.error) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
        });
        return next();
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Creates a new order.
    var order;
    Transaction.wrap(function () {
        order = OrderMgr.createOrder(currentBasket, currentBasket.getCustom()['lyraOrderNo']);
        currentBasket.getCustom()['lyraOrderNo'] = null;
    });

    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    var fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', currentBasket, require('*/cartridge/scripts/hooks/fraudDetection').fraudDetection);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    if (req.currentCustomer.addressBook) {
        // save all used shipping addresses to address book of the logged in customer
        var allAddresses = addressHelpers.gatherShippingAddresses(order);
        allAddresses.forEach(function (address) {
            if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address));
            }
        });
    }

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    res.json({});
    next();
});

/** For Hosted payment page */
server.get('PlaceOrderGetHpp', server.middleware.https, function (req, res, next) {
    // Places the order
    const lastorder = orderHelpers.getLastOrder(req);
    const order = OrderMgr.getOrder(lastorder.orderNumber);

    var placeOrderResult = COHelpers.placeOrder(order, {
        status: true
    });
    if (placeOrderResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }
    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);

    // Handle custom processing post authorization
    var options = {
        req: req,
        res: res
    };
    var postAuthCustomizations = hooksHelper('app.post.auth', 'postAuthorization', handlePaymentResult, order, options, require('*/cartridge/scripts/hooks/postAuthorizationHandling').postAuthorization);
    if (postAuthCustomizations && Object.prototype.hasOwnProperty.call(postAuthCustomizations, 'error')) {
        res.json(postAuthCustomizations);
        return next();
    }

    if (handlePaymentResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    if (order.getCustomerEmail()) {
        COHelpers.sendConfirmationEmail(order, req.locale.id);
    }

    res.render('checkout/confirmation/formRedirect', {
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('Order-Confirm').toString()
    });

    next();
});

/** For Hosted payment page */
server.post('PlaceOrderPostHpp', server.middleware.https, function (req, res, next) {
    // Places the order
    const lastorder = orderHelpers.getLastOrder(req);
    const order = OrderMgr.getOrder(lastorder.orderNumber);

    var placeOrderResult = COHelpers.placeOrder(order, {
        status: true
    });
    if (placeOrderResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }
    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);

    // Handle custom processing post authorization
    var options = {
        req: req,
        res: res
    };
    var postAuthCustomizations = hooksHelper('app.post.auth', 'postAuthorization', handlePaymentResult, order, options, require('*/cartridge/scripts/hooks/postAuthorizationHandling').postAuthorization);
    if (postAuthCustomizations && Object.prototype.hasOwnProperty.call(postAuthCustomizations, 'error')) {
        res.json(postAuthCustomizations);
        return next();
    }

    if (handlePaymentResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    if (order.getCustomerEmail()) {
        COHelpers.sendConfirmationEmail(order, req.locale.id);
    }

    res.render('checkout/confirmation/formRedirect', {
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('Order-Confirm').toString()
    });

    next();
});

/** For Embedded form */
server.post('PlaceOrderEmbeddedForm', server.middleware.https, function (req, res, next) {
    var currentBasket = BasketMgr.getCurrentBasket();
    const paymentMethod = LyraUtils.getEmbeddedPaymentMethod();

    if (HookMgr.hasHook('app.payment.processor.' + paymentMethod.getPaymentProcessor().getID().toLowerCase())) {
        HookMgr.callHook('app.payment.processor.' + paymentMethod.getPaymentProcessor().getID().toLowerCase(),
            'Handle',
            currentBasket,
            null,
            LyraUtils.getEmbeddedPaymentMethod().getID(),
            req
        );
    } else {
        HookMgr.callHook('app.payment.processor.default', 'Handle');
    }

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message
        });
        return next();
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });
        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });
        return next();
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    var validPayment = COHelpers.validatePayment(req, currentBasket);
    if (validPayment.error) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
        });
        return next();
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Creates a new order.
    var order;
    Transaction.wrap(function () {
        order = OrderMgr.createOrder(currentBasket, currentBasket.getCustom()['lyraOrderNo']);
        currentBasket.getCustom()['lyraOrderNo'] = null;
    });

    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);

    // Handle custom processing post authorization
    var options = {
        req: req,
        res: res
    };
    var postAuthCustomizations = hooksHelper('app.post.auth', 'postAuthorization', handlePaymentResult, order, options, require('*/cartridge/scripts/hooks/postAuthorizationHandling').postAuthorization);
    if (postAuthCustomizations && Object.prototype.hasOwnProperty.call(postAuthCustomizations, 'error')) {
        res.json(postAuthCustomizations);
        return next();
    }

    if (handlePaymentResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    var fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', currentBasket, require('*/cartridge/scripts/hooks/fraudDetection').fraudDetection);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // Places the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    if (req.currentCustomer.addressBook) {
        // save all used shipping addresses to address book of the logged in customer
        var allAddresses = addressHelpers.gatherShippingAddresses(order);
        allAddresses.forEach(function (address) {
            if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address));
            }
        });
    }

    if (order.getCustomerEmail()) {
        COHelpers.sendConfirmationEmail(order, req.locale.id);
    }

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    res.render('checkout/confirmation/formRedirect', {
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('Order-Confirm').toString()
    });

    next();
});

module.exports = server.exports();