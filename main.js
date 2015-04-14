(function ($) {
    "use strict";
    var API_URL = "/net/WebService.aspx?Login=christian@sinasoid.com&EncryptedPassword=270B89846E6469F62676974F08363789F23D40F8B853E565E8C1B924DD4E514B&EDI_Name=Generic\\Products&SELECT_Columns=*&WHERE_Column=p.ProductCode&WHERE_Value=",
        XML_URL = '/v/t/Builder/options.xml',
        IMAGES_DIR = 'images/',
        INITIALIZED = false,
        OPTIONS_XML, CABLE_TYPES, CABLES, PLUGS, OTHER, CURRENT_CABLE = null,
        DEFAULT_CABLE_LENGTH = 10,
        DEFAULT_CABLE_LENGTH_TYPE = 'regular',
        DEFAULT_CABLETYPE_TYPE = '',
        DEFAULT_CABLETYPE_PREFIX = '',
        DEFAULT_PLUG_HEIGHT = 300,
        DEFAULT_PLUG_WIDTH = 180,
        BLANK_PLUG_URL = IMAGES_DIR + 'plug_outline.png',
        BLANK_CABLE_URL = IMAGES_DIR + 'cable_outline.png',
        BLANK_IMAGE_URL = IMAGES_DIR + 'blank.png',
        Cable = function() {
            this.storage = null;
            this.price = 0;
            this.quantity = 1;
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
                index: null
            };
            this.outputPlug = {
                manufacturer: '',
                model: '',
                boot: '', // color
                color: '',
                index: null
            };
            this.other = {
                reverse_plugs: false,
                heatshrink: false,
                techflex: '' // color
            };
        },

    displayImages = function() {
        var plug_width = 0,
            plug_height = 0,

        resizeImage = function() {
            // assuming the height of the plug image is half of the cable image
            var $plugs = $('.display img.plug'),
                $boots = $('.display img.boot');

            $plugs.height(getCableHeight() / 2);
            $boots.height(getNewBootsHeight());

            // 450 is the default offset
            
            $plugs.parent().css('top', (445/600) * getCableHeight() + 'px');

            $('.display .inputPlug').css('left', getPlugOffSet());
            $('.display .outputPlug').css('right', getPlugOffSet());
            $('.display .inputPlug .boot, .display .outputPlug .boot').css('right', getBootRightOffset());
            $('.display .inputPlug .boot, .display .outputPlug .boot').css('top', getBootTopOffset());
        };

        function getNewBootsHeight() {
            var DEFAULT_BOOT_HEIGHT = 100;

            return getCurrentPlugWidthRatio() * DEFAULT_BOOT_HEIGHT + 'px';
        }

        function getPlugWidth() {
            var val;

            val = $('.display .inputPlug img.plug').first().width();

            if( !val ) return 0;

            if( $('.display .inputPlug img.plug').attr('src').indexOf('blank.png') > -1 ){
                if ($('.display .outputPlug img.plug').attr('src').indexOf('blank.png') > -1 ) {
                    val = 0;
                } else {
                    val = $('.display .outputPlug img.plug').first().width();
                }
            }

            return val;
        }

        function getCurrentPlugWidthRatio() {
            return getPlugWidth() / DEFAULT_PLUG_WIDTH;
        }

        function getBootRightOffset() {
            var default_offset = 12;

            var offset = default_offset * getCurrentPlugWidthRatio();

            return offset + 'px';
        }

        function getBootTopOffset() {
            var default_offset = 3;

            var offset = default_offset * getCurrentPlugWidthRatio();

            return offset + 'px';
        }

        function getCableWidth() {
            return $('.display .cable > img').width();
        }

        function getCableHeight() {
            return $('.display .cable > img').height();
        }

        /**
         * Center of plug is 37px from the right side.
         * Center of cable is 24px from the side of the image
         * @return {int} Resized image ratio multiplied by default widths
         */
        function getPlugOffSet() {
            return -1 * ( (37 * getCurrentPlugWidthRatio()) - (24 * (getCableWidth() / 600)) ) + 'px';
        }

        resizeImage();

        displayImages.resizeImage = resizeImage;
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

        $display.find('img.plug').attr('src',BLANK_PLUG_URL);
        $display.find('.cable > img').attr('src',BLANK_CABLE_URL);
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

    goToConfirm = function() {
        $('div.builders').addClass('confirm');

        $('.confirmation').children().not('button.close').remove();

        $('.storage .build').each(function() {
            $('.confirmation').append($('<pre/>').text(JSON.stringify($(this).data(),null,4)));
        });
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

    launchModal = function() {
        var $container = $('.modal');

        $('body').addClass('modal-open');

        $container.on('click', function() {
            $('body').removeClass('modal-open');
        });

        $container.find('.info').click(function(e) {
            e.stopPropagation();

            alert("WINNER");
        });
    },

    updateQuantity = function() {
        CURRENT_CABLE.quantity = $(this).val();
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

        $storage.find('.identifier p.id').text(CURRENT_CABLE.storage);
        $storage.find('.identifier p.type').text('Inst/Patch');
        $storage.find('.identifier p.price').text(CURRENT_CABLE.price);

        $info.find('.type em').text(CURRENT_CABLE.cableType.type);
        $info.find('.cable em').text(getCable());
        $info.find('.length em').text(CURRENT_CABLE.length.amount + '' + getUnits());
        $info.find('.input em').text(CURRENT_CABLE.inputPlug.manufacturer + ' ' + CURRENT_CABLE.inputPlug.model);
        $info.find('.output em').text(CURRENT_CABLE.outputPlug.manufacturer + ' ' + CURRENT_CABLE.outputPlug.model);
        $info.find('.options em').text('');
        if( CURRENT_CABLE.other.heatshrink === true ) {
            $info.find('.options em').text('Extra Heatshrink: Yes');
        }
        if( CURRENT_CABLE.other.techflex ) {
            $info.find('.options em').append(document.createTextNode(' Techflex Shielding: Yes'));
        }

        storeThis.save();
    },

    calculateCost = function() {
        var cablePrice = 0.00,
            inputPlugCost = 0.00,
            outputPlugCost = 0.00,
            extraCosts = 0.00,
            ppf = 0.00,
            prefix = CURRENT_CABLE.cableType.prefix;

        if( CURRENT_CABLE.cableType.type === 'instrument' ) {
            ppf = CABLES.find('cable').filter(function() {
                return $(this).children('code').text() === CURRENT_CABLE.cable.code;
            }).find('price').text();
            if( CURRENT_CABLE.length.type === 'regular' ) {
                cablePrice = ppf * CURRENT_CABLE.length.amount;
            } else if( CURRENT_CABLE.length.type === 'patch' ) {
                cablePrice = +(ppf / 4) * ((Math.floor(CURRENT_CABLE.length.amount / 3))+1);
            }
        }

        inputPlugCost = (CURRENT_CABLE.inputPlug.index ? +PLUGS.find(CURRENT_CABLE.cableType.type).find('plug').eq(CURRENT_CABLE.inputPlug.index).find('price').text() : 0);

        outputPlugCost = (CURRENT_CABLE.outputPlug.index ? +PLUGS.find(CURRENT_CABLE.cableType.type).find('plug').eq(CURRENT_CABLE.outputPlug.index).find('price').text() : 0);

        if( CURRENT_CABLE.other.techflex || CURRENT_CABLE.other.techflex === 'true' ) {
            if( CURRENT_CABLE.cableType.type === 'instrument' ) {
                var length = 0;
                if( CURRENT_CABLE.length.type === 'regular' ) {
                    extraCosts += 0.25 * CURRENT_CABLE.length.amount;
                } else if( CURRENT_CABLE.length.type === 'patch' ) {
                    extraCosts += 0.25 * Math.floor((CURRENT_CABLE.length.amount-1)/12) + 1;
                }
            }
        }

        var totalCost = cablePrice + inputPlugCost + outputPlugCost + extraCosts;

        // return totalCost;
        CURRENT_CABLE.price = totalCost.toFixed(2);
    },

    updateVisual = function() {
        var $display = $('div.display'),
            CC = clone(CURRENT_CABLE),
            cable_color = (CC.cable.color ? '.' + CC.cable.color : ''),
            cable_src = IMAGES_DIR + 'display/cable/' +
                        CC.cableType.type + '/' +
                        CC.length.type + '/' +
                        formatImage(CC.cable.manufacturer) + '/' +
                        formatImage(CC.cable.name.substring(CC.cable.manufacturer.length + 1)) +
                        cable_color + '.png',

            inPlug_src = IMAGES_DIR + 'display/plug/' +
                         CC.cableType.type + '/' +
                         formatImage(CC.inputPlug.manufacturer) + '/' +
                         formatImage(CC.inputPlug.model + CC.inputPlug.color) + '.png',

            inBoot_src = IMAGES_DIR + 'display/plug/' +
                         CC.cableType.type + '/' +
                         formatImage(CC.inputPlug.manufacturer) + '/' +
                         formatImage(CC.inputPlug.model.split('-')[0]) + '/' +
                         CC.inputPlug.boot + '.png',

            outPlug_src = IMAGES_DIR + 'display/plug/' +
                          CC.cableType.type + '/' +
                          formatImage(CC.outputPlug.manufacturer) + '/' +
                          formatImage(CC.outputPlug.model + CC.outputPlug.color) + '.png',

            outBoot_src = IMAGES_DIR + 'display/plug/' +
                          CC.cableType.type + '/' +
                          formatImage(CC.outputPlug.manufacturer) + '/' +
                          formatImage(CC.outputPlug.model.split('-')[0]) + '/' +
                          CC.outputPlug.boot + '.png';

        var cable = (CC.cable.code ? cable_src : BLANK_CABLE_URL);
        var input = (CC.inputPlug.manufacturer && CC.inputPlug.model ? inPlug_src : BLANK_PLUG_URL);
        var output = (CC.outputPlug.manufacturer && CC.outputPlug.model ? outPlug_src : BLANK_PLUG_URL);
        var inputBoot = (CC.inputPlug.boot ? inBoot_src : BLANK_IMAGE_URL);
        var outputBoot = (CC.outputPlug.boot ?  outBoot_src : BLANK_IMAGE_URL);

        $display.find('.cable > img').attr('src', cable);
        $display.find('.inputPlug img.plug').attr('src', input);
        $display.find('.outputPlug img.plug').attr('src', output);
        $display.find('.inputPlug img.boot').attr('src', inputBoot);
        $display.find('.outputPlug img.boot').attr('src', outputBoot);

        calculateCost();
        displayImages.resizeImage();
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

        $tracker.children().removeClass('current');
        var current = $('ul.builder.selected').children('.current').attr('class').replace(/current/g, '').trim();
        $tracker.find('.' + current).addClass('current');
    },

    updateLength = function(ui) {
        if( ui.options ) {
            CURRENT_CABLE.length.amount = ui.options.value;
        } else if( ui.value ) {
            CURRENT_CABLE.length.amount = ui.value;
        }
        CURRENT_CABLE.length.type = $(ui.handle).parent().data('type');
        updateStorage();
        calculateCost();

        if( !$(ui.handle).parents('li.length').find('input.visited').prop('checked') ) {
            $(ui.handle).parents('li.length').find('input.visited').prop('checked', true);
            updateDots();
        }
    },

    updateOther = function() {
        var $parent = $(this).parents('.other').not('.filters').not('li'),
            $visited   = $parent.parent().find('input.visited');

        if( !$visited.prop('checked') ) $visited.prop('checked', true);

        if( $parent.hasClass('techflex') ) {
            var $radios = $parent.find('input[name="' + $(this).attr('name') + '"]');
            if( $(this).data('checked') ) {
                $radios.prop('checked', false).data('checked', false);
            } else {
                $radios.data('checked', false);
                $(this).data('checked', true);
            }
        }

        if( $parent.hasClass('heatshrink') ) {
            CURRENT_CABLE.other.heatshrink = ($parent.find('input:checked').length ? true : false);
        }

        if( $parent.hasClass('techflex') ) {
            CURRENT_CABLE.other.techflex = ($parent.find('input:checked').length ? $parent.find('input:checked').val() : '');
        }

        if( $parent.hasClass('reverse_plugs') ) {
            CURRENT_CABLE.other.reverse_plugs = (CURRENT_CABLE.length.type === 'patch' && $parent.find('input:checked').length ? true : false);
        }

        updateStorage();
        calculateCost();
    },

    applyFilter = function(e) {
        function getBrightnessFromCapacitance(val) {
            if( +val < 27 ) return 'low';
            else if( +val >= 27 && +val <= 36 ) return 'med';
            else if( +val > 36 ) return 'high';
            return ''; 
        }
        var $button = $(this);

        // Not a button click, called from a function
        if( $button.hasClass('reset') ) {
            $button = $('ul.builder.selected button.reset');
            $button.parent().find('input').prop('checked', false).data('checked', false);
        } else {
            var $radio = $button.parents('.filter').find('input[name="' + $button.attr('name') + '"]');

            if( $button.data('checked') ) {
                $radio.prop('checked', false).data('checked', false);
            } else {
                $radio.data('checked', false);
                $button.data('checked', true);
            }
        }

        var $parent = $button.parents('.filters').parent(), // <li class="cable current" />
            $containers = $parent.find('div.options'),
            $options = $containers.find('.option'),
            $radios = $button.parents('.filters').find('input[type="radio"]:checked'),
            $checks = $button.parents('.filters').find('input[type="checkbox"]:checked');


        $options.show();

        if( $parent.hasClass('cable') ) {
            $radios.each(function() {
                var $this = $(this),
                    value = $this.val(),
                    filter = $this.attr('class');

                $options.filter(function() {
                    if( $this.hasClass('brightness') ) {
                        return value !== getBrightnessFromCapacitance($(this).data().specs.capacitance);
                    } else if( $this.hasClass('flexibility') ) {
                        return value !== $(this).data().specs[filter];
                    }
                }).hide();
            });

            if( $checks.length ) {
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
        } else if( $parent.hasClass('inputPlug') ) {
            $radios.each(function() {
                var $this = $(this),
                    value = $this.val(),
                    filter = $this.attr('class');

                $options.filter(function() {
                    if( $this.hasClass('manufacturer') ) {
                        return value !== $(this).data().manufacturer;
                    }
                }).hide();
            });
        }

        $containers.children('div').removeClass('hidden');
        $containers.children('div').each(function() {
            if( !$(this).children('.option').is(':visible') ) {
                $(this).addClass('hidden');
            }
        });

        if( !$options.is(':visible') ) {
            clog("A");
        } else {
            clog("B");
        }
    },

    changeOption = function() {
        var $option = $(this).parent(),
            newCable = new Cable(),
            set = true;

        if( $option.hasClass('cable') || $option.hasClass('plug')) {
            var $radio = $option.find('input[type="radio"]');
            if( !$radio.prop('checked') ) {
                $radio.prop('checked', true);
            } else {
                $radio.prop('checked', false);
                set = false;
            }
        }

        if( $option.hasClass('cable') ) {
            if( !set ) {
                CURRENT_CABLE.cable = newCable.cable;
            } else {
                CURRENT_CABLE.cable.code = $option.data().code;
                CURRENT_CABLE.cable.name = $option.data().name;
                CURRENT_CABLE.cable.manufacturer = $option.data().manufacturer;

                if( $option.find('.image .colors').length ) {
                    var src = $option.find('.image img').attr('src'),
                        color = src.substring(src.indexOf('.') + 1, src.lastIndexOf('.'));

                    CURRENT_CABLE.cable.color = color;
                } else {
                    CURRENT_CABLE.cable.color = '';
                }

                if( $option.hasClass('only_patch') ) {
                    $option.parents('ul.builder').addClass('only_patch');
                    $option.parents('ul.builder').find('.length button[name="patch"]').click();
                } else {
                    $option.parents('ul.builder').removeClass('only_patch');
                }
            }
        } else if( $option.hasClass('plug') ) {
            if( $option.parents('li').hasClass('inputPlug') ) {
                if( !set ) {
                    CURRENT_CABLE.inputPlug = newCable.inputPlug;
                } else {
                    CURRENT_CABLE.inputPlug.model = $option.data().model;
                    CURRENT_CABLE.inputPlug.manufacturer = $option.data().manufacturer;
                    CURRENT_CABLE.inputPlug.index = $option.data().index;

                    if( $option.find('.image .boots').length ) {
                        var src = $option.find('.image img.overlay').attr('src'),
                            color = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

                        CURRENT_CABLE.inputPlug.boot = color;
                    } else {
                        CURRENT_CABLE.inputPlug.boot = '';
                    }

                    if( $option.find('.image .colors').length ) {
                        var src = $option.find('.image img').attr('src'),
                            color = src.substring(src.lastIndexOf('-'), src.lastIndexOf('.'));

                        CURRENT_CABLE.inputPlug.color = color;
                    } else {
                        CURRENT_CABLE.inputPlug.color = '';
                    }
                }
            } else if( $option.parents('li').hasClass('outputPlug') ) {
                if( !set ) {
                    CURRENT_CABLE.outputPlug = newCable.outputPlug;
                } else {
                    CURRENT_CABLE.outputPlug.model = $option.data().model;
                    CURRENT_CABLE.outputPlug.manufacturer = $option.data().manufacturer;
                    CURRENT_CABLE.outputPlug.index = $option.data().index;

                    if( $option.find('.image .boots').length ) {
                        var src = $option.find('.image img.overlay').attr('src'),
                            color = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

                        CURRENT_CABLE.outputPlug.boot = color;
                    } else {
                        CURRENT_CABLE.outputPlug.boot = '';
                    }

                    if( $option.find('.image .colors').length ) {
                        var src = $option.find('.image img').attr('src'),
                            color = src.substring(src.lastIndexOf('-'), src.lastIndexOf('.'));

                        CURRENT_CABLE.outputPlug.color = color;
                    } else {
                        CURRENT_CABLE.outputPlug.color = '';
                    }
                }
            }
        }

        updateOther();
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

        steps.find('.current').removeClass('current');
        steps.children().eq(index).addClass('current');

        updateDots();
    },

    switchChoice = function() {
        var $input = $(this).parents('li.length').children('input[name="switch"]'),
            type = $(this).attr('name');

        $(this).parent().find('input.visited').prop('checked', true);

        $input.removeClass().addClass($(this).attr('name'));

        updateLength($(this).parents('li.length').find('.ruler.' + type).slider('instance'));

        updateVisual();
    },

    toggleSpecs = function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).parents('.option').toggleClass('specs');
    },

    storeThis = function() {
        function loadBuild(options) {
            CURRENT_CABLE.storage = options.storage;

            CURRENT_CABLE.price = options.price;

            CURRENT_CABLE.cableType.prefix = options.cableType.prefix;
            CURRENT_CABLE.cableType.type = options.cableType.type;

            CURRENT_CABLE.cable.code = options.cable.code;
            CURRENT_CABLE.cable.color = options.cable.color;

            CURRENT_CABLE.length.amount = +options.length.amount;
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
                var color; 
                if( data.cable.color ) {
                    color = data.cable.color;
                }
                $('#' + prefix + data.cable.code).click();

                if( color ) {
                    $('#' + prefix + data.cable.code).parent().find('.colors div').filter(function() {
                        return $(this).attr('class') === color; 
                    }).click();
                }
            }
            if( data.length.type && data.length.amount ) {
                var $length = $('ul.builder.selected').find('.length');

                $length.find('input.visited').prop('checked',true);
                $length.find('input[name="switch"]').removeClass().addClass(data.length.type);

                $length.find('.ruler + input.' + data.length.type).val(data.length.amount);
                $length.find('.ruler.' + data.length.type).slider('value', data.length.amount);
            }
            if( data.inputPlug.index ) {
                var boot = '', color = '';

                if( data.inputPlug.boot ) {
                    boot = data.inputPlug.boot;
                }

                if( data.inputPlug.color ) {
                    color = data.inputPlug.color;
                }

                $('#' + prefix + 'inputPlug_' + data.inputPlug.index).click();

                if( boot ) {
                    $('#' + prefix + 'inputPlug_' + data.inputPlug.index).parent().find('.boots div').filter(function() {
                        return $(this).attr('class') === boot;
                    }).click();
                }

                if( color ) {
                    color = color.replace(/-/g,'');

                    color = PLUGS.find('plug').eq(data.inputPlug.index).find('color').filter(function() {
                        return $(this).find('suffix').text() == color;
                    }).find('body').text();

                    $('#' + prefix + 'inputPlug_' + data.inputPlug.index).parent().find('.colors div').filter(function() {
                        return $(this).attr('class') === color;
                    }).click();
                }
            }
            if( data.outputPlug.index ) {
                var boot = '', color = '';

                if( data.outputPlug.boot ) {
                    boot = data.outputPlug.boot;
                }

                if( data.outputPlug.color ) {
                    color = data.outputPlug.color;
                }

                $('#' + prefix + 'outputPlug_' + data.outputPlug.index).click();

                if( boot ) {
                    $('#' + prefix + 'outputPlug_' + data.outputPlug.index).parent().find('.boots div').filter(function() {
                        return $(this).attr('class') === boot;
                    }).click();
                }

                if( color ) {
                    color = color.replace(/-/g,'');

                    color = PLUGS.find('plug').eq(data.outputPlug.index).find('color').filter(function() {
                        return $(this).find('suffix').text() == color;
                    }).find('body').text();

                    $('#' + prefix + 'outputPlug_' + data.outputPlug.index).parent().find('.colors div').filter(function() {
                        return $(this).attr('class') === color;
                    }).click();
                }
            }
            if( data.other.heatshrink ) {
                $('#' + prefix + 'heatshrink').prop('checked', true);
            }
            if( data.other.techflex ) {
                $('#' + prefix + 'techflex_' + data.other.techflex).prop('checked',true);
            }
        }

        function getCurrentStorage() {
            var test = $('.storage .build').filter(function() {
                return $(this).data('storage') == CURRENT_CABLE.storage;
            });

            return test;
        }

        function save() {
            var $block = getCurrentStorage();
            $block.data(CURRENT_CABLE);
            store($block);
        }

        function remove() {
            var $container = $('.storage .builds'),
                $removeMe  = $container.find('input[name="storage_build"]:checked').parent(),
                storage = $removeMe.data('storage');

            $removeMe.remove();
            localStorage.removeItem('build_' + storage);

            if( storage == CURRENT_CABLE.storage ) {
                if( !$container.find('.build').length ) {
                    var $block = create();
                    $('.storage .builds').append($block);
                }
                $container.find('.build').first().find('input[name="storage_build"]').prop('checked', true);
                load();
            }
        }

        function load() {
            var data = $('.storage .builds').find('input[name="storage_build"]:checked').parent().data();
            if( this ) save();

            reset();

            // set CURRENT_CABLE
            loadBuild(data);

            // load builder from CURRENT_CABLE
            selectBuildOptions(CURRENT_CABLE);

            // highlight current storage
            $('.storage .build').removeClass('current').filter(function() {
                return $(this).data().storage == CURRENT_CABLE.storage;
            }).addClass('current');
        }

        function create(storage) {
            function getNextBlockNumber() {
                if( !$('.storage .build').length ) {
                    return 1;
                }

                var number = 0;

                $('.storage .build').each(function() {
                    if( +$(this).data('storage') > number ) {
                        number = +$(this).data('storage');
                    }
                });


                return number + 1;
            }
            var i, $block = build();

            if(!storage) {
                storage = new Cable();
                i = getNextBlockNumber();
            } else {
                i = storeThis.storage;
            }

            $block.data(storage).data('storage', i);

            return $block;
        }

        function generate() {
            var $block = create();

            reset();
            CURRENT_CABLE.storage = $block.data('storage');

            $block.find('input[name="storage_build"]').prop('checked',true);

            $('.storage .builds').append($block);
            
            // highlight current storage
            $('.storage .build').removeClass('current').filter(function() {
                return $(this).data().storage == CURRENT_CABLE.storage;
            }).addClass('current');
        }

        function build() {
            var $block = $('<div/>').addClass('build'),
                $select = $('<input/>').addClass('select'),
                $identifier = $('<div/>').addClass('identifier'),
                $information = $('<div/>').addClass('information');

            $select.attr({
                type: 'radio',
                name: 'storage_build'
            });

            $identifier.append(
                $('<p/>').addClass('id'),
                $('<p/>').addClass('type'),
                $('<p/>').addClass('price')
            );

            $information.append(
                $('<p/>').addClass('type').append($('<span/>').text('Cable Type: '),$('<em/>')),
                $('<p/>').addClass('cable').append($('<span/>').text('Cable: '),$('<em/>')),
                $('<p/>').addClass('length').append($('<span/>').text('Length: '),$('<em/>')),
                $('<p/>').addClass('input').append($('<span/>').text('Input Plug: '),$('<em/>')),
                $('<p/>').addClass('output').append($('<span/>').text('Output Plug: '),$('<em/>')),
                $('<p/>').addClass('other').append($('<span/>').text('Other Options: '),$('<em/>'))
            );

            return $block.append($select, $identifier, $information).on('click', function() {
                $(this).find('input[name="storage_build"]').prop('checked',true);
            });
        }

        function store($block) {
            data = $block.data();
            localStorage.setItem('build_' + data.storage, JSON.stringify(data));
        }

        function recall(data) {
            var $block = create(data);
            $block.find('input[type="radio"]').prop('checked',true);
            $('.storage .builds').prepend($block);
            load();
        }

        storeThis.generate = generate;
        storeThis.load = load;
        storeThis.build = build;
        storeThis.remove = remove;
        storeThis.save = save;
        storeThis.store = null;


        if( !Modernizr.localstorage ) {
            generate();
            return;
        }

        storeThis.store = store;

        if( !localStorage.length ) {
            generate();
        } else {
            for (var i = 0; i < localStorage.length; i++) {
                if( localStorage.key(i).indexOf('build_') > -1 ) {
                    var data = JSON.parse(localStorage.getItem(localStorage.key(i)));
                    recall(data);
                }
            }
        }

    },

    drawCanvas = function() {
        // var canvas = document.getElementById('canvas_cable');
        // if (canvas.getContext) {
        //     var ctx = canvas.getContext('2d');

        //     ctx.beginPath();
        //     ctx.arc(75,75,50,0,Math.PI*2,true); // Outer circle
        //     ctx.moveTo(110,75);
        //     ctx.arc(75,75,35,0,Math.PI,false);  // Mouth (clockwise)
        //     ctx.moveTo(65,65);
        //     ctx.arc(60,65,5,0,Math.PI*2,true);  // Left eye
        //     ctx.moveTo(95,65);
        //     ctx.arc(90,65,5,0,Math.PI*2,true);  // Right eye
        //     ctx.stroke();
        // }
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
                .on('click', applyFilter);

            var $filters = $('<div/>')
                    .addClass('filters')
                    .append($reset),

                $options = $('<div/>')
                    .addClass('options'),

                $step = $('<div/>')
                    .addClass('step')
                    .append(
                        $('<button/>')
                            .addClass('previous')
                            .text('Previous')
                            .on('click', changeStep),
                        $('<button/>')
                            .addClass('next')
                            .text('Next')
                            .on('click', changeStep)
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
                        $('<div/>').addClass('specs').append($('<img/>').attr('src','http://placehold.it/25')).on('click', function() {
                            $(this).parent().toggleClass('specs');
                        }),
                        $('<button/>').attr('name',a).text('select').on('click', switchChoice)
                    );

                $choiceA.children().not('div.specs').not('button').on('click', function() {
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
                        $('<div/>').addClass('specs').append($('<img/>').attr('src','http://placehold.it/25')).on('click', function() {
                            $(this).parent().toggleClass('specs');
                        }),
                        $('<button/>').attr('name',b).text('select').on('click', switchChoice)
                    );

                $choiceB.children().not('div.specs').not('button').on('click', function() {
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

            var $addToCartButton = $('<button/>').text('Confirm').addClass('next').on('click', goToConfirm);

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
                    .on('click', toggleSpecs);

            if( type === 'cable' ) {
                $image.append(
                    $('<div/>').addClass('info').append(
                        $('<ul/>')
                            .addClass('details')
                            .append(
                                $('<li/>')
                                    .addClass('title')
                                    .text('Details')
                            ),
                        $('<button/>')
                            .addClass('more')
                            .text('more info')
                    )
                );
            } else if( type === 'plug' ) {
                $image.append(
                    $('<div/>').addClass('info').append(
                        $('<img/>').addClass('measurements')
                    )
                );
            }

            $inner.append($name, $price, $specs, $button);

            $struct.append($selector, $image, $inner);

            $struct.children().not('div.specs').not('.image div.boots').not('.image div.colors').on('click', changeOption);

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

                block.find('div.info ul.details').append(
                    $('<li/>').html('Capacitance: <em class="capacitance">' + options.specs.capacitance + '</em>'),
                    $('<li/>').html('Flexibility: <em>' + options.specs.flexibility + '</em>'),
                    $('<li/>').html('Shield: <em>' + options.specs.shield + '</em>'),
                    $('<li/>').html('Diameter: <em>' + options.specs.diameter + '</em>')
                );

            } else if( options.component.indexOf('Plug') > -1 ) {
                block.find('div.info img.measurements').attr({
                    src: options.specs.image_src,
                    alt: options.name + " Measurements"
                });

            }
        },

        /**
         * Initialize cables for cableType and fill skeleton
         * @param cableType {string}
         * @param skeleton {jQuery Object}
         */
        initCables = function(info) {
            function changeColor(e) {
                e.stopPropagation();

                var $img = $(this).parents('.image').find('img'),
                    src = $img.attr('src'),
                    color = src.substring(src.indexOf('.') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(color, this.className));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) {
                    CURRENT_CABLE.cable.color = (this.className ? this.className : '');
                    updateVisual();
                    updateStorage();
                }
            }
            var component = 'cable',
                $skeleton = info.skeleton,
                cableType = info.type,      // instrument - proAudio - speaker
                index     = info.index,
                prefix    = $skeleton.data('prefix'),
                $cable = CABLES.find(component).eq(index),
                $block = getBlockSkeleton(component),

                manufacturer = $cable.find('manufacturer').text(),
                model = $cable.find('model').text(),
                name = manufacturer + ' ' + model,

                has_default_color = $cable.find('colors').find('default').parent(),
                default_color = (has_default_color.length ? '.' + has_default_color.find('name').text() : ''),

                options = {
                    id: prefix + $cable.find('code').text(),
                    name: name,
                    price: $cable.find('price').text(),
                    manufacturer: manufacturer,
                    image_alt: name,
                    image_src: IMAGES_DIR + 'builder/cable/' +
                                cableType + '/' +
                                formatImage(manufacturer) + '/' + 
                                formatImage(model) +
                                default_color + '.jpg',
                    component: prefix + component,
                    specs: {
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
                            } else {} // not patch or regular cable
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
                                .on('click', changeColor)
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

                var $img = $(this).parents('.image').find('img.overlay'),
                    src = $img.attr('src'),
                    color = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(color, this.className));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) {
                    CURRENT_CABLE[which].boot = this.className;
                    updateVisual();
                    updateStorage();
                }
            }

            function changeColor(e) {
                e.stopPropagation();

                var which = ($(this).parents('li').hasClass('inputPlug') ? 'inputPlug' : 'outputPlug');

                var $img = $(this).parents('.image').find('img'),
                    src = $img.attr('src'),
                    suffix = src.substring(src.lastIndexOf('-') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(suffix, $(this).data('suffix')));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) {
                    CURRENT_CABLE[which].color = '-' + $(this).data('suffix');
                    updateVisual();
                    updateStorage();
                }
            }
            var $plugs = PLUGS.find(type).find('plug'),
                which = ['inputPlug', 'outputPlug'],
                which_container = [input_plug_container, output_plug_container],
                prefix = skeleton.data('prefix'),

                build = function() {
                    var $this = $(this),
                        $block = getBlockSkeleton('plug'),

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
                                image_src: IMAGES_DIR + 'builder/plug/' +
                                           type + '/' +
                                           formatImage($this.find('manufacturer').text()) + '/overlay/' +
                                           formatImage($this.find('model').text()) + '.png'
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
                                .on('click', changeBoot)
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
                                .on('click', changeColor)
                                .appendTo($container);
                        });

                        data.color = $this.find('colors default').parent().find('suffix').text();

                        $block.find('.image').append($container);
                    }

                    $block.data(data).addClass('plug');

                    if( $this.find('angle').text() == 'straight' ) {
                        skeleton.find(which_container[i]).find('.straight').append($block);
                    } else {
                        skeleton.find(which_container[i]).find('.right').append($block);
                    }
                };

            for( var i = 0; i < which.length; i++ ) {
                $plugs.each(build);
            }
        },

        initOther = function(skeleton) {
            var prefix = $(skeleton).data('prefix'),
                $container = $(skeleton).find(other_container);


            $container.append(
                $('<button/>')
                    .text('Reset')
                    .on('click', function() {
                        $(this).parent().find('input:checked').prop('checked', false);
                        updateOther();
                    }));
            $container.append($('<input/>').addClass('hidden visited').attr('type','radio'));

            OTHER.children().each(function() {
                var name = this.tagName,
                    $this = $(this),
                    $title = $('<h3/>').text(name),
                    $opt = $('<div/>').addClass('other').addClass(name);
                
                $opt.append($title);

                if( name === 'heatshrink' || name === 'reverse_plugs' ) {
                    $opt.append(
                        $('<div/>').addClass('option').addClass(name).append(
                            $('<input/>', {
                                    id: prefix + name,
                                    type: 'checkbox'
                                })
                                .on('click', updateOther),
                            $('<label/>')
                                .text(name.replace(/_/g, ' '))
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
                            }).data('checked', false).on('click', updateOther),
                            $('<label/>')
                                .text(desc)
                                .attr('for', prefix + name + '_' + desc)
                        );
                        $opt.append($option);
                    });

                }
                $opt.appendTo($container);
            });

            $('<div/>').addClass('other quantity').append(
                $('<h3/>').text('quantity'),
                $('<input/>', {
                    type: 'text',
                    name: prefix + 'quantity',
                    val: 1
                }).on('change', updateQuantity)
            ).appendTo($container);
        },

        initFilters = function() {
            var initCableFilter = function() {
                function colorFilter(parent) {
                    var $filterContainer = $('<div/>').addClass('filterContainer color');
                    $('<h2/>').text('Color').click(function() {
                        $(this).parent().toggleClass('filter-open');
                    }).appendTo($filterContainer);

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
                                .text(color),
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
                    $('<h2/>').text('Brightness').click(function() {
                        $(this).parent().toggleClass('filter-open');
                    }).appendTo($filterContainer);

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
                            }).addClass('brightness').on('click', applyFilter);

                        $filter.append($radio, $label).appendTo($filterBrightness);
                    });

                    $filterContainer.append($filterBrightness);

                    $(parent).find('.filters').append($filterContainer);
                }

                function flexibilityFilter(parent) {
                    var $filterContainer = $('<div/>').addClass('filterContainer flexibility');
                    $('<h2/>').text('Flexibility').click(function() {
                        $(this).parent().toggleClass('filter-open');
                    }).appendTo($filterContainer);

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
                            }).addClass('flexibility').on('click', applyFilter);

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
            },

                initPlugFilter = function() {
                    function manufacturerFilter(parent) {
                        var $filterContainer = $('<div/>').addClass('filterContainer manufacturer');

                        $('<h2/>').text('Manufacturer').click(function() {
                            $(this).parent().toggleClass('filter-open');
                        }).appendTo($filterContainer);
                        var $filterBrightness = $('<div/>').addClass('filter'),
                        options = [];

                        $(parent).find('.options .option').each(function() {
                            var manu = $(this).data('manufacturer');
                            if( $.inArray(manu, options) === -1 ) options.push(manu);
                        });

                        $(options).each(function() {
                            var $filter = $('<div/>').addClass('filter-option');
                            var $label = $('<label/>')
                                    .attr('for', 'filter-manufacturer-' + this)
                                    .text(this),
                                $radio = $('<input/>', {
                                    'type': 'radio',
                                    'name': $(parent).parents('ul.builder').data('prefix') + 'filter-manufacturer',
                                    'id': 'filter-manufacturer-' + this,
                                    'value': this
                                }).addClass('manufacturer').on('click', applyFilter);

                            $filter.append($radio, $label).appendTo($filterBrightness);
                        });

                        $filterContainer.append($filterBrightness);

                        $(parent).find('.filters').append($filterContainer);
                    }

                    $('ul.builder li.inputPlug').each(function() {
                        manufacturerFilter(this);
                    });
                }

            initCableFilter();
            initPlugFilter();
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

            $skeleton.find('.cable .options')
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
                );

            $skeleton.find('.inputPlug .options')
                .append(
                    $('<div/>')
                        .addClass('straight')
                        .append(
                                $('<h3/>').text('Straight Angle Plugs')
                            ),
                    $('<div/>')
                        .addClass('right')
                        .append(
                                $('<h3/>').text('Right Angle Plugs')
                            )
                );

            $skeleton.find('.outputPlug .options')
                .append(
                    $('<div/>')
                        .addClass('straight')
                        .append(
                                $('<h3/>').text('Straight Angle Plugs')
                            ),
                    $('<div/>')
                        .addClass('right')
                        .append(
                                $('<h3/>').text('Right Angle Plugs')
                            )
                );

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
                .on('click', changeTab);

            CABLES.find('cable').filter(function() {
                return $(this).find("is_" + type).length !== 0;
            }).each(function() {
                var info = {
                        index: CABLES.find('cable').index(this),
                        type: type,
                        skeleton: $skeleton
                    };
                initCables(info);
            });

            initPlugs(type, $skeleton);
            initOther($skeleton);

            $cable_type_container.append($tab);
            $builders_container.append($skeleton);
        };

        displayImages();
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

        $('.tracker .dot').on('click', switchStep);

        $('.confirmation .close').on('click', function() {
            $('div.builders').removeClass('confirm');
        });

        drawCanvas();

        init.filters();

        storeThis();
        ready();
    },

    clog = function(msg) {
        console.log(msg);
    },

    ready = function() {
        $('#test').on('click', function() {
            console.log(JSON.stringify(CURRENT_CABLE,null,4));
        });

        $('#reset').on('click', function() {
            launchModal();
        });

        $('#new').on('click', function() {
            storeThis.generate();
        });

        $('#remove').on('click', function() {
            storeThis.remove();
        });

        $('#load').on('click', function() {
            storeThis.load();
        });

        $(window).resize(function() {
            $('#screen-width').text(window.innerWidth);
            $('#screen-height').text(window.innerHeight);

            displayImages.resizeImage();
        }).resize();

        window.addEventListener("orientationchange", function() {
            $('#screen-width').text(window.innerWidth);
            $('#screen-height').text(window.innerHeight);
        }, false);

        displayImages.resizeImage();
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

        $(document).ajaxStop(function() {
            if( !INITIALIZED ) {
                INITIALIZED = !INITIALIZED;
                prep();
            }
        });

        $(window).bind('beforeunload', function() {
        });

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
    };
    start();

})(jQuery);
