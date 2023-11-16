'use strict';

const Site = require('dw/system/Site');
const Locale = require('dw/util/Locale');
const System = require('dw/system/System');
const URLUtils = require('dw/web/URLUtils');
const OrderMgr = require('dw/order/OrderMgr');
const BasketMgr = require('dw/order/BasketMgr');
const PaymentMgr = require('dw/order/PaymentMgr');

/** Scripts Declaration */
const LyraUtils = require('~/cartridge/scripts/util/LyraUtils');
const LyraServiceConfig = require('*/cartridge/services/LyraServiceConfig');


function LyraPaymentRequest(formChanged) {

    let paymentMethod = LyraUtils.getEmbeddedPaymentMethod();
    if (empty(paymentMethod)) {
        return;
    }
    let formAction = 'PAYMENT';
    if (Site.getCurrent().getCustomPreferenceValue('lyra_alias_enabled') && customer.isAuthenticated()) {
        formAction = 'CUSTOMER_WALLET';
    }
    this.cart = BasketMgr.getCurrentBasket();
    this.body = {
        amount: Math.round(this.cart.getTotalGrossPrice().getValue() * 100),
        contrib: "Salesforce_Commerce_Cloud_1.0.0/" + System.getCompatibilityMode(),
        currency: this.cart.getCurrencyCode(),
        ipnTargetUrl: URLUtils.abs('Lyra-Notification').toString(),
        orderId: LyraUtils.createOrderNo(),
        formAction: formAction,
        customer: {
            email: customer.getProfile() ? customer.getProfile().getEmail() : null,
            reference: customer.isAuthenticated() ? customer.getID() : '',
            billingDetails: {
                address: this.cart.getBillingAddress().getAddress1(),
                address2: this.cart.getBillingAddress().getAddress2(),
                phoneNumber: this.cart.getBillingAddress().getPhone(),
                city: this.cart.getBillingAddress().getCity(),
                country: this.cart.getBillingAddress().getCountryCode().getValue().toUpperCase(),
                firstName: this.cart.getBillingAddress().getFirstName(),
                language: Locale.getLocale(request.getLocale()).getLanguage().toUpperCase(),
                lastName: this.cart.getBillingAddress().getLastName(),
                title: this.cart.getBillingAddress().getTitle(),
                zipCode: this.cart.getBillingAddress().getPostalCode()
            },
            shippingDetails: {
                address: this.cart.getDefaultShipment().getShippingAddress().getAddress1(),
                address2: this.cart.getDefaultShipment().getShippingAddress().getAddress2(),
                city: this.cart.getDefaultShipment().getShippingAddress().getCity(),
                country: this.cart.getDefaultShipment().getShippingAddress().getCountryCode().getValue().toUpperCase(),
                firstName: this.cart.getDefaultShipment().getShippingAddress().getFirstName(),
                lastName: this.cart.getDefaultShipment().getShippingAddress().getLastName(),
                phoneNumber: this.cart.getDefaultShipment().getShippingAddress().getPhone(),
                zipCode: this.cart.getDefaultShipment().getShippingAddress().getPostalCode(),
            },
            shoppingCart: {
                shippingAmount: Math.round(this.cart.getAdjustedShippingTotalPrice().getValue() * 100),
                taxAmount: Math.round(this.cart.getTotalTax().getValue() * 100),
                cartItemInfo: _getCartItemInfo(this.cart)
            }
        },
        transactionOptions: {
            cardOptions: {
                paymentSource: "EC",
                retry : Site.getCurrent().getCustomPreferenceValue('lyra_retry')
            }
        }
    }

    if (!empty(formChanged.dwfrm_billing_addressFields_address1)) {
        this.body.customer.billingDetails.address = formChanged.dwfrm_billing_addressFields_address1;
        this.body.customer.billingDetails.address2 = formChanged.dwfrm_billing_addressFields_address2;
        this.body.customer.billingDetails.city = formChanged.dwfrm_billing_addressFields_city;
        this.body.customer.billingDetails.country = formChanged.dwfrm_billing_addressFields_country;
        this.body.customer.billingDetails.firstName = formChanged.dwfrm_billing_addressFields_firstName;
        this.body.customer.billingDetails.lastName = formChanged.dwfrm_billing_addressFields_lastName;
        this.body.customer.billingDetails.zipCode = formChanged.dwfrm_billing_addressFields_postalCode;
        this.body.customer.billingDetails.phoneNumber = formChanged.dwfrm_billing_contactInfoFields_phone;
    }

    if (!empty(paymentMethod.getCustom()['lyra_mode_validation'].getValue())) {
        this.body.transactionOptions.cardOptions.manualValidation = paymentMethod.getCustom()['lyra_mode_validation'].getValue().toString();
    } else {
        this.body.transactionOptions.cardOptions.manualValidation = Site.getCurrent().getCustomPreferenceValue('lyra_validation_mode').getValue() ? Site.getCurrent().getCustomPreferenceValue('lyra_validation_mode').getValue().toString() : null;
    }

    if (this.body.transactionOptions.cardOptions.manualValidation === "null") {
        this.body.transactionOptions.cardOptions.manualValidation = null;
    }

    var res = [];
    const values = Site.getCurrent().getCustomPreferenceValue('lyra_smartFormPaymentMethods');
    res = values.map(value => value.getValue());
    this.body.paymentMethods = res;
}

function _getCartItemInfo(cart) {
    var res = []
    cart.getProductLineItems().toArray().forEach(function (productLineItem) {
        res.push({
            productAmount: Math.round(productLineItem.getPrice().getValue() * 100),
            productAmount: Math.round(productLineItem.getPrice().getValue() * 100),
            productLabel: productLineItem.getProductName(),
            productQty: productLineItem.getQuantityValue(),
            productRef: productLineItem.getProductID(),
            productVat: Math.round(productLineItem.getTax().getValue() * 100)
        });
    });
    return res;
}


LyraPaymentRequest.prototype.getRequest = function getRequest() {
    return {
        endpoint: LyraServiceConfig.getPaymentRequestEndpoint(),
        body: this.body
    };
}

module.exports = LyraPaymentRequest;
