(function ($) {
    "use strict";

    var API_URL = "http://www.sinasoid.com/net/WebService.aspx?Login=christian@sinasoid.com&EncryptedPassword=270B89846E6469F62676974F08363789F23D40F8B853E565E8C1B924DD4E514B&EDI_Name=Generic\\Products&SELECT_Columns=*&WHERE_Column=p.ProductCode&WHERE_Value=",
        XML_URL = '/v/t/Builder/options.xml',
        IMAGES_DIR = 'images/',
        INITIALIZED = false,
        OPTIONS_XML, CABLE_TYPES, CABLES, PLUGS, OTHER, CURRENT_CABLE = null,
        DEFAULT_CABLE_LENGTH = 10,
        DEFAULT_CABLE_LENGTH_TYPE = 'regular',
        DEFAULT_CABLETYPE_TYPE = '',
        DEFAULT_CABLETYPE_PREFIX = '',
        BLANK_IMAGE_URL = 'blank.png',
        Cable = function() {
            this.storage = -1;
            this.cableType = {
                prefix: DEFAULT_CABLETYPE_PREFIX,
                type: DEFAULT_CABLETYPE_TYPE
            };
            this.cable = {
                code: '',
                color: '',
                name: '',
                manufacturer: ''
            };
            this.length = {
                amount: DEFAULT_CABLE_LENGTH,
                type: DEFAULT_CABLE_LENGTH_TYPE,
            };
            this.inputPlug = {
                manufacturer: '',
                model: '',
                boot: '', // color
                color: '',
                index: -1
            };
            this.outputPlug = {
                manufacturer: '',
                model: '',
                boot: '', // color
                color: '',
                index: -1
            };
            this.other = {
                heatshrink: false,
                techflex: '' // color
            };
        },

    /**
     * JSON hack to return a deep copy of an object
     * @param  {Object} obj [Assumed that obj is of type Cable]
     * @return {Object}     [Returns a clone of obj]
     */
    clone = function(obj) {
        return (JSON.parse(JSON.stringify(obj)));
    },

    reset = function() {
        var $builder = $('ul.builder.selected'),
            $length = $builder.find('.length'),
            $display = $('div.display');

        $builder.find('input:checked').prop('checked', false);
        $length.find('input[name="switch"]').removeClass().addClass('regular');
        $length.find('.ruler.patch').slider('value',12);
        $length.find('.ruler.regular').slider('value',10);
        $length.find('input.patch').val(12);
        $length.find('input.regular').val(10);

        $display.find('img').attr('src',BLANK_IMAGE_URL);

        $('.tracker .dot').removeClass('done');

        CURRENT_CABLE = new Cable();
    },

    formatImage = function(str) {
        return str.replace(/ /g,'-').toLowerCase();
    },

    /**
     * Generates the name of the property used in the add to cart object
     * @param  {string} type       [HTML input type]
     * @param  {string} cable      [Selected cable]
     * @param  {string} opt_cat_id [Category id of selected option]
     * @param  {string} option_id  [Id of selected option]
     * @return {string}            [Name used in add to cart object]
     */
    getOptionName = function(type, cable, opt_cat_id, opt_id) {
        var name = "";

        switch(type) {
            case 'select':
            case 'check':
            case 'checkbox':
                name = "SELECT___" + cable + "___" + opt_cat_id;
                break;
            case 'text':
            case 'textbox':
                name = "TEXTBOX___" + opt_id + "___" + cable + "___" + opt_cat_id;
                break;
        }
        return name;
    },

    addToCart = function() {
        function complete() {
            return true;
        }

        if( complete() ) {
            var _cable = clone(CURRENT_CABLE);

            var prefix = _cable.cableType.prefix,
                cable_code = _cable.cable.code,
                qty = 'QTY.' + cable_code;

            var Post = {
                'ProductCode': cable_code,
                qty: '2',

                'ReplaceCartID':'',
                'ReturnTo':'',
                'btnaddtocart.x':'5',
                'btnaddtocart.y':'5',
                'e':''
                //SELECT___CS-CT-EVIA-MNRL-TEST___73: 1270
            };

            var opt_cat_id, opt_id;

            opt_id     = $('#' + prefix + cable_code).parent().data().lengths[_cable.length.type + (_cable.length.amount * 1)];
            opt_cat_id = CABLES.find('lengths').find('option_category_id').text();
            Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;

            opt_id = PLUGS.find('plug').filter(function() {
                    return $(this).find('manufacturer').text() == _cable.inputPlug.manufacturer &&
                           $(this).find('model').text() == _cable.inputPlug.model;
                }).find('input_option_id').text();
            opt_cat_id = PLUGS.find(_cable.cableType.type).find('input_option_category_id').text();
            Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;

            opt_id = PLUGS.find('plug').filter(function() {
                    return $(this).find('manufacturer').text() == _cable.outputPlug.manufacturer &&
                           $(this).find('model').text() == _cable.outputPlug.model;
                }).find('input_option_id').text();
            opt_cat_id = PLUGS.find(_cable.cableType.type).find('output_option_category_id').text();
            Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;

            if( _cable.other.heatshrink ) {
                opt_id = OTHER.find('heatshrink').find('option_id').text();
                opt_cat_id = OTHER.find('heatshrink').find('option_category_id').text();
                Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;
            }

            if( _cable.other.techflex ) {
                opt_id = OTHER.find('techflex').find('color').find('option').filter(function() {
                        return $(this).find('desc').text() == _cable.other.techflex;
                    }).find('id').text();
                opt_cat_id = OTHER.find('techflex').find('color').find('option_category_id').text();
                Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;
            }

            $.ajax({
                url:'/ProductDetails.asp?ProductCode=' + cable_code + '&AjaxError=Y',
                type: 'POST',
                cache: false,
                data: $.param(Post),
                processData: false
            }).done(function() {
                // redirect to cart?
            }).fail(function(jqXHR, textStatus, errorThrown) {
                alert("ERROR CS05: Something went wrong while adding this to the cart. I bet the intern monkey broke something again...");
                console.error(jqXHR);
                console.error(textStatus);
                console.error(errorThrown);
            });
        }
    },

    updateStorage = function() {
        function getUnits() {
            if( CURRENT_CABLE.length.type === 'regular' ) return 'ft'; 
            if( CURRENT_CABLE.length.type === 'patch' ) return 'in';
        }

        function getCable() {
            if( !CURRENT_CABLE.cableType.prefix || !CURRENT_CABLE.cable.code ) return '';
            return $('#' + CURRENT_CABLE.cableType.prefix + CURRENT_CABLE.cable.code).parent().data().name;
        }
        var $storage = $('.storage .build').filter(function() {
                return $(this).data('storage') == CURRENT_CABLE.storage;
            }),
            $info = $storage.find('.information');

        $info.find('.type em').text(CURRENT_CABLE.cableType.type);
        $info.find('.cable em').text(getCable());
        $info.find('.length em').text(CURRENT_CABLE.length.amount + '' + getUnits());
        $info.find('.input em').text(CURRENT_CABLE.inputPlug.manufacturer + ' ' + CURRENT_CABLE.inputPlug.model);
        $info.find('.output em').text(CURRENT_CABLE.outputPlug.manufacturer + ' ' + CURRENT_CABLE.outputPlug.model);
    },

    getCableColor = function(color) {
        switch(color) {
            case 'black': return '.b';
            case 'green': return '.g';
            case 'orange': return '.o';
            case 'red': return '.r';
            case 'yellow': return '.y';
            case 'white': return '.w';
            default: return '';
        }
    },

    getBootColor = function(color) {
        switch(color) {
            case 'black': return 'b';
            case 'green': return 'g';
            case 'orange': return 'o';
            case 'red': return 'r';
            case 'violet': return 'v';
            case 'yellow': return 'y';
            default: return '';
        }
    },

    updateVisual = function() {
        var $display = $('div.display'),
            CC = clone(CURRENT_CABLE),
            // inboot = '/' + getBootColor(CC.inputPlug.boot),
            // outboot = '/' + getBootColor(CC.outputPlug.boot),
            cable_color = (CC.cable.color ? '.' + CC.cable.color : ''),
            cable_src = IMAGES_DIR + 'display/cable/' +
                        CC.cableType.type + '/' +
                        CC.length.type + '/' +
                        formatImage(CC.cable.manufacturer) + '/' +
                        formatImage(CC.cable.name.substring(CC.cable.manufacturer.length + 1)) +
                        cable_color + '.png',

            // boot_color = ()
            inPlug_src = IMAGES_DIR + 'display/plug/' +
                         CC.cableType.type + '/' +
                         formatImage(CC.inputPlug.manufacturer) + '/' +
                         formatImage(CC.inputPlug.model + CC.inputPlug.color) + '.png',

            outPlug_src = IMAGES_DIR + 'display/plug/' +
                         CC.cableType.type + '/' +
                         formatImage(CC.outputPlug.manufacturer) + '/' +
                         formatImage(CC.outputPlug.model + CC.outputPlug.color) + '.png';

        if ( CC.cable.code ) $display.find('.cable img').attr('src', cable_src);
        if ( CC.inputPlug.manufacturer && CC.inputPlug.model ) $display.find('.inputPlug img').attr('src', inPlug_src);
        if ( CC.outputPlug.manufacturer && CC.outputPlug.model ) $display.find('.outputPlug img').attr('src', outPlug_src);
    },

    updateDots = function() {
        var $tracker = $('.tracker'),
        getTypeFromClasses = function(obj) {
            var arr = ['cable', 'length', 'inputPlug', 'outputPlug', 'other'];
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
        };

        $('ul.builder.selected').children().each(function() {
            var type = getTypeFromClasses(this),
                $dot = $tracker.find('.dot.' + type);

            if( $(this).find('input[type="radio"]:checked').length ) {
                $dot.addClass('done');
            } else {
                $dot.removeClass('done');
            }
        });
    },

    updateLength = function(ui) {
        if( ui.options ) {
            CURRENT_CABLE.length.amount = ui.options.value;
        } else if( ui.value ) {
            CURRENT_CABLE.length.amount = ui.value;
        }

        CURRENT_CABLE.length.type = $(ui.handle).parent().data('type');
        updateStorage();

        if( !$(ui.handle).parents('li.length').find('input.visited').prop('checked') ) {
            $(ui.handle).parents('li.length').find('input.visited').prop('checked', true);
            updateDots();
        }
    },

    updateOptional = function() {
        var $builder = $('ul.builder.selected'),
            $current = $builder.find('li.current'),
            $input   = $current.find('input.visited');

        if( !$input.length || $input.prop('checked') ) return;

        if( $current.hasClass('length') ) {
            var $ruler   = $current.find('.ruler:visible'),
                $slider  = $ruler.slider('instance');

            CURRENT_CABLE.length.amount = $slider.options.value;
            CURRENT_CABLE.length.type   = $ruler.data('type');
        } else if( $current.hasClass('other') ) {
            var heatshrink = ($current.find('.other.heatshrink input:checked').length ? true : false);
            var techflex   = ($current.find('.other.techflex input:checked').length ? $current.find('.other.techflex input:checked').val() : '');
            CURRENT_CABLE.other.heatshrink = heatshrink;
            CURRENT_CABLE.other.techflex = techflex;
        }

        $input.prop('checked', true);
    },

    applyFilter = function(e) {
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

        var button = this;

        // Not a button click, called from a function
        if( !button ) {
            button = $('ul.builder.selected button.reset')[0];
        }

        if( !!this && $(this).data('checked') ) {
            $(button).prop('checked', false);
            $(button).data('checked', false);
        } else {
            $(button).prop('checked', true);
            $(button).data('checked', true);
        }

        var $parent = $(button).parents('.filters').parent(), // <li class="cable current" />
            $options = $parent.find('.option'),
            $radios = $(button).parents('.filters').find('input[type="radio"]:checked'),
            $checks = $(button).parents('.filters').find('input[type="checkbox"]:checked');


        $options.show();

        if( $parent.hasClass('cable') ) {
            $radios.each(function() {
                var $this = $(this),
                    value = $this.val(),
                    filter = $this.attr('class');

                $options.filter(function() {
                    var rating = getRating(this, filter);
                    return value !== rating;
                }).hide();
            });

            if( !$checks.length ) return;

            var $visible = $parent.find('.option:visible');
            $visible.hide();

            $checks.each(function() {
                var value = $(this).val();
                $visible.filter(function() {
                    var colors = $(this).data().colors;

                    for( var c in colors ) {
                        if( c.indexOf(value) > -1 && c.indexOf('opt_') > -1 ) return true;
                    }

                    return false;
                }).show();
            });
        }

        if( !$options.is(':visible') ) {
            // all gone
        } else {
            // something
        }
    },

    changeOption = function() {
        var $option = $(this).parent();

        if( $option.hasClass('cable') || $option.hasClass('plug')) {
            var $radio = $option.find('input[type="radio"]');
            if( !$radio.prop('checked') ) {
                $radio.prop('checked', true);
            } else {
                $radio.prop('checked', false);
            }
        }

        if( $option.hasClass('cable') ) {
            CURRENT_CABLE.cable.code = $option.data().code;
            CURRENT_CABLE.cable.name = $option.data().name;
            CURRENT_CABLE.cable.manufacturer = $option.data().manufacturer;

            if( $option.find('.image .colors').length ) {
                if( !CURRENT_CABLE.cable.color ) {
                    var color = CABLES.find('cable')
                        .filter(function() {
                            return $(this).find('code').text() == CURRENT_CABLE.cable.code;
                        })
                        .find('default')
                        .parent()
                        .find('name')
                        .text();
                    CURRENT_CABLE.cable.color = color;
                }
            } else {
                CURRENT_CABLE.cable.color = '';
            }
        } else if( $option.hasClass('plug') ) {
            if( $option.parents('li').hasClass('inputPlug') ) {
                CURRENT_CABLE.inputPlug.model = $option.data().model;
                CURRENT_CABLE.inputPlug.manufacturer = $option.data().manufacturer;
                CURRENT_CABLE.inputPlug.index = $option.data().index;
                CURRENT_CABLE.inputPlug.boot = $option.data().boot;
                CURRENT_CABLE.inputPlug.color = ($option.data().color ? '-' + $option.data().color : '');
            } else if( $option.parents('li').hasClass('outputPlug') ) {
                CURRENT_CABLE.outputPlug.model = $option.data().model;
                CURRENT_CABLE.outputPlug.manufacturer = $option.data().manufacturer;
                CURRENT_CABLE.outputPlug.index = $option.data().index;
                CURRENT_CABLE.outputPlug.boot = $option.data().boot;
                CURRENT_CABLE.outputPlug.color = ($option.data().color ? '-' + $option.data().color : '');
            }
        } else if( $option.hasClass('heatshrink') ) {
            if( $(this).prop('checked') ) {
                CURRENT_CABLE.other.heatshrink = true;
            } else {
                CURRENT_CABLE.other.heatshrink = false;
            }
        } else if( $option.hasClass('techflex') ) {
            if( !$(this).prop('checked') ) {
                CURRENT_CABLE.other.techflex = '';
            } else {
                CURRENT_CABLE.other.techflex = $(this).val();
            }
        }

        updateStorage();
        updateVisual();
        updateDots();
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

    // click on next/previous to change step
    changeStep = function() {
        var $parent = $(this).parents('li');

        updateOptional();

        $parent.removeClass('current');

        if( $(this).hasClass('next') ) {
            $parent.next().addClass('current');
        } else {
            $parent.prev().addClass('current');
        }

        updateDots();
    },

    // click on a dot to change step
    switchStep = function() {
        var index = $(this).parent().find('.dot').index(this),
            steps = $('ul.builder.selected');

        updateOptional();

        steps.find('.current').removeClass('current');
        steps.children().eq(index).addClass('current');

        updateDots();
    },

    switchChoice = function() {
        $(this).parent().find('input[type="radio"]').prop('checked', true);
        $(this).parents('li.length').children('input[type="hidden"]').first().removeClass().addClass($(this).attr('name'));
        updateLength($(this).parents('li.length').find('div.rulers .ruler:visible').slider('instance'));
    },

    toggleSpecs = function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).parents('.option').toggleClass('specs');
    },

    storage = function() {
        function loadBuild(options) {
            CURRENT_CABLE.storage = options.storage;

            CURRENT_CABLE.cableType.prefix = options.cableType.prefix;
            CURRENT_CABLE.cableType.type = options.cableType.type;

            CURRENT_CABLE.cable.code = options.cable.code;
            CURRENT_CABLE.cable.color = options.cable.color;

            CURRENT_CABLE.length.amount = options.length.amount;
            CURRENT_CABLE.length.type = options.length.type;

            CURRENT_CABLE.inputPlug.manufacturer = options.inputPlug.manufacturer;
            CURRENT_CABLE.inputPlug.model = options.inputPlug.model;
            CURRENT_CABLE.inputPlug.boot = options.inputPlug.boot;
            CURRENT_CABLE.inputPlug.color = options.inputPlug.color;
            CURRENT_CABLE.inputPlug.index = options.inputPlug.index;

            CURRENT_CABLE.outputPlug.manufacturer = options.outputPlug.manufacturer;
            CURRENT_CABLE.outputPlug.model = options.outputPlug.model;
            CURRENT_CABLE.outputPlug.boot = options.outputPlug.boot;
            CURRENT_CABLE.outputPlug.color = options.outputPlug.color;
            CURRENT_CABLE.outputPlug.index = options.outputPlug.index;

            CURRENT_CABLE.other.heatshrink = options.other.heatshrink;
            CURRENT_CABLE.other.techflex = options.other.techflex;
        }

        function selectBuildOptions(data) {
            var prefix, type, index = -1;
            if( data.cableType.prefix ) {
                prefix = data.cableType.prefix;
            }
            if( data.cableType.type ) {
                type = data.cableType.type;
            }

            if( !prefix || !type ) return;

            $('ul.builder').removeClass('selected');
            $('ul.builder#' + type).addClass('selected');

            if( data.cable.code ) {
                $('#' + prefix + data.cable.code).click();
            }
            if( data.cable.color ) {
                $('#' + prefix + data.cable.code).parent().find('.colors div').filter(function() {
                    return $(this).hasClass(data.cable.color);
                }).click();
            }
            if( data.length.type && data.length.amount ) {
                var $length = $('ul.builder.selected').find('.length');

                $length.find('input.visited').prop('checked',true);
                $length.find('input[name="switch"]').removeClass().addClass(data.length.type);

                $length.find('.ruler + input.' + data.length.type).val(data.length.amount);
                $length.find('.ruler.' + data.length.type).slider('value', data.length.amount);
            }
            if( data.inputPlug.index ) {
                $('#' + prefix + '_inputPlug' + data.inputPlug.index).click();
            }
            if( data.inputPlug.boot ) {
                $('#' + prefix + '_inputPlug' + data.inputPlug.index).parent().find('.boots').find('div').filter(function() {
                    return $(this).hasClass(data.inputPlug.boot);
                }).click();
            }
            if( data.outputPlug.index ) {
                $('#' + prefix + '_inputPlug' + data.outputPlug.index).click();
            }
            if( data.outputPlug.boot ) {
                $('#' + prefix + '_inputPlug' + data.outputPlug.index).parent().find('.boots').find('div').filter(function() {
                    return $(this).hasClass(data.outputPlug.boot);
                }).click();
            }
            if( data.other.heatshrink ) {
                $('#' + prefix + 'heatshrink').prop('checked', true);
            }
            if( data.other.techflex ) {
                $('#' + prefix + 'techflex_' + data.other.techflex).prop('checked',true);
            }
        }

        function save() {
            $('.build').filter(function() {
                return $(this).data('storage') == CURRENT_CABLE.storage;
            }).data(CURRENT_CABLE);
        }

        function remove() {
            var storage = $container.find(checked).parent().data('storage');
            $container.find(checked).parent().remove();

            if( storage == CURRENT_CABLE.storage ) reset();
        }

        function load() {
            var data = $container.find(checked).parent().data();

            reset();

            // set CURRENT_CABLE
            loadBuild(data);

            // load builder from CURRENT_CABLE
            selectBuildOptions(CURRENT_CABLE);
        }

        function getNextBlockNumber() {
            if( !$('.storage .build').length ) {
                return 1;
            }
            return ($('.storage .build').last().data('storage') * 1) + 1;
        }

        function create() {
            var $block = build(),
                i = getNextBlockNumber();

            $block.data(new Cable()).data('storage', i);

            return $block;
        }

        function generate() {
            var $block = create();

            save();
            reset();
            CURRENT_CABLE.storage = $block.data('storage');

            $block.find('input[name="storage_build"]').prop('checked',true);

            $container.append($block);
        }

        function build() {
            var $block = $('<div/>').addClass('build'),
                $select = $('<input/>').addClass('select'),
                $image = $('<div/>').addClass('image'),
                $information = $('<div/>').addClass('information');

            $select.attr({
                type: 'radio',
                name: 'storage_build'
            });

            $image.append(
                $('<img/>').addClass('cable').attr('src','http://placehold.it/100/eee'),
                $('<img/>').addClass('plug input').attr('src','http://placehold.it/50/888'),
                $('<img/>').addClass('plug output').attr('src','http://placehold.it/50/000')
            );

            $information.append(
                $('<p/>').addClass('type').append($('<span/>').text('Cable Type: '),$('<em/>')),
                $('<p/>').addClass('cable').append($('<span/>').text('Cable: '),$('<em/>')),
                $('<p/>').addClass('length').append($('<span/>').text('Length: '),$('<em/>')),
                $('<p/>').addClass('input').append($('<span/>').text('Input Plug: '),$('<em/>')),
                $('<p/>').addClass('output').append($('<span/>').text('Output Plug: '),$('<em/>')),
                $('<p/>').addClass('options').append($('<span/>').text('Other Options: '),$('<em/>'))
            );

            return $block.append($select, $image, $information).click(function() {
                $(this).find('input[name="storage_build"]').prop('checked',true);
            });
        }
        var $container = $('.storage .builds'),
            checked = 'input[name="storage_build"]:checked';

        generate();

        storage.save = save;
        storage.load = load;
        storage.build = build;
        storage.remove = remove;
        storage.generate = generate;
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
            if( !info.code || !info.index && info.index !== 0 ) return;

            $.get( API_URL + info.code )
                .done(function(data) {
                    callback(data, info);
                })
                .fail(function( jqXHR, textStatus, errorThrown ) {
                    alert("ERROR CS03: " + info.code + " not found in the product database.");
                    console.error(jqXHR);
                    console.error(textStatus);
                    console.error(errorThrown);
                });
        },

        getBuilderSkeleton = function(id) {
            var $skeleton = $('<ul/>').addClass('builder'),
                $c = $('<li/>').addClass('cable'),
                $l = $('<li/>').addClass('length'),
                $ip = $('<li/>').addClass('inputPlug'),
                $op = $('<li/>').addClass('outputPlug'),
                $o = $('<li/>').addClass('other');

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

            var $rulers = $('<div/>').addClass('rulers'),
                $rulerA = $('<div/>').addClass('ruler'),
                $rulerB = $('<div/>').addClass('ruler'),
                $inputA = $('<input/>').attr('type','text'),
                $inputB = $('<input/>').attr('type','text'),
                $selected = $('<input/>').attr('type','hidden').attr('name','switch'),
                $choices = $('<div/>').addClass('choices'),
                $choiceA = $('<div/>').addClass('choice'),
                $choiceB = $('<div/>').addClass('choice'),
                $visited = $('<input/>').addClass('hidden visited').attr('type','radio'),
                a, b;


            if( id === 'instrument' ) {
                a = 'patch'; b = 'regular';

                $selected.addClass(b);

                $choiceA.addClass(a).append(
                        $('<input/>', {
                            type: 'radio',
                            name: 'choice_' + id
                        }),
                        $('<div/>').addClass('image').append(
                            $('<img/>')
                                .addClass('placeholder')
                                .attr('src','http://placehold.it/100/000/fff&text=' + a),
                            $('<div/>')
                                .addClass('information')
                                .append($('<p/>').html('Cables for your pedalboard, rack system, or synthesizer modules.<br/><strong>3in-4ft</strong><br/><em>by the inch</em>'))
                        ),
                        $('<div/>').addClass('type').append($('<span/>').text(a)),
                        $('<div/>').addClass('specs').append($('<img/>').attr('src','http://placehold.it/25')).click(function() {
                            console.log(this);
                            $(this).parent().toggleClass('specs');
                        }),
                        $('<button/>').attr('name',a).text('select').click(switchChoice)
                    );

                $choiceA.children().not('div.specs').not('button').click(function() {
                    $(this).parent().find('button').click();
                });

                $choiceB.addClass(b).append(
                        $('<input/>', {
                            type: 'radio',
                            name: 'choice_' + id
                        }),
                        $('<div/>').addClass('image').append(
                            $('<img/>')
                                .addClass('placeholder')
                                .attr('src','http://placehold.it/100/000/fff&text=' + b),
                            $('<div/>')
                                .addClass('information')
                                .append($('<p/>').html('Cables for your instrument to ryour amp, di, or pedalboard.<br/><strong>3ft-20ft*</strong><br/><em>by the inch</em><span>*Any longer than 20ft and your cable can turn into a radio frequency antennae. Probably not a good thing</span>'))
                        ),
                        $('<div/>').addClass('type').append($('<span/>').text(b)),
                        $('<div/>').addClass('specs').append($('<img/>').attr('src','http://placehold.it/25')).click(function() {
                            console.log(this);
                            $(this).parent().toggleClass('specs');
                        }),
                        $('<button/>').attr('name',b).text('select').click(switchChoice)
                    );

                $choiceB.children().not('div.specs').not('button').click(function() {
                    $(this).parent().find('button').click();
                });

                $choices.append($choiceA, $choiceB);

                $rulerA.data('type',a).slider({
                    value: 12,
                    min: 1,
                    max: 48,
                    step: 1,
                    slide: function(e, ui) {
                        $inputA.val(ui.value);
                        updateLength(ui);
                    }
                }).addClass(a);

                $rulerB.data('type',b).slider({
                    value: 10,
                    min: 3,
                    max: 20,
                    step: 1,
                    slide: function(e, ui) {
                        $inputB.val(ui.value);
                        updateLength(ui);
                    }
                }).addClass(b);

                $inputA.addClass(a).val($rulerA.slider('value'));
                $inputB.addClass(b).val($rulerB.slider('value'));

                $rulers.append($rulerA, $inputA, $rulerB, $inputB);
            }

            $l.append($filters.clone(true).addClass('length'), $visited, $selected, $choices, $rulers, $step.clone(true));

            $ip.append($filters.clone(true).addClass('inputPlug'), $options.clone(true), $step.clone(true));

            $op.append($filters.clone(true).addClass('outputPlug'), $options.clone(true), $step.clone(true));

            var $addToCartButton = $('<button/>').text('Checkout').addClass('next').click(addToCart);

            $o.append($filters.clone(true).addClass('other'), $options.clone(true).empty(), $step.clone(true));
            $o.find('button.next').remove();
            $o.find('.step').append($addToCartButton);

            if (id) $skeleton.attr('id', id);

            $skeleton.append($c, $l, $ip, $op, $o);

            return $skeleton;
        },

        getBlockSkeleton = function(type) {
            var $struct = $('<div/>')
                    .addClass('option'),

                $inner = $('<div/>').addClass('inner'),

                $selector = $('<input/>')
                    .addClass('selector')
                    .attr('type','radio'),

                $image = $('<div/>')
                    .addClass('image')
                    .append($('<img/>')),

                $name = $('<div/>')
                    .addClass('name')
                    .append($('<span/>')),

                $price = $('<div/>')
                    .addClass('price')
                    .append($('<span/>')),

                $button = $('<div/>')
                    .addClass('select')
                    .append($('<button/>').text('Pick Me!')),

                $specs = $('<div/>')
                    .addClass('specs')
                    .append($('<span/>').text('Specs & Info'))
                    .click(toggleSpecs);

            if( type === 'cable' ) {
                $image.append(
                    $('<div/>').addClass('info').append(
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

            $inner.append($name, $price, $specs, $button);

            $struct.append($selector, $image, $inner);

            $struct.children().not('div.specs').not('.image div.boots').not('.image div.colors').click(changeOption);

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
            function changeColor(e) {
                e.stopPropagation();

                CURRENT_CABLE.cable.color = this.className;

                var $img = $(this).parents('.image').find('img'),
                    src = $img.attr('src'),
                    color = src.substring(src.indexOf('.') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(color, this.className));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) updateVisual();
            }
            var component = 'cable',
                $skeleton = info.skeleton,
                cableType = info.type,      // instrument - proAudio - speaker
                index     = info.index,
                prefix    = $skeleton.data('prefix'),
                $cable = CABLES.find(component).eq(index),
                $block = getBlockSkeleton(component),

                manufacturer = $(data).find('ProductManufacturer').text(),
                name = $(data).find('ProductName').text(),

                has_default_color = $cable.find('colors').find('default').parent(),
                default_color = (has_default_color.length ? '.' + has_default_color.find('name').text() : ''),

                options = {
                    id: prefix + $cable.find('code').text(),
                    name: name,
                    price: $cable.find('price').text(),
                    manufacturer: manufacturer,
                    image_alt: $(data).find('ProductName').text(),
                    image_src: IMAGES_DIR + 'builder/cable/' +
                                cableType + '/' +
                                manufacturer.toLowerCase().replace(/ /g,'-').toLowerCase() + '/' + 
                                name.substring(manufacturer.length + 1).replace(/ /g,'-').toLowerCase() +
                                default_color + '.jpg',
                    component: prefix + component,
                    specs: {
                        brightness:  $cable.find('brightness').text(),
                        capacitance: $cable.find('capacitance').text(),
                        flexibility: $cable.find('flexibility').text(),
                        shield:      $cable.find('shield').text(),
                        diameter:    $cable.find('diameter').text(),
                    }
                },
                colors = {};

            var has_color_options = false;

            if( $cable.find('colors').find('option_category_id').length ) {
                colors.color_option_category_id = $cable.find('colors').find('option_category_id').text();
                has_color_options = true;
            }

            $cable.find('colors').find('color').each(function() {
                var $this = $(this),
                    name = $this.find('name').text(),
                    short_name = $this.find('short_name').text(),
                    long_name = ( $this.find('id').text() ? $this.find('id').text() : '' );

                colors['opt_' + name] = long_name;
                colors['short_' + name] = short_name;
            });

            var $lengths = $cable.find('lengths'),
                lengths = {};

            if( $lengths.length ) {
                lengths.option_category_id = $lengths.find('option_category_id').text();

                $lengths.children().each(function() {
                    var name = this.tagName,
                        $this = $(this),
                        is_consistent = ($this.find('is_consistent').length ? true : false),
                        check = true;
                    
                    if( is_consistent ) {
                        var $start = $this.find('start_id'),
                            $end = $this.find('end_id');

                        if( $start.length && $end.length ) {
                            if( name.indexOf('patch') > -1 ) {
                                check = ( ($end.text() * 1) - ($start.text() * 1) === 47 ? true : false );
                                if( check ) {
                                    for( var i = 0; i < 48; i++) {
                                        lengths[name + (i + 1)] = ($start.text() * 1) + i;
                                    }
                                }
                            } else if( name.indexOf('regular') > -1 ) {
                                check = ( ($end.text() * 1) - ($start.text() * 1) === 17 ? true : false );
                                if( check ) {
                                    for( var j = 0; j < 18; j++) {
                                        lengths[name + (j + 3)] = ($start.text() * 1) + j;
                                    }
                                }
                            } else {}// idk
                        } else {} // missing either start or end tag
                    } else {}// look for individual numbers
                });
            }

            if( has_color_options ) {
                var $container = $('<div/>').addClass('colors');

                $cable.find('colors').find('color').each(function() {
                    var dflt = ($(this).find('default').length ? 'default' : '');
                    $container
                        .append(
                            $('<div/>')
                                .addClass($(this).find('name').text())
                                .click(changeColor)
                        );
                });

                $block.find('.image').append($container);
            }

            // append data to this block
            $block.data({
                'type':   component,
                'colors': colors,
                'specs':  options.specs,
                'lengths': lengths,
                'manufacturer': options.manufacturer,
                'code': $cable.find('code').text(),
                'name': options.name
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
            function changeBoot(e) {
                e.stopPropagation();

                var which = ($(this).parents('li').hasClass('inputPlug') ? 'inputPlug' : 'outputPlug');
                CURRENT_CABLE[which].boot = this.className;

                var $img = $(this).parents('.image').find('img.overlay'),
                    src = $img.attr('src'),
                    color = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(color, this.className));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) updateVisual();
            }

            function changeColor(e) {
                e.stopPropagation();

                var which = ($(this).parents('li').hasClass('inputPlug') ? 'inputPlug' : 'outputPlug');
                CURRENT_CABLE[which].color = '-' + $(this).data('suffix');

                var $img = $(this).parents('.image').find('img'),
                    src = $img.attr('src'),
                    suffix = src.substring(src.lastIndexOf('-') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(suffix, $(this).data('suffix')));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) updateVisual();
            }
            var $plugs = PLUGS.find(type).find('plug'),
                which = ['inputPlug', 'outputPlug'],
                which_container = [input_plug_container, output_plug_container],
                prefix = skeleton.data('prefix'),

                build = function() {
                    var $this = $(this),
                        $block = getBlockSkeleton(type),

                        default_color = ($this.find('colors').length ? '-' + $this.find('colors').find('default').parent().find('suffix').text() : ''),

                        options = {
                            id: prefix + which[i] + '_' + $plugs.index(this),
                            name: $this.find('manufacturer').text() + ' ' + $this.find('model').text(),
                            price: $this.find('price').text(),
                            image_alt: $this.find('manufacturer').text() + ' ' + $this.find('model').text(),
                            image_src: IMAGES_DIR + 'builder/plug/' +
                                       type + '/' +
                                       formatImage($this.find('manufacturer').text()) + '/' +
                                       formatImage($this.find('model').text() + default_color) + '.jpg',
                            component: prefix + which[i],
                            manufacturer: $this.find('manufacturer').text(),
                            model: $this.find('model').text(),
                            index: $plugs.index(this),
                            specs: {
                                image_src: 'http://placehold.it/200x200'
                            }
                        },
                        data = {
                            'type': which[i],
                            'manufacturer': options.manufacturer,
                            'model': options.model,
                            'index': options.index,
                            'color': '',
                            'boot': ''
                        };
                    fillBlock($block, options);

                    if( $this.find('has_boots').length ) {
                        var model = $this.find('model').text().split('-')[0],
                            default_color = PLUGS.find('boots').find(model.toLowerCase()).find('default').parent().find('color').text();
                        var $container = $('<div/>')
                                .addClass('boots'),
                            $overlay = $('<img/>')
                                .addClass('overlay')
                                .attr('src', IMAGES_DIR + 
                                         'builder/plug/' + 
                                         type + '/' + 
                                         formatImage(options.manufacturer) + '/' +
                                         formatImage(model) + '/' + 
                                         default_color + '.png'
                                );

                        PLUGS.find('boots').find(model.toLowerCase()).children('boot').each(function() {
                            $('<div/>')
                                .addClass($(this).find('color').text())
                                .click(changeBoot)
                                .appendTo($container);
                        });
                        data.boot = default_color;
                        $block.find('.image').append($overlay, $container);
                    }

                    if( $this.find('colors').length ) {
                        var model = $this.find('model').text().split('-')[0];
                        var $container = $('<div/>')
                                .addClass('colors');

                        $this.find('colors color').each(function() {
                            $('<div/>')
                                .addClass($(this).find('body').text())
                                .data('suffix', $(this).find('suffix').text())
                                .click(changeColor)
                                .appendTo($container);
                        });

                        data.color = $this.find('colors default').parent().find('suffix').text();

                        $block.find('.image').append($container);
                    }

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

        initOther = function(skeleton) {
            var prefix = $(skeleton).data('prefix'),
                $container = $(skeleton).find(other_container);


            $container.append($('<button/>').text('Reset').click(function(){$(this).parent().find('input:checked').prop('checked', false);}));
            $container.append($('<input/>').addClass('hidden visited').attr('type','radio'));

            OTHER.children().each(function() {
                var name = this.tagName,
                    $this = $(this),
                    $title = $('<h3/>').text(name),
                    $opt = $('<div/>').addClass('other').addClass(name);
                
                $opt.append($title);

                if( name === 'heatshrink' ) {
                    $opt.append(
                        $('<div/>').addClass('option').addClass(name).append(
                            $('<input/>', {
                                    id: prefix + name,
                                    type: 'checkbox'
                                })
                                .change(changeOption),
                            $('<label/>')
                                .text(name)
                                .attr('for', prefix + name)
                        )
                    );
                } else if( name === 'techflex' ) {
                    $opt.data('option_category_id', $this.find('color').find('option_category_id').text());

                    $this.find('color').children('option').each(function() {
                        var $option = $('<div/>').addClass('option').addClass(name),
                            desc = $(this).find('desc').text();

                        $option.append(
                            $('<input/>', {
                                id: prefix + name + '_' + desc,
                                value: desc,
                                type: 'radio',
                                name: prefix + name
                            }).change(changeOption),
                            $('<label/>')
                                .text(desc)
                                .attr('for', prefix + name + '_' + desc)
                        );
                        $opt.append($option);
                    });

                }
                $opt.appendTo($container);
            });
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
                            if( !data_colors.hasOwnProperty(c) ) continue;
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
                            }).addClass('brightness').click(applyFilter);

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
                            }).addClass('flexibility').click(applyFilter);

                        $filter.append($radio, $label).appendTo($filterFlexibility);
                    });

                    $filterContainer.append($filterFlexibility);

                    $(parent).find('.filters').append($filterContainer);
                }

                $('ul.builder li.cable').each(function() {
                    brightnessFilter(this);
                    flexibilityFilter(this);
                    colorFilter(this);
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

                DEFAULT_CABLETYPE_PREFIX = prefix;
                DEFAULT_CABLETYPE_TYPE = type;

                CURRENT_CABLE = new Cable();
                CURRENT_CABLE.storage = 1;
            }

            $tab.data('tab', type)
                .append($('<span/>').text(tag))
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
            initOther($skeleton);

            $cable_type_container.append($tab);
            $builders_container.append($skeleton);
        };

        if( CABLE_TYPES && CABLES && PLUGS && OTHER ) {
            CABLE_TYPES.find('type').each(initBuilders);
            init.filters = initFilters;
        } else {
            alert("ERROR CS02: One or more of the categories did not load properly.");
        }
    },

    prep = function() {
        // set cable builder to default settings
        $('ul.builder').each(function() {
            $(this).find('li').first().addClass('current');
        });

        $('.tracker .dot').click(switchStep);

        init.filters();

        storage();

        ready();
    },

    ready = function() {
        $('#test').click(function() {
            console.log(JSON.stringify(CURRENT_CABLE,null,4));
        });

        $('#reset').click(function() {
            reset();
        });

        $('#new').click(function() {
            storage.generate();
        });

        $('#remove').click(function() {
            storage.remove();
        });

        $('#save').click(function() {
            storage.save();
        });

        $('#load').click(function() {
            storage.load();
        });

        $(window).resize(function() {
            $('#screen-width').text(window.innerWidth);
            $('#screen-height').text(window.innerHeight);
        }).resize();

        window.addEventListener("orientationchange", function() {
            $('#screen-width').text(window.innerWidth);
            $('#screen-height').text(window.innerHeight);
        }, false);

        $('.loader').fadeOut('fast');
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

        $.get( XML_URL )
            .done(function(data) {
                var $data = $(data).find('data');
                OPTIONS_XML = $data;
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
            if( !INITIALIZED ) {
                INITIALIZED = !INITIALIZED;
                prep();
            }
        });
    };
    start();

})(jQuery);
