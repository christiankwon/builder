(function ($) {
    "use strict";

    var API_URL = "http://www.sinasoid.com/net/WebService.aspx?Login=christian@sinasoid.com&EncryptedPassword=270B89846E6469F62676974F08363789F23D40F8B853E565E8C1B924DD4E514B&EDI_Name=Generic\\Products&SELECT_Columns=*&WHERE_Column=p.ProductCode&WHERE_Value=",
        XML_URL = '/v/t/Builder/options.xml',
        CABLE_TYPES, CABLES, INPUT_PLUGS, OUTPUT_PLUGS, OTHER,

    getCurrentCable = function() {
        return $('ul.builder li.cable input[type="radio"]:checked').attr('id');
    },

    getQty = function() {

    },

    getOptions = function() {
        var data = [];

        $('ul.builder').children().not(':last').each(function() {
            var opt_cat_id = $(this).data('option_category_id'),
                opt_id = $(this).find('input[radio]:checked');
            if (opt_cat_id) {
                data[getOptionName('select', opt_cat_id, opt_id)] = opt_id;
            }
        });

        console.log(data);
    },

    getOptionName = function(type, option_category_id, option_id) {
        var name = "",
            cable_code = getCurrentCable();

        switch(type) {
            case 'select':
            case 'check':
            case 'checkbox':
                name = "SELECT___" + cable_code + "___" + option_category_id;
                break;
            case 'text':
            case 'textbox':
                name = "TEXTBOX___" + option_id + "___" + cable_code + "___" + option_category_id;
                break;
        }

        console.log(name);
        return name;
    },

    /**
     * Helper function that retrieves information 
     * @param {string} code Product code to be retrieved
     * @param {function} callback Callback function
     */
    getData = function(code, callback) {
        $.get( API_URL + code )
            .done(function(data) {
                callback(data);
            });
    },

    addToCart = function(product_code) {
        /**
         * ReplaceCartID, ReturnTo, btnaddtocart.x, btnaddtocart.y, and e are all attributes that were given in the product page
         * If they are required or not is unknown.
         */

        var qty = 'QTY.' + product_code;

        var Post = {
            'ProductCode': product_code,
            qty: getQty(),
            'ReplaceCartID':'',
            'ReturnTo':'',
            'btnaddtocart.x':'5',
            'btnaddtocart.y':'5',
            'e':''
        };

        Post['SELECT___CS-CT-BLDN-9778-TEST___64'] = '373';
        Post['SELECT___CS-CT-BLDN-9778-TEST___65'] = '730';
        Post['SELECT___CS-CT-BLDN-9778-TEST___77'] = '1486';
        Post['TEXTBOX___1598___CS-CT-BLDN-9778-TEST___79'] = 'Test Message Whoo!';

        $.ajax({
            url:'/ProductDetails.asp?ProductCode=' + product_code + '&AjaxError=Y',
            type: 'POST',
            cache: false,
            data: $.param(Post),
            processData: false,
            success: function(data, textStatus, XMLHttpRequest) {
                console.log(Post);
            },
            error: function() {
                return false;
            }
        });
    },

    /**
     * Takes data defined in the global variables and uses JS to build each option in each component
     */
    init = function() {
        var $cable_type_container = $('ul.builder li.cable-type div.options'),
            $cable_container = $('ul.builder li.cable div.options'),
            $input_plug_container = $('ul.builder li.input-plug div.options'),
            $output_plug_container = $('ul.builder li.output-plug div.options'),
            $other_container = $('ul.builder li.other div.options'),

        build = function(id, name, price) {
            var $struct = $('<div/>'),

                $radio = $('<input/>',{
                    type: 'radio',
                    id: id,
                }),

                $label = $('<label/>')
                    .attr('for',id)
                    .text(name);

            return $struct.append($radio, $label);
        },

        initCableTypes = function() {
            var $opt = $('<div/>').addClass('option'),
                $data = $(this);


            $data.children().each(function() {
                $opt.append($('<span/>').html($(this).text() + "<br/>"));
            });
            $cable_type_container.append($opt);
        },

        initCables = function(data) {
            var $opt = $('<div/>').addClass('option'),
                $data = $(data).find('Products'),
                code = $data.find('ProductCode').text();

            $opt.append(
                $('<input/>', {
                    type: 'radio',
                    id: code,
                }).prop('checked',true),

                $('<label/>')
                    .attr('for',code)
                    .text($data.find('ProductName').text())
            );
            $cable_container.append($opt);

        },

        initInputPlugs = function() {
            $('ul.builder li.input-plug').data('option_category_id', INPUT_PLUGS.find('option_category_id').text());

            INPUT_PLUGS.find('plug').each(function() {
                var $this = $(this),
                    id = $this.find('option_id').text(),
                    name = $this.find('manufacturer').text() + ' ' + $this.find('model').text(),
                    price = $this.find('price').text();
                $input_plug_container.append(build(id, name, price));
            });
        },

        initOutputPlugs = function() {
            $('ul.builder li.output-plug').data('option_category_id', OUTPUT_PLUGS.find('option_category_id').text());

            OUTPUT_PLUGS.find('plug').each(function() {
                var $this = $(this),
                    id = $this.find('option_id').text(),
                    name = $this.find('manufacturer').text() + ' ' + $this.find('model').text(),
                    price = $this.find('price').text();
                $output_plug_container.append(build(id, name, price));
            });
        },

        initOther = function() {

        },

        initBuilder = function() {
            // set up handler to maintain only one open section
            // this may be unnecessary depending on the accordian
        };

        if( CABLE_TYPES && CABLES && INPUT_PLUGS && OUTPUT_PLUGS && OTHER ) {
            CABLE_TYPES.find('type').each(initCableTypes);
            CABLES.find('cable').each(function(){getData($(this).find('code').text(), initCables);});
            initInputPlugs();
            initOutputPlugs();
            initOther();
            initBuilder();
        } else {
            alert("ERROR CS02: One or more of the categories did not load properly.");
        }
    },

    /**
     * Starting function of the cable builder 
     * AJAX calls the XML file that defines the different options in the builder
     * Stores the data of each component into its respective global variable
     * Calls init() to begin building each component
     */
    start = function() {
        $('#test').click(function() {
            getOptions();
        });

        $.get( XML_URL )
            .done(function(data) {
                var $data = $(data).find('options');

                CABLE_TYPES  = $data.find('cableTypes');
                CABLES       = $data.find('cables');
                INPUT_PLUGS  = $data.find('inputPlugs');
                OUTPUT_PLUGS = $data.find('outputPlugs');
                OTHER        = $data.find('other');

                init();
            })
            .fail(function( jqXHR, textStatus, errorThrown ) {
                alert("ERROR CS01: Initialization XML file not found.");
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
            });
    };
    start();

})(jQuery);


