let urlDeleteCard;

$(document).ready(function() {
    $('body').on('checkout:shippingMethodSelected', function (e) {
        e.preventDefault();
        updateLyra(null);
    });

    $('body').on('checkout:updateCheckoutView', function(e) {
        e.preventDefault();
        updateLyra(null);
    });

    $('#dwfrm_billing').off().on('change', function (e) {
        updateLyra($(this).serialize())
    })

    if (typeof KR !== 'undefined') {
        KR.onPopinClosed( function(event) {
            $('.next-step-button button').html(window.lastHtmlSubmitPayment);
        });

        KR.onError( function(event) {
            $('.next-step-button button').html(window.lastHtmlSubmitPayment);
        });
    }

    $('body').on('click', '.delete-card-confirmation-btn', function() {
        window.location.href = urlDeleteCard;
    });

    $('body').on('click', '.delete-card', function() {
        urlDeleteCard = $(this).data('url');
    });
});


function updateLyra(billingDetails) {
    if ($('#lyra-refresh-token').length === 0) {
        return;
    }
    var url = $('#lyra-refresh-token').data('url');
    const compactMode = $('#lyra-refresh-token').data('config-compact');
    const groupingThreshold = $('#lyra-refresh-token').data('config-groupingthreshold');
    $.ajax({
        url: url,
        type: 'get',
        data: billingDetails,
        context: this,
        dataType: 'html',
        async: true,
        success: function (data) {
            KR.setFormConfig({form: { smartform: { singlePaymentButton: { visibility: false} } } });
            KR.setFormConfig({
                formToken: JSON.parse(data).formToken.formToken,
                cardForm: {
                    layout: compactMode ? 'compact' : 'default'
                },
                smartForm: {
                    layout: compactMode ? 'compact' : 'default',
                    singlePaymentButton: true,
                    groupingThreshold: groupingThreshold ? groupingThreshold : ''
                }
            });
        }
    });
}

module.exports.updateLyra = updateLyra;