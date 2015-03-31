(function ($) {
    "use strict";

    var API_URL = "http://www.sinasoid.com/net/WebService.aspx?Login=christian@sinasoid.com&EncryptedPassword=270B89846E6469F62676974F08363789F23D40F8B853E565E8C1B924DD4E514B&EDI_Name=Generic\\Products&SELECT_Columns=*&WHERE_Column=p.ProductCode&WHERE_Value=",
        XML_URL = '/v/t/Builder/options.xml',
        CABLE_TYPES, CABLES, PLUGS, OTHER,

    /*
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


        
         // ReplaceCartID, ReturnTo, btnaddtocart.x, btnaddtocart.y, and e are all attributes that were given in the product page
         // If they are required or not is unknown.

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
                console.log(data);
                console.log(textStatus);
                console.log(XMLHttpRequest);
            },
            error: function() {
                return false;
            }
        });
    },
    */
    

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
        function getRating(option, category) {
            var data = $(option).data(),
                value = data.specs[category] * 1;
            if( value >= 7 ) {
                return 'high';
            } else if ( value >= 4 ) {
                return 'med';
            } else {
                return 'low';
            }
        }

        console.log(this);

        var $parent = $(this).parents('.filters').parent(), // <li class="cable current" />
            $selected = $(this).parents('.filters').find('input:checked'),
            $options = $parent.find('.option');

        $options.show();

        if( $parent.hasClass('cable') ) {

            $selected.each(function() {
                var $this = $(this),
                    value = $this.val(),
                    filter = $this.attr('class');

                if( $this.attr('type') === 'radio' ) {
                    var rating;
                    $options.filter(function() {
                        rating = getRating(this, filter);
                        return value !== rating;
                    }).hide();


                }

            });
        }

        if( !$options.is(':visible').length ) {
            // all gone
        } else {
            // something
        }

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

    switchStep = function() {
        var index = $(this).parent().find('.dot').index(this),
            steps = $('ul.builder.selected');

        steps.find('.current').removeClass('current');
        steps.children().eq(index).addClass('current');

        updateDots();
    },

    toggleSpecs = function() {
        // TODO
        //var $opt = $(this).parents('div.option');
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
            // other_container       = 'li.other div.options',

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

            var $reset = $('<button/>')
                .addClass('reset')
                .text('Reset')
                .on('click', function() {
                    $(this).parents('.filters').find('input:checked').prop('checked', false);
                    applyFilter();
                });

            var $filters = $('<div/>')
                    .addClass('filters')
                    .append($reset),
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

            $c.append($filters.clone(true).addClass('cable'), $options.clone(true), $step.clone(true));
            $c.find('button.previous').remove();

            $ip.append($filters.clone(true).addClass('inputPlug'), $options.clone(true), $step.clone(true));

            $op.append($filters.clone(true).addClass('outputPlug'), $options.clone(true), $step.clone(true));

            $o.append($filters.clone(true).addClass('other'), $options.clone(true), $step.clone(true));
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
            var component = 'cable',
                $skeleton = info.skeleton,
                // cableType = info.type,      // instrument - proAudio - speaker
                index     = info.index,
                prefix    = $skeleton.data('prefix'),
                $cable = CABLES.find(component).eq(index),
                $block = getBlockSkeleton(component),
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
                colors = {};

            if( $cable.find('colors').find('option_category_id').length ) {
                colors.color_option_category_id = $cable.find('colors').find('option_category_id').text();
            }

            $cable.find('colors').find('color').each(function() {
                var $this = $(this),
                    name = $this.find('name').text(),
                    short_name = $this.find('short_name').text(),
                    id = ( $this.find('id').text() ? $this.find('id').text() : '' );

                colors['opt_' + name] = id;
                colors['short_' + name] = short_name;
            });

            // append data to this block
            $block.data({
                'type':component,
                'colors':colors,
                'specs':options.specs
            }).addClass('cable');
            fillBlock($block, options);

            // if the cable is only supposed to be a patch cable
            if( $cable.find('is_only_patch').length ) $block.addClass('only_patch');

            // append cable to premium or standard container
            if( $cable.find('is_premium').length ) {
                $skeleton.find(cable_container).find('.premium').append($block);
            } else {
                $skeleton.find(cable_container).find('.standard').append($block);
            }
        },

        initPlugs = function(type, skeleton) {
            skeleton.find(input_plug_container).data('input_plug_option_category_id', PLUGS.find(type).find('input_option_category_id').text());
            skeleton.find(output_plug_container).data('output_plug_option_category_id', PLUGS.find(type).find('output_option_category_id').text());

            var $plugs = PLUGS.find(type).find('plug'),
                which = ['inputPlug', 'outputPlug'],
                which_container = [input_plug_container, output_plug_container],
                prefix = skeleton.data('prefix'),
                build = function() {
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
                };

            for( var i = 0; i < which.length; i++ ) {
                $plugs.each(build);
            }
        },

        initFilters = function() {
            var getCableFilter = function() {
                function colorFilter(parent) {
                    var $filterContainer = $('<div/>').addClass('filterContainer color');
                    $('<h2/>').text('Color:').appendTo($filterContainer);

                    var colors = [], lcolors = [],// [long_name][short_name]
                        $filterColor = $('<div/>').addClass('filter'),
                        $options = $(parent).find('.option');

                    $options.each(function() {
                        var data_colors = $(this).data('colors');

                        for( var c in data_colors ) {
                            if( c.indexOf('short_') !== -1 ) {
                                var bool = false;
                                for( var i = 0; i < lcolors.length; i++ ) {
                                    if( lcolors[i][0] === c ) {
                                        bool = true;
                                    }
                                }

                                if( !bool ) {
                                    var long_colors = [];
                                    long_colors[0] = c;
                                    long_colors[1] = data_colors[c];
                                    lcolors.push(long_colors);
                                }
                            }

                            if( c.indexOf('opt_') !== -1 ) {
                                var clr = c.substring(4);

                                // if the color does not exist in the array
                                // push it
                                if( $.inArray(clr, colors) == -1 ) {
                                    colors.push(clr);
                                }
                            }
                        }
                    });

                    if( colors.length !== lcolors.length ) {
                        console.error("ERROR CS04: The cable color filter is missing an element.");
                    }

                    var num_colors = colors.length;

                    for( var i = 0; i < num_colors; i++ ) {
                        var color = colors[i];
                        var $filter = $('<div/>').addClass('filter-option');
                        var value = '';

                        for( var j = 0; j < num_colors; j++ ) {
                            if( lcolors[j][0].indexOf(color) > -1 ) {
                                value = lcolors[j][1];
                                break;
                            }
                        }

                        if( !value ) {
                            console.error("ERROR CS05: The cable color filter is misconfigured.");
                        }

                        var $label = $('<label/>')
                                .attr('for', 'filter-color-' + color)
                                .text(value),
                            $box = $('<input/>', {
                                'type': 'checkbox',
                                'name': $(parent).parents('ul.builder').data('prefix') + 'filter-color',
                                'id': 'filter-color-' + color,
                                'value': color
                            }).addClass('color').change(applyFilter);

                        $filter.append($box, $label).appendTo($filterColor);
                    }

                    $filterContainer.append($filterColor);

                    $(parent).find('.filters').append($filterContainer);
                }

                function brightnessFilter(parent) {
                    var $filterContainer = $('<div/>').addClass('filterContainer brightness');
                    $('<h2/>').text('Brightness:').appendTo($filterContainer);

                    var $filterBrightness = $('<div/>').addClass('filter'),
                        options = ['high','med', 'low'];

                    $(options).each(function() {
                        var $filter = $('<div/>').addClass('filter-option');
                        var $label = $('<label/>')
                                .attr('for', 'filter-brightness-' + this)
                                .text(this),
                            $radio = $('<input/>', {
                                'type': 'radio',
                                'name': $(parent).parents('ul.builder').data('prefix') + 'filter-brightness',
                                'id': 'filter-brightness-' + this,
                                'value': this
                            }).addClass('brightness').change(applyFilter);

                        $filter.append($radio, $label).appendTo($filterBrightness);
                    });

                    $filterContainer.append($filterBrightness);

                    $(parent).find('.filters').append($filterContainer);
                }

                function flexibilityFilter(parent) {
                    var $filterContainer = $('<div/>').addClass('filterContainer flexibility');
                    $('<h2/>').text('Flexibility:').appendTo($filterContainer);

                    var $filterFlexibility = $('<div/>').addClass('filter'),
                        options = ['high','med', 'low'];

                    $(options).each(function() {
                        var $filter = $('<div/>').addClass('filter-option');
                        var $label = $('<label/>')
                                .attr('for', 'filter-flexibility-' + this)
                                .text(this),
                            $radio = $('<input/>', {
                                'type': 'radio',
                                'name': $(parent).parents('ul.builder').data('prefix') + 'filter-flexibility',
                                'id': 'filter-flexibility-' + this,
                                'value': this
                            }).addClass('flexibility').change(applyFilter);

                        $filter.append($radio, $label).appendTo($filterFlexibility);
                    });

                    $filterContainer.append($filterFlexibility);

                    $(parent).find('.filters').append($filterContainer);
                }

                $('ul.builder li.cable').each(function() {
                    colorFilter(this);
                    brightnessFilter(this);
                    flexibilityFilter(this);
                });
            };

            getCableFilter();
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
                $skeleton.data('prefix', prefix);

            if( $data.has('default').length ) {
                $tab.addClass('selected');
                $skeleton.addClass('selected');
            }

            $tab.append(
                $('<span/>')
                    .text(tag)
                    .data('type',type)
                )
                .data('tab', type)
                .click(changeTab);

            CABLES.find('cable').filter(function() {
                return $(this).find("is_" + type).length !== 0;
            }).each(function() {
                var info = {
                        index: CABLES.find('cable').index(this),
                        code: $(this).find('code').text(),
                        type: type,
                        skeleton: $skeleton
                    };
                getData(initCables, info);
            });

            initPlugs(type, $skeleton);

            $cable_type_container.append($tab);
            $builders_container.append($skeleton);
        };

        if( CABLE_TYPES && CABLES && PLUGS && OTHER ) {
            CABLE_TYPES.find('type').each(initBuilders);
        } else {
            alert("ERROR CS02: One or more of the categories did not load properly.");
        }

        init.filters = initFilters;
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
            init.filters();
            $('.loader').fadeOut('fast');
        });
    };
    start();

})(jQuery);
