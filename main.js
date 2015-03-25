(function ($) {
    "use strict";

    var API_URL = "http://www.sinasoid.com/net/WebService.aspx?Login=christian@sinasoid.com&EncryptedPassword=270B89846E6469F62676974F08363789F23D40F8B853E565E8C1B924DD4E514B&EDI_Name=Generic\\Products&SELECT_Columns=*&WHERE_Column=p.ProductCode&WHERE_Value=",
        XML_URL = '/v/t/Builder/options.xml',
        CABLE_TYPES, CABLES, PLUGS, OTHER,

    getCurrentCable = function() {
        return $('ul.builder li.cable input[type="radio"]:checked').attr('id');
    },

    getOptions = function() {
        var data = {};

        $('ul.builder').children().each(function() {
            var opt_cat_id = $(this).data('option_category_id'),
                opt_id = $(this).find('input[type="radio"]:checked').val();
            if (opt_cat_id && opt_id) {
                var optionName = getOptionName('select', opt_cat_id, opt_id);
                data[optionName] = opt_id;
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
        //  Check cable for completion
        //  if true
        //      find each component of cable
        //      update each component with option name
        //      add to cart


        /**
         * ReplaceCartID, ReturnTo, btnaddtocart.x, btnaddtocart.y, and e are all attributes that were given in the product page
         * If they are required or not is unknown.
         */

        var qty = 'QTY.' + product_code;

        var Post = {
            'ProductCode': product_code,
            qty: '1',

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

    selectOption = function(e) {
        // determine if clicked option is being selected or de-selected
        // if selected,   update hidden progress for current step to 1
        //                update live feed with new option
        // if deselected, remove this option from live feed
        //                reset hidden progress for current step to 0
        //                uncheck radio button
    },

    /**
     * Takes data defined in the global variables and uses JS to build each option in each component
     */
    init = function() {
        var $cable_type_container  = $('ul.builder li.cableType div.tabs'),
            $cable_container       = $('ul.builder li.cable div.options'),
            $input_plug_container  = $('ul.builder li.inputPlug div.options'),
            $output_plug_container = $('ul.builder li.outputPlug div.options'),
            $other_container       = $('ul.builder li.other div.options'),

        build = function(id, name, price, component, image, specs) {
            var $struct = $('<div/>')
                    .addClass('option')
                    .addClass(component),

                $image = $('<div/>')
                    .addClass('image')
                    .append($('<img/>', {src: image, alt: name})),

                $name = $('<div/>')
                    .addClass('name')
                    .append($('<span/>').text(name)),

                $price = $('<div/>')
                    .addClass('price')
                    .append($('<span/>').text(price)),

                $selector = $('<input/>',{
                        type: 'radio',
                        id: id,
                        name: component,
                        value: id
                    })
                    .addClass('selector'),

                $button = $('<div/>')
                    .addClass('select')
                    .append($('<button/>').text('Pick Me!')),

                $specs = $('<div/>')
                    .addClass('specs')
                    .append($('<span/>').text('Specs & Info'))
                    .click(function(e) {
                        // Force disable select
                        e.stopPropagation();
                    });

                $struct.append($selector, $image, $name, $price, $specs, $button);
                
            return $struct;
        },

        initCableTypes = function() {
            var $tab = $('<div/>').addClass('tab'),
                $data = $(this),
                id = $data.children('id').text(),
                type = "",
                tag = "";

            switch( id ) {
                case "CSB1":
                    type = "instrument";
                    tag = "Instrument";
                    break;
                case "CSB2":
                    type = "proAudio";
                    tag = "Pro Audio";
                    break;
                case "CSB3":
                    type = "speaker";
                    tag = "Speaker";
                    break;
            }

            if( !type ) {
                console.error('ID: "' + id + '" has not been defined.');
                return;
            }

            if( $data.has('default').length ) $tab.addClass('selected');

            $tab.append(
                $('<span/>')
                    .addClass('tab  ' + type)
                    .text(tag)
                    .data('type',type)
            );

            $cable_type_container.append($tab);
        },

        initCables = function(data) {
            $('ul.builder li.inputPlug').data('option_category_id', INPUT_PLUGS.find('option_category_id').text());

            var $opt = $('<div/>').addClass('option'),
                $data = $(data).find('Products'),
                code = $data.find('ProductCode').text();

            $opt.append(
                $('<input/>', {
                    type: 'radio',
                    id: code,
                    name: 'cable',
                }).prop('checked',true),

                $('<label/>')
                    .attr('for',code)
                    .text($data.find('ProductName').text())
            );
            $cable_container.append($opt);
        },

        initPlugs = function() { 
            $('ul.builder li.inputPlug').data('option_category_id', INPUT_PLUGS.find('option_category_id').text());

            PLUGS.find('plug').each(function() {
                var $this = $(this),
                    id = $this.find('option_id').text(),
                    name = $this.find('manufacturer').text() + ' ' + $this.find('model').text(),
                    price = $this.find('price').text(),
                    component = 'inputPlug',
                    image = 'http://placehold.it/200x200',
                    specs = [];

                $input_plug_container.append(build(id, name, price, component, image, specs));
            });
        },

        initOther = function() {

        },

        initBuilder = function() {
            // set up handler to maintain only one open section
            // this may be unnecessary depending on the accordian
        };

        if( CABLE_TYPES && CABLES && PLUGS && OTHER ) {
            CABLE_TYPES.find('type').each(initCableTypes);
            CABLES.find('cable').each(function(){getData($(this).find('code').text(), initCables);});
            // initPlugs();
            // initOther();
            // initBuilder();
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
        // if page loads with GET options, load cable with options
        // if page loads with COMPARISON cables, load cables into comparison build and select first cable

        $('#test').click(function() {
            getOptions();
        });

        $.get( XML_URL )
            .done(function(data) {
                var $data = $(data).find('options');

                CABLE_TYPES = $data.children('cableTypes');
                CABLES      = $data.children('cables');
                PLUGS       = $data.children('plugs');
                OTHER       = $data.children('other');

                init();
            })
            .fail(function( jqXHR, textStatus, errorThrown ) {
                alert("ERROR CS01: Initialization XML file not found.");
                console.error(jqXHR);
                console.error(textStatus);
                console.error(errorThrown);
            });
    };
    start();

})(jQuery);
