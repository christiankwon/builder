(function ($) {
    "use strict";

    var API_URL = "http://www.sinasoid.com/net/WebService.aspx?Login=christian@sinasoid.com&EncryptedPassword=270B89846E6469F62676974F08363789F23D40F8B853E565E8C1B924DD4E514B&EDI_Name=Generic\\Products&SELECT_Columns=*&WHERE_Column=p.ProductCode&WHERE_Value=",
        XML_URL = '/v/t/Builder/options.xml',
        CABLE_TYPES, CABLES, PLUGS, OTHER,

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

            },
            error: function() {
                return false;
            }
        });
    },

    getTypeFromClasses = function(obj) {
        var arr = ['cable', 'inputPlug', 'outputPlug', 'other'];
        var classes = obj.className.split(/\s+/);

        for( var i = 0; i < classes.length; i++ ) {
            // needle   - classes[i]
            // haystack - arr
            var index = $.inArray(classes[i], arr);
            if( index > -1 ) {
                return classes[i];
            }
        }
        return null;
    },

    updateVisual = function() {
        var $inputs = $('ul.builder.selected li.progress input'),
            $display = $('div.display');

        $display.find('div').empty();

        $inputs.each(function() {
            var name = $(this).attr('name'),
                id = $(this).val();

            $display.find('.' + name).append($('#' + id).parent().clone());
        });
    },

    updateDots = function() {
        var $tracker = $('.tracker');
        $('ul.builder.selected').children().not(':last').each(function() {
            var type = getTypeFromClasses(this),
                $dot = $tracker.find('.dot.' + type);
            if( $(this).find('input[type="radio"]:checked').length ) {
                $dot.addClass('done');
            } else {
                $dot.removeClass('done');
            }
        });
    },

    applyFilter = function() {
        
    },

    changeOption = function() {
        var $this = $(this).parent(),
            $radio = $this.find('input[type="radio"]'),
            $progress = $this.parents('ul.builder').find('li.progress'),
            $p = $progress.find('input[name="' + $this.data('type') + '"]'),
            val = $this.find('input.selector').attr('id');

        if( !$radio.prop('checked') ) {
            $radio.prop('checked', true);
            $p.val(val);
        } else {
            $radio.prop('checked', false);
            $p.val('0');
        }
    },

    /**
     * Onclick function - displays builder depending on clicked cable type
     */
    changeTab = function() {
        if( $(this).hasClass('selected') ) return;

        var $tabs = $('.cableTypes .tab'),
            $builders = $('.builder');

        $tabs.removeClass('selected');
        $builders.removeClass('selected');

        $(this).addClass('selected');
        $('#' + $(this).data('tab')).addClass('selected');

        updateDots();
    },

    changeStep = function() {
        $(this).parents('li').removeClass('current');

        if( $(this).hasClass('next') ) {
            $(this).parents('li').next().addClass('current');
        } else {
            $(this).parents('li').prev().addClass('current');
        }

        updateDots();
    },

    switchStep = function(e) {
        var index = $(this).parent().find('.dot').index(this),
            steps = $('ul.builder.selected');

        steps.find('.current').removeClass('current');
        steps.children().eq(index).addClass('current');

        updateDots();
    },

    toggleSpecs = function() {
        var $opt = $(this).parents('div.option');
    },

    /**
     * Takes data defined in the global variables and uses JS to build each option in each component
     */
    init = function() {
        var $builders_container   = $('div.builders'),
            $cable_type_container = $('div.builders ul.cableTypes'),
            cable_container       = 'li.cable div.options',
            input_plug_container  = 'li.inputPlug div.options',
            output_plug_container = 'li.outputPlug div.options',
            other_container       = 'li.other div.options',

        /**
         * Helper function that retrieves information 
         * @param {string} code Product code to be retrieved
         * @param {function} callback Callback function
         */
        getData = function(callback, info) {
            var code = info.code,
                index = info.index;

            if( !code || !index && index !== 0 ) return;

            $.get( API_URL + code )
                .done(function(data) {
                    callback(data, info);
                })
                .fail(function( jqXHR, textStatus, errorThrown ) {
                    alert("ERROR CS03: " + code + "not found in the product database.");
                    console.error(jqXHR);
                    console.error(textStatus);
                    console.error(errorThrown);
                });
        },

        getBuilderSkeleton = function(id) {
            var $skeleton = $('<ul/>').addClass('builder'),
                $c = $('<li/>').addClass('cable'),
                $ip = $('<li/>').addClass('inputPlug'),
                $op = $('<li/>').addClass('outputPlug'),
                $o = $('<li/>').addClass('other'),
                $p = $('<li/>').addClass('progress');

            var $filters = $('<div/>').addClass('filters'),
                $options = $('<div/>')
                    .addClass('options')
                    .append(
                        $('<div/>')
                            .addClass('premium')
                            .append(
                                    $('<h3/>').text('Premium')
                                ),
                        $('<div/>')
                            .addClass('standard')
                            .append(
                                    $('<h3/>').text('Standard')
                                )
                    ),
                $step = $('<div/>')
                    .addClass('step')
                    .append(
                        $('<button/>')
                            .addClass('previous')
                            .text('Previous')
                            .click(changeStep),
                        $('<button/>')
                            .addClass('next')
                            .text('Next')
                            .click(changeStep)
                    );

            $c.append($filters.clone().addClass('cable'), $options.clone(), $step.clone(true));
            $c.find('button.previous').remove();

            $ip.append($filters.clone().addClass('inputPlug'), $options.clone(), $step.clone(true));

            $op.append($filters.clone().addClass('outputPlug'), $options.clone(), $step.clone(true));

            $o.append($filters.clone().addClass('other'), $options.clone(), $step.clone(true));
            $o.find('button.next').remove();

            $p.append(
                $('<input/>', {
                    name: "cable",
                    type: "hidden",
                    value: "0"
                }),
                $('<input/>', {
                    name: "inputPlug",
                    type: "hidden",
                    value: "0"
                }),
                $('<input/>', {
                    name: "outputPlug",
                    type: "hidden",
                    value: "0"
                }),
                $('<input/>', {
                    name: "other",
                    type: "hidden",
                    value: "0"
                })
            );

            if (id) $skeleton.attr('id', id);

            $skeleton.append($c, $ip, $op, $o, $p);

            return $skeleton;
        },

        getCableFilter = function(parent) {
            function brightnessFilter() {
                var $container = $('<div/>').addClass('filter brightness'),
                    $title = $('<h2/>').text('Brightness:');

                $(options).each(function() {
                    var tag = 'filter-brightness',
                        name = tag + '-' +this,
                        $filter = $('<div/>').addClass('filter-option'),
                        $label = $('<label/>')
                            .attr('for', name)
                            .text(this),
                        $box = $('<input/>', {
                            'type': 'radio',
                            'name': tag,
                            'id': name,
                            'value': name
                        }).change(applyFilter);

                    $filter.append($box, $label).appendTo($container);
                });

                return $container.append($title);
            }

            function flexibilityFilter() {
                var $container = $('<div/>').addClass('filter flexibility'),
                    $title = $('<h2/>').text('Flexibility:');

                $(options).each(function() {
                    var tag = 'filter-flexibility',
                        name = tag + '-' + this,
                        $filter = $('<div/>').addClass('filter-option'),
                        $label = $('<label/>')
                            .attr('for', name)
                            .text(this),
                        $box = $('<input/>', {
                            'type': 'radio',
                            'name': tag,
                            'id': name,
                            'value': name
                        }).change(applyFilter);

                    $filter.append($box, $label).appendTo($container);
                });

                return $container.append($title);
            }

            function colorFilter() {
                var $filterColor = $('<div/>').addClass('filter color'),
                    $title = $('<h2/>').text('Color:');

                $filterColor.append($title);
                $(color_options).each(function(i) {
                    var $filter = $('<div/>').addClass('filter-option');

                    var $label = $('<label/>')
                            .attr('for', 'filter-color-' + this)
                            .text(this),
                        $box = $('<input/>', {
                            'type': 'checkbox',
                            'name': 'filter-color',
                            'id': 'filter-color-' + this,
                            'value': color_option_labels[i]
                        }).change(applyFilter);

                    $filter.append($box, $label).appendTo($filterColor);
                });

                return $filterColor;
            }

            var color_options = ['red','orange','yellow','green','blue','black'],
                color_option_labels = ['red','org','ylw','grn','blu','blk'],
                options = ['high','med','low'];

            parent.append(brightnessFilter(), flexibilityFilter(), colorFilter());
        },

        getBlockSkeleton = function(type) {
            var $struct = $('<div/>')
                    .addClass('option'),

                $image = $('<div/>')
                    .addClass('image')
                    .append($('<img/>')),

                $name = $('<div/>')
                    .addClass('name')
                    .append($('<span/>')),

                $price = $('<div/>')
                    .addClass('price')
                    .append($('<span/>')),

                $selector = $('<input/>')
                    .addClass('selector')
                    .attr('type','radio'),

                $button = $('<div/>')
                    .addClass('select')
                    .append($('<button/>').text('Pick Me!')),

                $specs = $('<div/>')
                    .addClass('specs')
                    .append($('<span/>').text('Specs & Info'))
                    .click(toggleSpecs);

            if( type === 'cable' ) {
                $specs.append(
                    $('<div/>').append(
                                $('<ul/>')
                                    .addClass('tone')
                                    .append(
                                            $('<li/>')
                                                .addClass('title')
                                                .text('Tone')
                                        ),
                                $('<ul/>')
                                    .addClass('construction')
                                    .append(
                                            $('<li/>')
                                                .addClass('title')
                                                .text('Construction')
                                        )
                            )
                );
            } else if( type === 'plug' ) {
                // TODO
            }

            $struct.append($selector, $image, $name, $price, $specs, $button);

            $struct.children().not('div.specs').click(changeOption);

            return $struct;
        },

        fillBlock = function(block, options) {
            block.find('input.selector')
                .attr('name', options.component)
                .attr('id', options.id);

            block.find('.image img')
                .attr('src', options.image_src)
                .attr('alt', options.image_alt);

            block.find('.name span')
                .text(options.name);

            block.find('.price span')
                .text(options.price);

            if( options.component.indexOf('cable') > -1 ) {

                block.find('.specs div ul').eq(0)
                    .append(
                            $('<li/>').html('Brightness: <em>' + options.specs.brightness + '</em>'),
                            $('<li/>').html('Capacitance: <em>' + options.specs.capacitance + '</em>')
                        );

                block.find('.specs div ul').eq(1)
                    .append(
                            $('<li/>').html('Flexibility: <em>' + options.specs.flexibility + '</em>'),
                            $('<li/>').html('Shield: <em>' + options.specs.shield + '</em>'),
                            $('<li/>').html('Diameter: <em>' + options.specs.diameter + '</em>')
                        );
            } else if( options.component.indexOf('plug') > -1 ) {
                // TODO
            }
        },

        /**
         * Initialize cables for cableType and fill skeleton
         * @param cableType {string}
         * @param skeleton {jQuery Object}
         */
        initCables = function(data, info) {
            var $skeleton = info.skeleton,
                cableType = info.type,
                index     = info.index,
                prefix    = info.prefix,
                component = 'cable';
            
            var $cable = CABLES.find(component).eq(index);

            var $block = getBlockSkeleton(component),
                options = {
                    id: prefix + $cable.find('code').text(),
                    name: $(data).find('ProductName').text(),
                    price: $cable.find('price').text(),
                    image_alt: $(data).find('ProductName').text(),
                    image_src: 'http://placehold.it/200x200',
                    component: prefix + component,
                    specs: {
                        brightness: $cable.find('brightness').text(),
                        capacitance: $cable.find('capacitance').text(),
                        flexibility: $cable.find('flexibility').text(),
                        shield: $cable.find('shield').text(),
                        diameter: $cable.find('diameter').text(),
                    }
                },
                color = {};

            if( $cable.find('colors').find('option_category_id').length ) {
                color['color_option_category_id'] = $cable.find('colors').find('option_category_id').text();
            }

            $cable.find('colors').find('color').each(function() {
                var $this = $(this), name = '', id = null;
                if( $this.find('id').length ) {
                    name = $this.find('desc').text();
                    color[name] = $this.find('id').text();
                } else {
                    name = $this.text();
                    color[name] = '';
                }

                $block.addClass('filter-color-' + name);
            });

            var range = [0, 4, 7], brightness, flexibility;
            if( options.specs.brightness * 1 >= range[2] ) brightness = 'high';
            else if( options.specs.brightness * 1 >= range[1] ) brightness = 'med';
            else brightness = 'low';

            if( options.specs.flexibility * 1 >= range[2] ) flexibility = 'high';
            else if( options.specs.flexibility * 1 >= range[1] ) flexibility = 'med';
            else flexibility = 'low';

            $block.addClass('filter-brightness-' + brightness);
            $block.addClass('filter-flexibility-' + flexibility);

            $block.data({
                'type':component,
                'colors':color,
                'specs':options.specs
            }).addClass('cable');
            fillBlock($block, options);

            if( $cable.find('is_only_patch').length ) $block.addClass('only_patch');

            if( $cable.find('is_premium').length ) {
                $skeleton.find(cable_container).find('.premium').append($block);
            } else {
                $skeleton.find(cable_container).find('.standard').append($block);
            }
        },

        initPlugs = function(type, skeleton, prefix) {
            skeleton.find(input_plug_container).data('input_plug_option_category_id', PLUGS.find(type).find('input_option_category_id').text());
            skeleton.find(output_plug_container).data('output_plug_option_category_id', PLUGS.find(type).find('output_option_category_id').text());

            var $plugs = PLUGS.find(type).find('plug'),
                which = ['inputPlug', 'outputPlug'],
                which_container = [input_plug_container, output_plug_container];

            for( var i = 0; i < which.length; i++ ) {
                $plugs.each(function() {
                    var $this = $(this),
                        $block = getBlockSkeleton(type),
                        options = {
                            id: 'plug_' + $plugs.index(this),
                            name: $this.find('manufacturer').text() + ' ' + $this.find('model').text(),
                            price: $this.find('price').text(),
                            image_alt: $this.find('manufacturer').text() + ' ' + $this.find('model').text(),
                            image_src: 'http://placehold.it/200x200',
                            component: prefix + which[i],
                            specs: {
                                image_src: 'http://placehold.it/200x200'
                            }
                        },
                        data = {
                            'input_option_id': $this.find('input_option_id').text(),
                            'output_option_id': $this.find('output_option_id').text(),
                            'color_body': $this.find('color body').text(),
                            'color_connector': $this.find('color connector').text(),
                            'type': which[i]
                        };
                    fillBlock($block, options);
                    $block.data(data).addClass('plug');

                    if( $this.find('is_premium').length ) {
                        skeleton.find(which_container[i]).find('.premium').append($block);
                    } else {
                        skeleton.find(which_container[i]).find('.standard').append($block);
                    }
                });
            }
        },

        initFilters = function(skeleton) {
            skeleton.children().not(':last').each(function() {
                var $filters = $(this).children('.filters'),
                    type = getTypeFromClasses(this);

                if( type ) {
                    switch(type) {
                        case 'cable':
                            getCableFilter($filters);
                            break;
                        case 'inputPlug':
                            break;
                        case 'ouputPlug':
                            break;
                        case 'other':
                            break;
                    }
                }
            });
        },

        initBuilders = function() {
            var $tab = $('<li/>').addClass('tab'),
                $data = $(this),
                id = $data.children('id').text(),
                type = '',
                tag = '',
                prefix = '';

            switch( id ) {
                case "CSB1":
                    type = 'instrument';
                    tag = 'Instrument';
                    prefix = 'ins_';
                    break;
                case "CSB2":
                    type = 'proAudio';
                    tag = 'Pro Audio';
                    prefix = 'pro_';
                    break;
                case "CSB3":
                    type = 'speaker';
                    tag = 'Speaker';
                    prefix = 'spk_';
                    break;
            }

            if( !type ) {
                console.error('ID: "' + id + '" has not been defined.');
                return;
            }

            var $skeleton = getBuilderSkeleton(type);

            if( $data.has('default').length ) {
                $tab.addClass('selected');
                $skeleton.addClass('selected');
            }

            initFilters($skeleton);

            $tab.append(
                $('<span/>')
                    .text(tag)
                    .data('type',type)
            ).data('tab', type).click(changeTab);

            CABLES.find('cable').filter(function() {
                return $(this).find("is_" + type).length !== 0;
            }).each(function() {
                var info = {
                    index: CABLES.find('cable').index(this),
                    code: $(this).find('code').text(),
                    type: type,
                    skeleton: $skeleton,
                    prefix: prefix
                };
                getData(initCables, info);
            });


            initPlugs(type, $skeleton, prefix);

            $cable_type_container.append($tab);
            $builders_container.append($skeleton);
        };

        if( CABLE_TYPES && CABLES && PLUGS && OTHER ) {
            CABLE_TYPES.find('type').each(initBuilders);
        } else {
            alert("ERROR CS02: One or more of the categories did not load properly.");
        }
    },

    ready = function() {
        // set cable builder to default settings
        $('ul.builder').each(function() {
            $(this).find('li').first().addClass('current');
        });

        $('.tracker .dot').click(switchStep);
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

        $('#test').click(updateVisual);

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

        $(document).ajaxStop(function() {
            ready();
            $('.loader').fadeOut('fast');
        });
    };
    start();

})(jQuery);
