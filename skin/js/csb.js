(function ($) {
    "use strict";

    // if( window.location.hostname.indexOf('www') === -1) {
    //     window.location.hostname = 'www.sinasoid.com';
    // }

    var JSON_URL = 'skin/js/options.json',
        IMAGES_DIR = 'skin/images/';

    var INITIALIZED = false,
        OPTIONS_JSON, J_CABLE_TYPES, J_CABLES, J_PLUGS, J_OTHER,
        CURRENT_CABLE = null,
        TOTAL_STORAGE = 5,
        DEFAULT_CABLE_LENGTH = 10,
        DEFAULT_CABLE_LENGTH_TYPE = 'regular',
        DEFAULT_CABLE_UNIT = 'ft',
        DEFAULT_CABLETYPE_TYPE = '',
        DEFAULT_CABLETYPE_PREFIX = '',
        DEFAULT_PLUG_HEIGHT = 300,
        DEFAULT_PLUG_WIDTH = 180,
        BLANK_PLUG_URL = IMAGES_DIR + 'display/plug_outline.png',
        BLANK_PATCH_CABLE_URL = IMAGES_DIR + 'display/cable_patch_outline.png',
        BLANK_REGULAR_CABLE_URL = IMAGES_DIR + 'display/cable_regular_outline.png',
        BLANK_IMAGE_URL = IMAGES_DIR + 'blank.png',
        TOUCH = Modernizr.touch,
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
                manufacturer: '',
                model: ''
            };
            this.length = {
                amount: DEFAULT_CABLE_LENGTH,
                unit: DEFAULT_CABLE_UNIT,
                type: DEFAULT_CABLE_LENGTH_TYPE,
                visited: false
            };
            this.input = {
                manufacturer: '',
                model: '',
                color: '',
                boot: ''
            };
            this.output = {
                manufacturer: '',
                model: '',
                color: '',
                boot: ''
            };
            this.other = {
                reverse_plugs: false,
                tourproof: false,
                techflex: '',
                visited: false
            };
            this.version = 2.1;
        },
        Basket = function() {
            this.data = null,
            this.getId = function() {
                return this.data.storage;
            },

            this.save = function() {
                localStorage.setItem('build_' + this.getId(), JSON.stringify(this.data));
            },

            this.set = function(e) {
                // Update current cable object
                this.data = CURRENT_CABLE;

                this.save();
            },

            this.remove = function(e) {
                var id = this.getId(),
                    block = $('.build[data-storage-id="' + id + '"]', '#storage');
                CURRENT_CABLE = new Cable();
                CURRENT_CABLE.storage = id;

                localStorage.removeItem('build_' + id);

                block.attr('data-storage-status', 'inactive');
                this.data = CURRENT_CABLE;

                $('.build', '#storage').not('[data-storage-status="inactive"]').first().trigger('click');
                
                if( !$('.build[data-storage-status="current"]', '#storage').length ) {
                    $('[data-storage-button="create"]', '#storage').trigger('click');
                }
            },

            this.load = function(e) {
                if( e.delegateTarget.getAttribute('data-storage-status') === 'inactive' ) return;

                $('.outer', '#display').attr('data-loading-status', 'pending');

                $('#body').attr('data-current-length-type', this.data.length.type);

                if( e.delegateTarget.getAttribute('data-storage-status') === 'error' ) {
                    var c = $(e.delegateTarget).find('p[data-storage-error-p="true"]').get(0).className;
                    $('.dot[data-pointer-component="' + c + '"]').trigger('click');
                }

                $(e.delegateTarget).attr('data-storage-status', 'current').siblings('[data-storage-status="current"]').attr('data-storage-status', 'active');

                update.dispatch(this.data, true);
                update.builder();
            }
        },

    debounce = function(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    },

    resize = {
        viewport: debounce(function() {
            var width = $(window).width(), height = $(window).height(),
                section = $('#content').attr('data-active-section') || 'production';

            if( width > height ) {
                $('body').attr('data-orientation', 'horizontal');
            } else {
                $('body').attr('data-orientation', 'vertical');
            }
            
            update.dispatch(CURRENT_CABLE, true);            

            scrollToSection(section);
        }, 150)
    },

    showIntro = function() {
        $('body').attr('data-display-introduction', 'show');

        $('#introduction .outer').on('click', function() {
            scrollToSection('production', 400);
        });
    },

    scrollToSection = function(section, speed) {
        speed = speed || 0;
        $('#content').animate({
            scrollTop: $('#' + section ).position().top + $('#content').scrollTop()
        }, speed || 0);

        $('#content').attr('data-active-section', section);
    },

    displayImages = function() {
        var resizeImage = function() {
            // assuming the height of the plug image is half of the cable image
            var $plugs = $('#display img.plug');

            setCableSize();
            setPlugSize();
            setBootSize();
            setLengthBracketSize();

            var cableHeight = getCableHeight(),
                plugOffSet = getPlugOffSet(),
                bootTopOffSet = getBootTopOffSet(),
                bootRightOffSet = getBootRightOffSet(),
                inputOffSet, outputOffSet;

            if( typeof plugOffSet === 'object' && plugOffSet.length === 2) {
                inputOffSet = plugOffSet[0];
                outputOffSet = plugOffSet[1] + 1;

            } else {
                inputOffSet = plugOffSet;
                outputOffSet = plugOffSet + 1;
            }

            // 355|368 is the default offset at full size
            $plugs.parent().css('top', ((CURRENT_CABLE.length.type === 'regular' ? 355 : 368 ) / 500) * cableHeight + 'px');

            // if( CURRENT_CABLE.other.reverse_plugs ) {
            //     $('#display .input img.plug').css('top', -1 * (20/50) * cableHeight);
            //     $('#display .input img.boot').css({
            //         'top': -10 * getCurrentPlugWidthRatio(),
            //         'right': 166 * getCurrentPlugWidthRatio()
            //     });

            // } else {
                $('#display .input img.plug').css('top', 0);
                $('#display .input img.boot').css({
                    'top': bootTopOffSet,
                    'right': bootRightOffSet + getCurrentPlugWidthRatio()
                });
            // }

            $('#display .input').css('left', inputOffSet);
            $('#display .output').css('right', outputOffSet + (-2 * getCurrentPlugWidthRatio()));
            $('#display .output .boot').css('right', bootRightOffSet + ((CURRENT_CABLE.length.type === 'regular' ? 1 : -2) * getCurrentPlugWidthRatio()));
            $('#display .output .boot').css('top', bootTopOffSet);

            $('#body #display .outer').removeClass('loading');
        };

        function setCableSize() {
            function imageDimensionRatio(which) {
                switch( which ) {
                    // return h/w
                    case 'patch': return 480/162;
                    case 'regular': return 600/600;
                    default: return 1;
                }
            }
            function imageToContainerRatio(which) {
                switch( which ) {
                    case 'patch': return 0.6;
                    case 'regular': return 0.8;
                    default: return 1;
                }
            }
            function getWhich() {
                return $('#body').attr('data-current-length-type');
            }

            var $outer = $('#body > #display .outer'),
                $inner = $outer.children('.inner'),
                outerH = $('#body').height() * 0.8,
                outerW = ($('#body').width() * 0.5 - 125) * 0.8,
                which = getWhich(),
                imageToContainerRatioValue = imageToContainerRatio(which),
                imageDimensionRatioValue = imageDimensionRatio(which),
                height, width;

            if( outerW > outerH ) {
                height = outerH * imageToContainerRatioValue;
                width = height * imageDimensionRatioValue;

                if( width > outerW ) {
                    width = outerW * imageToContainerRatioValue;
                    height = width / imageDimensionRatioValue;
                }

            } else {
                width = outerW * imageToContainerRatioValue;
                height = width / imageDimensionRatioValue;
            }

            $inner.height(height);
            $inner.width(width);
        }

        function setLengthBracketSize() {
            var $horizontal = $('#lengthSelector .bracket'),
                width = $('#display .cable > img').outerWidth() * 0.75;

            $horizontal.css('width', width).css('left', width / -2);
        }

        function setPlugSize() {
            var $plugs = $('#display img.plug'),
                cableHeight = getCableHeight(),
                typeRatio = getCurrentTypeRatio(),
                height = cableHeight / typeRatio,
                width = height * (180/300);

            $plugs.height(height);
            $plugs.width(width);
        }

        function setBootSize() {
            var DEFAULT_BOOT_HEIGHT = 100,
                $boots = $('#display img.boot'),
                height = getCurrentPlugWidthRatio() * DEFAULT_BOOT_HEIGHT + 'px';

            $boots.height(height);
        }

        function getCurrentTypeRatio() {
            if( CURRENT_CABLE.length.type === 'regular' ) return 2; // 600 / 300
            else if( CURRENT_CABLE.length.type === 'patch' ) return 135/250;
        }

        function getPlugWidth() {
            var val;

            val = $('#display .input img.plug').width();

            if( !val ) return 0;

            return val;
        }

        function getCurrentPlugWidthRatio() {
            return getPlugWidth() / DEFAULT_PLUG_WIDTH;
        }

        function getBootRightOffSet() {
            var default_offset, offset;

            if( CURRENT_CABLE.length.type === 'patch' ) {
                default_offset = 85;

            } else if( CURRENT_CABLE.length.type === 'regular' ) {
                default_offset = 12;
            }

            offset = default_offset * getCurrentPlugWidthRatio();

            return offset;
        }

        function getBootTopOffSet() {
            var default_offset, offset;

            if( CURRENT_CABLE.length.type === 'patch' ) {
                default_offset = -8.5;
            } else if( CURRENT_CABLE.length.type === 'regular' ) {
                default_offset = 3;
            }

            offset = default_offset * getCurrentPlugWidthRatio();

            return offset + 'px';
        }

        function getCableWidth() {
            return $('#display .cable > img').width();
        }

        function getCableHeight() {
            return $('#display .cable > img').height();
        }

        /**
         * Center of plug is 37px from the right side.
         * Center of cable is 24px from the side of the image
         * @return {int} Resized image ratio multiplied by default widths
         */
        function getPlugOffSet() {
            
            var plugWidthRatio = getCurrentPlugWidthRatio(),
                cableWidth = getCableWidth();

            if( CURRENT_CABLE.length.type === 'patch' ) {
                // if( CURRENT_CABLE.other.reverse_plugs ) {
                //     return [-180 * plugWidthRatio, -97 * plugWidthRatio];

                // } else {
                    return -97 * plugWidthRatio;
                // }

            } else if( CURRENT_CABLE.length.type === 'regular' ) {
                // 31 and 10 are the px distances from the edge of the image to the closest dot where the images are supposed to align
                return -1 * ( (31 * plugWidthRatio) - (10 * (cableWidth / 600)) );
            }
        }

        displayImages.resizeImage = resizeImage;
    },

    reset = function() {
        var $builder = $('ul.builder.selected'),
            $length = $builder.find('.length'),
            $display = $('#display'),
            src;

        $('#body').attr('data-current-length-type', 'regular');

        $builder.find('input:checked').prop('checked', false);
        $builder.find('.options').removeClass('active');
        $builder.find('.option.specs').removeClass('specs');

        $length.find('input.selector').attr('data-length-type', 'regular');
        $length.find('.ruler[data-length-type="patch"]').slider('value',12);
        $length.find('.ruler[data-length-type="regular"]').slider('value',10);
        $length.find('input[data-length-type="patch"]').val(12);
        $length.find('input[data-length-type="regular"]').val(10);

        $display.find('img').attr('src',BLANK_IMAGE_URL);
        $display.find('img.plug').attr('src',BLANK_PLUG_URL);
        $display.find('.cable > img').attr('src',BLANK_REGULAR_CABLE_URL);
        $display.find('.pointer.techflex').attr('data-techflex-color', 'blank');

        $('.tracker .dot').removeClass('done');

        CURRENT_CABLE = new Cable();
        CURRENT_CABLE.storage = 1;
    },

    formatTextForImageUrl = function(str) {

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
        function getUnits(type) {
            if( type === 'regular' ) return 'ft'; 
            if( type === 'patch' ) return 'in';
        }

        function buildLineItem() {
            var $block = $('<li/>').addClass('line-item');

            $block.append(
                $('<div/>').addClass('cable').append(
                    $('<p/>').addClass('type'),
                    $('<div/>').addClass('specs'),
                    $('<button/>').click(function() {
                        $(this).parent().toggleClass('open');
                    }).text('Details')
                ),

                $('<div/>').addClass('qty').append(
                    $('<label/>').text('Qty'),
                    $('<input/>').attr('type', 'text').on('keyup', updateQuantity),
                    $('<button/>').text('Remove')
                ),

                $('<div/>').addClass('price').append(
                    $('<p/>')
                )
            );

            return $block;
        }

        function fillLineItem($block, data) {
            // cable
            var cable_type = (data.cableType.type === 'instrument' ? 'Instrument/Patch ' : 'Cable '),
                cable_name = data.cable.name + ' ' + data.length.amount + ' '  + getUnits(data.length.type),
                cable_input = '',
                cable_output = '',
                cable_other = '',
                temp_color;

            if( data.cable.color ) {
                cable_name += ' | ' + data.cable.color.charAt(0).toUpperCase() + data.cable.color.slice(1);
            }

            // input plug
            var ip = data.input;
            cable_input = ip.manufacturer + ' ' + ip.model;
            if( ip.boot ) cable_input += ' | ' + ip.boot.charAt(0).toUpperCase() + ip.boot.slice(1);
            if( ip.color ) cable_input += ' | ' + ip.color;

            // output plug
            var op = data.output;
            cable_output = op.manufacturer + ' ' + op.model;
            if( op.boot ) cable_output += ' | ' + op.boot.charAt(0).toUpperCase() + op.boot.slice(1);
            if( op.color ) cable_output += ' | ' + op.color;

            // other
            var o = data.other;
            if( o.tourproof ) {
                cable_other += "Tour-Proof; ";
            }

            if( o.techflex.length ) {
                cable_other += "Techflex; ";
            }

            if( o.reverse_plugs ) {
                cable_other += "Reversed-Plugs; ";
            }

            if( !cable_other.length ) {
                cable_other = "No extra options selected.";
            }
            
            var list = [cable_name, cable_input, cable_output, cable_other];

            $block.find('.cable .type').text(cable_type + data.storage);
            $(list).each(function() {
                $block.find('.cable .specs').append($('<span/>').html(this));
            });

            // qty
            $block.find('.qty input')
                .attr({
                    value: data.quantity,
                    id: 'cable_' + data.storage
                });

            $block.find('.qty label') 
                .attr('for', 'cable_' + data.storage);

            // price
            $block.find('.price p').text('$' + (data.price * data.quantity).toFixed(2));

            $block.css('order', data.storage).attr('data-storage-index', data.storage);
        }

        function checkData(data) {
            var mark = function(type) {
                    $(this).attr('data-storage-status', 'error');
                    $(this).find('p.' + type).attr('data-storage-error-p', 'true');
                },
                check = true;

            if( !data.cableType.prefix || !data.cableType.type ) {
                mark.call(this, 'type');
                check = false;
            }

            if( !data.cable.code ) {
                mark.call(this, 'cable');
                check = false;
            }

            if( !data.length.type || !data.length.amount ) {
                mark.call(this, 'length');
                check = false;
            }

            if( !data.input.manufacturer || !data.input.model ) {
                mark.call(this, 'input');
                check = false;
            }

            if( !data.output.manufacturer || !data.output.model ) {
                mark.call(this, 'output');
                check = false;
            }

            return check;
        }

        var bool = true;

        $('#confirmation .details ul').empty();

        $('.build', '#storage').not('[data-storage-status="inactive"]').each(function() {
            if( !checkData.call(this, $(this).data()) ) {
                bool = false;

                // uncomment to break on first error
                // return false;
            } else {
                var $block = buildLineItem();
                fillLineItem($block, $(this).data());
                $('#confirmation .details ul').append($block);
            }
        });


        $('#confirmation .line-item').on('click', '.qty button', handles.confirmation.remove);
        
        if( bool ) {
            calculateTotalCost();
            scrollToSection('confirmation', 500);
        }
    },

    calculateTotalCost = function() {
        var $this = $('#confirmation .totals h4 strong'),
            $builds = $('.build').not('[data-storage-status="inactive"]'),
            totalCost = 0.00;

        $builds.each(function() {
            totalCost += $(this).data().quantity * $(this).data().price;
        });

        $this.text('$' + totalCost.toFixed(2));
    },

    addToCart = function() {
        var delay = 750;

        $('#confirmation').addClass('pending');

        var number = $('.storage .build').not('[data-storage-status="inactive"]').length,
            counter = 0;

        $('.storage .build').not('[data-storage-status="inactive"]').each(function(i, v) {
            var el = v;
            setTimeout(function() {
                var _cable = $(el).data();

                var prefix = _cable.cableType.prefix,
                    cable_code = _cable.cable.code,
                    boots, techflexLength;

                var Post = {
                    'ProductCode': cable_code,
                    'ReplaceCartID':'',
                    'ReturnTo':'',
                    'btnaddtocart.x':'5',
                    'btnaddtocart.y':'5',
                    'e':''
                };

                Post['QTY.' + cable_code] = _cable.quantity;

                var cable, color, input, output, input_boot, output_boot, tourproof, techflex, reverse,
                    i, j, k, l, m, n,
                    opt, cat, ref, plug;

                for( i = 0, l = J_CABLES.length; i < l; i++ ) {
                    if( J_CABLES[i].code === cable_code ) {
                        cable = J_CABLES[i];
                        break;
                    }
                }

                opt = $('[data-option-id="' + prefix + cable_code.toLowerCase() + '"]').data().lengths[_cable.length.type][_cable.length.amount];
                cat = cable.lengths.option_category_id;
                Post[getOptionName('select', cable_code, cat)] = opt;

                if( _cable.cable.color ) {
                    ref = cable.colors.color;
                    for( i = 0, l < ref.length; i < l; i++ ) {
                        if( _cable.cable.color === ref[i].name ) {
                            color = ref[i];
                            break;
                        }
                    }

                    opt = color.id;
                    cat = cable.colors.option_category_id;
                    Post[getOptionName('select', cable_code, cat)] = opt;
                }

                ref = J_PLUGS[_cable.cableType.type];
                cat = ref.input_option_category_id;
                opt = null;
                for( i = 0, l = ref.plug.length; i < l; i++ ) {
                    plug = ref.plug[i];
                    if( _cable.input.manufacturer.toLowerCase() === plug.manufacturer.toLowerCase() &&
                        _cable.input.model.toLowerCase() === plug.model.toLowerCase()) {
                        if( !_cable.input.color ) {
                            opt = plug.color.input_option_id;
                        } else {
                            for( j = 0, m = plug.colors.color.length; j < m; j++ ) {
                                if( _cable.input.color.toLowerCase() === plug.colors.color[j].body.toLowerCase() ) {
                                    opt = plug.colors.color[j].input_option_id;
                                    break;
                                }
                            }
                        }
                    }
                    if( opt ) break;
                }
                Post[getOptionName('select', cable_code, cat)] = opt;

                if( _cable.input.boot.length ) {
                    ref = J_PLUGS.boots[_cable.input.model.split('-')[0].toLowerCase()];
                    cat = ref.input_option_category_id;
                    for( i = 0, l = ref.boot.length; i < l; i++ ) {
                        if( ref.boot[i].color === _cable.input.boot.toLowerCase() ) {
                            opt = ref.boot[i].input_option_id;
                            break;
                        }
                    }
                    Post[getOptionName('select', cable_code, cat)] = opt;
                }

                ref = J_PLUGS[_cable.cableType.type];
                cat = ref.output_option_category_id;
                opt = null;
                for( i = 0, l = ref.plug.length; i < l; i++ ) {
                    plug = ref.plug[i];
                    if( _cable.output.manufacturer.toLowerCase() === plug.manufacturer.toLowerCase() &&
                        _cable.output.model.toLowerCase() === plug.model.toLowerCase()) {
                        if( !_cable.output.color ) {
                            opt = plug.color.output_option_id;
                        } else {
                            for( j = 0, m = plug.colors.color.length; j < m; j++ ) {
                                if( _cable.output.color.toLowerCase() === plug.colors.color[j].body.toLowerCase() ) {
                                    opt = plug.colors.color[j].output_option_id;
                                    break;
                                }
                            }
                        }
                    }
                    if( opt ) break;
                }
                Post[getOptionName('select', cable_code, cat)] = opt;

                if( _cable.output.boot.length ) {
                    ref = J_PLUGS.boots[_cable.output.model.split('-')[0].toLowerCase()];
                    cat = ref.output_option_category_id;
                    for( i = 0, l = ref.boot.length; i < l; i++ ) {
                        if( ref.boot[i].color === _cable.output.boot.toLowerCase() ) {
                            opt = ref.boot[i].output_option_id;
                            break;
                        }
                    }
                    Post[getOptionName('select', cable_code, cat)] = opt;
                }

                opt = null;
                cat = null;
                if( _cable.other.tourproof ) {
                    opt = J_OTHER.tourproof.option_id;
                    cat = J_OTHER.tourproof.option_category_id;
                    Post[getOptionName('select', cable_code, cat)] = opt;
                }

                opt = null;
                cat = null;
                if( _cable.other.reverse_plugs ) {
                    opt = J_OTHER.reverse_plugs.option_id;
                    cat = J_OTHER.reverse_plugs.option_category_id;
                    Post[getOptionName('select', cable_code, cat)] = opt;
                }

                opt = null;
                cat = null;
                if( _cable.other.techflex ) {
                    ref = J_OTHER.techflex.color;
                    cat = ref.option_category_id;
                    for( i = 0, l = ref.option.length; i < l; i++ ) {
                        if( ref.option[i].desc === _cable.other.techflex ) {
                            opt = ref.option[i].id;
                            break;
                        }
                    }
                    Post[getOptionName('select', cable_code, cat)] = opt;

                    ref = J_OTHER.techflex.length;
                    cat = ref.option_category_id;
                    l = _cable.length.type === 'regular' ? _cable.length.amount : 
                            Math.floor( ( _cable.length.amount - 1 ) / 12 ) + 1;
                    opt = ref['feet_' + l];
                    Post[getOptionName('select', cable_code, cat)] = opt;
                }

                $.ajax({
                    url:'/ProductDetails.asp?ProductCode=' + cable_code + '&AjaxError=Y',
                    type: 'POST',
                    cache: false,
                    data: $.param(Post),
                    processData: false,
                    dataType: 'text',
                }).done(function() {
                    if( ++counter === number ) {
                        $('#confirmation').removeClass('pending').addClass('complete');
                        for (var i = 0; i < localStorage.length; i++) {

                            var n = localStorage.key(i);
                            if( n.indexOf('build_') > -1 ) {
                                localStorage.removeItem(n);
                            }

                            window.location.href = "/ShoppingCart.asp";
                        }
                    }
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    // alert("ERROR CS05: Something went wrong while adding this to the cart. I bet the intern monkey broke something again...");
                    $('#confirmation').addClass('error');
                    console.log(jqXHR);
                    console.log(textStatus);
                    console.log(errorThrown);
                });

            }, i * delay);
        });
    },

    launchModal = function(data) {
        var $container = $('.modal');

        $('body')
            .addClass('modal-open')
            .keydown(function(e) {
                if(e.keyCode == 27) { // esc
                    $(this).removeClass('modal-open');
                    $(this).off('keydown');
                }
            });

        $container
            .on('click', function() {
                $('body').removeClass('modal-open');
            })
            .find('.info').click(function(e) {
                if( e.target !== $('.modal button.close').get(0)) 
                    e.stopPropagation();
            }).html(data).prepend(
                $('<button/>').addClass('close').on('click', function() {
                    $('body').removeClass('model-open');
                }));
    },

    updateQuantity = function(e) {
        var val = $(this).val().replace(/\D/g, '');

        if( !val.length ) val = 1;
        $(this).val(val);

        if( $(this).parents('ul.builder').length) {
            CURRENT_CABLE.quantity = val;

        } else if( $(this).parents('#confirmation').length ) {
            var number = $(this).parents('.line-item').attr('data-storage-index'),
                this_build = $('.build[data-storage-id="' + +number + '"]');

            this_build.data().quantity = val;

            if( this_build.attr('data-storage-status') === 'current' ) {
                $('.builder.selected .option[data-option-type="quantity"] input', '#builders').val(val);
            }

            $(this).parent().next().children('p').text('$' + (val * this_build.data().price).toFixed(2));
            calculateTotalCost();
        }

        var data = {
            component: 'quantity',
            value: val
        };

        update.dispatch(data);
    },

    calculateCost = function() {
        var cable_price = 0,
            input_cost  = 0,
            output_cost = 0,
            extra_costs = 0,
            ppf = 0,
            cc = CURRENT_CABLE;

        if( cc.cable.code.length ) {
            if( cc.cableType.type === 'instrument' ) {
                ppf = +$('[data-option-id$="' + cc.cable.code.toLowerCase() + '"]').data().price;

                if( cc.length.type === 'regular' ) {
                    cable_price = ppf * cc.length.amount;

                } else if( cc.length.type === 'patch' ) {
                    cable_price = (ppf / 4) * ((Math.floor((cc.length.amount-1) / 3))+1);
                }
            } else if( cc.cableType.type === 'proAudio' ) {
                ppf = 0;
                cable_price = 0;
            }
        }

        input_cost = (cc.input.manufacturer && cc.input.model) ?
            +$('[data-option-id$="' + cc.input.manufacturer.toLowerCase() + '_' + cc.input.model.toLowerCase().replace(/ /g, '-') + '"]').data().price : 0;

        output_cost = (cc.output.manufacturer && cc.output.model) ?
            +$('[data-option-id$="' + cc.output.manufacturer.toLowerCase() + '_' + cc.output.model.toLowerCase().replace(/ /g, '-') + '"]').data().price : 0;

        if( cc.other.techflex || cc.other.techflex === 'true' ) {
            if( cc.cableType.type === 'instrument' ) {
                if( cc.length.type === 'regular' ) {
                    extra_costs += 0.25 * cc.length.amount;
                } else if(cc.length.type === 'patch' ) {
                    extra_costs += 0.25 * (Math.floor((cc.length.amount-1)/12) + 1);
                }
            }
        }

        if( cc.other.tourproof ) {
            extra_costs += 3;
        }

        var totalCost = cable_price + input_cost + output_cost + extra_costs;

        // return totalCost;
        cc.price = totalCost.toFixed(2);
    },

    storage = {
        reNumber: function() {
            var i, j, max, val,
                arr = this.builds,
                l = arr.length;

            for( i = 0; i < l; i++ ) {
                val = arr[i].data.storage;
                max = max > val ? max : val;
            }

            if( max === l ) return;

            for( i = 1; i <= l; i++ ) {
                val = arr[i].data;
                val.storage = i;
            }

            this.updateAll();
        },

        updateAll: function() {
            var i, arr = this.builds, l = arr.length;

            // remove all builds from storage
            for( i = 0; i < l; i++ ) {
                localStorage.removeItem('build_' + arr[i].data.storage);
            }

            // add all builds to storage
            for( i = 0; i < l; i++ ) {
                localStorage.addItem('build_' + arr[i].data.storage);
            }
        },

        handles: {
            declarations: function() {
                var self = this;

                $('.buttons button', '#storage').on('click', function(e) {
                    var type = e.target.getAttribute('data-storage-button');
                    self[type](e);
                });
            },

            create: function(e) {
                reset();
                var next = $('.build[data-storage-status="inactive"]:first'),
                    data = new Cable();

                data.storage = next.attr('data-storage-id');

                // set active to bypass checks in click handler
                next.attr('data-storage-status', 'active');

                next.data(data).trigger('click');

                $('.builder.selected .cable', '#builders').addClass('current').siblings().removeClass('current');
            },

            empty: function(e) {
                var i, l, arr = [], key, first;

                for( i = 0, l = localStorage.length; i < l; i++ ) {
                    key = localStorage.key(i);
                    if( key.indexOf('build_') > -1 ) {
                        arr.push(key);
                    }
                }

                for( i = 0, l = arr.length; i < l; i++ ) {
                    localStorage.removeItem(arr[i]);
                }

                $('.build', '#storage').attr('data-storage-status', 'inactive');

                reset();
                
                first = $('.build:first', '#storage');
                first.attr('data-storage-status', 'current');
                first.find('.information p').text('');
                first.find('.identifier .type').text('Inst/Patch').next().text('0.00');

                CURRENT_CABLE = new Cable();
                CURRENT_CABLE.storage = 1;

                update.dispatch(CURRENT_CABLE, true);
            },

            cart: function(e) {
                $('[data-step-value="confirm"]').trigger('click');
            }
        },

        construct: function() {
            var _block = function(i) {
                    var data, frame, build,
                        left, right;

                    build = new Basket();
                    data = new Cable();
                    frame = skeleton.clone(true);

                    data.storage = i;

                    build.data = data;

                    frame
                        .data(data)
                        .attr({
                            'data-storage-id': i,
                            'data-storage-status': 'inactive'
                        });

                    frame.find('button.set').click(function(e) {
                        build.set.call(build, e);
                        return false;
                    });
                    frame.find('button.remove').click(function(e) {
                        build.remove.call(build, e);
                        return false;
                    });
                    frame.click(function(e) {
                        build.load.call(build, e);
                    });

                    frame
                        .find('.identifier .id')
                        .text(i)
                            .siblings('.price')
                            .text('0.00');

                    return frame;

                },

                skeleton = $('.storage.skeleton', '#skeletons').remove().removeClass('skeleton storage'),
                parent = $('.builds', '#storage'),
                i;

            for( i = 1; i <= TOTAL_STORAGE; i++ ) {
                parent.append(_block.call(this, i));
            }
        },

        populate: function() {
            var builds = [],
                i, l, key, data, id;

            for( i = 0, l = localStorage.length; i < l; i++ ) {
                key = localStorage.key(i);
                if( key.indexOf('build_') > -1 ) {
                    builds.push(key);
                }
            }

            if( !builds.length ) {
                showIntro();
                return;
            }

            for( i = 0, l = builds.length; i < l; i++ ) {
                key = builds[i];
                data = JSON.parse(localStorage.getItem(key));
                id = data.storage;

                CURRENT_CABLE = data;

                $('[data-storage-id="' + id + '"]').attr('data-storage-status', 'active').data(data).find('.set').trigger('click');

                update.dispatch(CURRENT_CABLE, true);
            }
        },

        legacy: function() {
            var i, n, k, d, arr = [];
            for( i = 0, n = localStorage.length; i < n; i++ ) {
                k = localStorage.key(i);
                if( k.indexOf('build_') > -1 ) {
                    d = JSON.parse(localStorage.getItem(k));
                    if( !d.version || d.version !== 2.1 ) {
                        arr.push(k);
                    }
                }
            }

            for( i = 0, n = arr.length; i < n; i++ ) {
                localStorage.removeItem(arr[i]);
            }
        },

        init: function() {
            if( !Modernizr.localstorage ) {
                // generate a single build
                return false;
            }

            this.legacy();

            this.construct();
            this.populate();
            this.handles.declarations();
            
            var first = $('.build:first', '#storage');

            first
                .attr('data-storage-status', 'current')
                .trigger('click');

            $('input', '#details').prop('checked', false);
        }
    },

    handles = {
        jumpToStep: function(e) {
            var component = e.delegateTarget.getAttribute('data-pointer-component'),
                builder   = $('.builder.selected', '#builders');

            $('[data-pointer-component]')
                .removeClass('current')
                .filter(function() {
                    return this.getAttribute('data-pointer-component') === component;
                }).addClass('current');

            builder.children('li.' + component).addClass('current').siblings().removeClass('current');
        },

        queueWindowSizeChange: function() {
            $('#body #display .outer').addClass('loading');
            resize.viewport();
        },

        horizontalArrowKeys: function(e) {
            if( e.keyCode == 37 ) { // left
                var prev = $('ul.builder.selected li.current .step .previous');
                if( prev.length ) prev.click();
            } else if( e.keyCode == 39 ) { // right
                var next = $('ul.builder.selected li.current .step .next');
                if( next.length ) next.click();
            }
        },

        confirmation: {
            remove: function(e) {
                var id = e.delegateTarget.getAttribute('data-storage-index');

                $(e.delegateTarget).remove();

                $('.build[data-storage-id="' + id + '"] button.remove', '#storage').trigger('click');

                calculateTotalCost();

                if( !$('#confirmation .line-item').length ) {
                    scrollToSection('production', 500);
                    return;
                }
            }
        },

        declarations: function() {
            // Browser handles
            $('body').on('keydown', handles.horizontalArrowKeys);
            $(window).on('resize orientationchange', handles.queueWindowSizeChange).resize();

            // Production handles
            $('.pointer', '#display').on('click', handles.jumpToStep);
            $('.dot', '#tracker').on('click', handles.jumpToStep);

            // Confirmation handles
            $('#confirmation button.checkout').on('click', addToCart);
            $('#confirmation').find('.return').click(function() {
                scrollToSection('production', 500);
            });
        }
    },

    update = function() {
        var visual_changes = {
                cable: false,
                input: false,
                output: false,
                other: false
            },

            resetVisualChanges = function() {
                visual_changes = {
                    cable: false,
                    input: false,
                    output: false,
                    other: false
                };
            },

            updateAllVisual = function(data) {
                visual_changes = {
                    cable: true,
                    input: true,
                    output: true,
                    other: true
                };

                CURRENT_CABLE = data;

                backpack();
                pushVisual(visual_changes);
                progress();
            },

            visual = function(component) {
                // add translucent loading popup
                $('#body #display .outer').addClass('loading');

                visual_changes[component] = true;
                pushVisual(visual_changes);
            },

            pushVisual = debounce(function(changes) {
                var $display = $('div#display'),
                    $container;

                if( changes.cable ) {
                    $container = $display.find('div.cable');
                    var cable_color = (CURRENT_CABLE.cable.color ? '.' + CURRENT_CABLE.cable.color : ''),
                        cable_src = IMAGES_DIR + 'display/cable/' +
                            CURRENT_CABLE.cableType.type + '/' +
                            CURRENT_CABLE.length.type + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.cable.manufacturer) + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.cable.model) +
                            cable_color + '.png';

                    cable_src = (CURRENT_CABLE.cable.code ? cable_src : (CURRENT_CABLE.length.type === 'regular' ? BLANK_REGULAR_CABLE_URL : BLANK_PATCH_CABLE_URL));

                    $display.find('.cable > img').remove();
                    $container.prepend($('<img/>').attr('src', cable_src));
                }

                if( changes.input ) {
                    $container = $display.find('div.input');

                    // set input plug image
                    var $inputImage = $display.find('.input img.plug'),
                        input_src = IMAGES_DIR + 'display/plug/' +
                            CURRENT_CABLE.cableType.type + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.input.manufacturer) + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.input.model + (CURRENT_CABLE.input.color ? '.' + CURRENT_CABLE.input.color : '') + '.png');
                    input_src = (CURRENT_CABLE.input.manufacturer && CURRENT_CABLE.input.model ? input_src : BLANK_PLUG_URL);
                    $inputImage.attr('src', input_src);

                    // set input plug boot image
                    var $inputBootImage = $display.find('.input img.boot'),
                        inputBoot_src = IMAGES_DIR + 'display/plug/' +
                            CURRENT_CABLE.cableType.type + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.input.manufacturer) + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.input.model.split('-')[0]) + '/' +
                            CURRENT_CABLE.input.boot + '.png';
                    inputBoot_src = (CURRENT_CABLE.input.boot ? inputBoot_src : BLANK_IMAGE_URL);
                    $inputBootImage.attr('src', inputBoot_src);
                }

                if( changes.output ) {
                    $container = $display.find('div.output');

                    // set output plug image
                    var $outputImage = $display.find('.output img.plug'),
                        output_src = IMAGES_DIR + 'display/plug/' +
                            CURRENT_CABLE.cableType.type + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.output.manufacturer) + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.output.model + (CURRENT_CABLE.output.color ? '.' + CURRENT_CABLE.output.color : '') + '.png');
                    output_src = (CURRENT_CABLE.output.manufacturer && CURRENT_CABLE.output.model ? output_src : BLANK_PLUG_URL);
                    $outputImage.attr('src', output_src);

                    // set output plug boot image
                    var $outputBootImage = $display.find('.output img.boot'),
                        outputBoot_src = IMAGES_DIR + 'display/plug/' +
                            CURRENT_CABLE.cableType.type + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.output.manufacturer) + '/' +
                            formatTextForImageUrl(CURRENT_CABLE.output.model.split('-')[0]) + '/' +
                            CURRENT_CABLE.output.boot + '.png';
                    outputBoot_src = (CURRENT_CABLE.output.boot ?  outputBoot_src : BLANK_IMAGE_URL);
                    $outputBootImage.attr('src', outputBoot_src);
                }

                if( changes.other ) {
                }
                    
                $display.imagesLoaded().done( function() {
                    displayImages.resizeImage();
                    $('#body #display .outer').removeClass('loading');
                });

                // empty visual_changes object
                resetVisualChanges();
            }, 250),

            backpack = function() {
                function getUnits() {
                    if( length.type === 'regular' ) return 'ft'; 
                    if( length.type === 'patch' ) return 'in';
                }

                calculateCost();

                var $storage = $('.build[data-storage-id="' + CURRENT_CABLE.storage + '"]', '#storage'),
                    $info = $storage.find('.information'),
                    cc = CURRENT_CABLE,
                    cable  = cc.cable,
                    length = cc.length,
                    input  = cc.input,
                    output = cc.output,
                    other  = cc.other;

                $storage.data(CURRENT_CABLE);
                $storage.find('.identifier p.id').text(cc.storage);
                $storage.find('.identifier p.type').text('Inst/Patch');
                $storage.find('.identifier p.price').text(cc.price);

                $info.find('.qty').text(cc.quantity);
                $info.find('.cable').text(cable.name + (cable.color ? ' | ' + cable.color : ''));
                $info.find('.length').text(length.amount + '' + getUnits());
                $info.find('.input').text(
                    input.manufacturer + ' ' + input.model +
                    (input.color ? ' | ' + input.color :
                        input.boot ? ' | ' + input.boot : '')
                );
                $info.find('.output').text(
                    output.manufacturer + ' ' + output.model +
                    (output.color ? ' | ' + output.color :
                        output.boot ? ' | ' + output.boot : '')
                );
                $info.find('.other').text(
                    (other.tourproof ? 'Tourproof;' : '') + ' ' + 
                    (other.techflex.length ? 'Techflex;' : '') + ' ' +
                    (other.reverse_plugs ? 'Reversed;' : '')
                );

                /**
                 * hide other options row if empty; else show
                 */
                !$info.find('.other').text().trim().length ?
                    $info.find('.other').hide() :
                    $info.find('.other').show();

                /**
                 * update storage when missing components are selected
                 */
                if( $storage.hasClass('alert') ) {
                    $storage.find('.error').each(function() {
                        if( $(this).find('em').text().trim().length ) {
                            $(this).removeClass('error');
                        }
                    });

                    if( !$storage.find('.error').length ) {
                        $storage.removeClass('alert');
                    }
                }
            },

            progress = function() {
                // update the icons on the right               
                var complete = true,
                    $storage = $('.storage .build').filter(function() {
                        return $(this).data('storage') == CURRENT_CABLE.storage;
                    }),
                    $tracker = $('#tracker');

                if( !CURRENT_CABLE.cableType.prefix || !CURRENT_CABLE.cableType.type ) {
                    complete = false;
                }

                if( !CURRENT_CABLE.cable.code ) {
                    complete = false;
                    $tracker.find('.dot[data-pointer-component="cable"]').removeClass('done');
                } else {
                    $tracker.find('.dot[data-pointer-component="cable"]').addClass('done');
                }

                if( !CURRENT_CABLE.length.visited ) {
                    $tracker.find('.dot[data-pointer-component="length"]').removeClass('done');
                } else {
                    $tracker.find('.dot[data-pointer-component="length"]').addClass('done');
                }

                if( !CURRENT_CABLE.input.manufacturer || !CURRENT_CABLE.input.model ) {
                    complete = false;
                    $tracker.find('.dot[data-pointer-component="input"]').removeClass('done');
                } else {
                    $tracker.find('.dot[data-pointer-component="input"]').addClass('done');
                }

                if( !CURRENT_CABLE.output.manufacturer || !CURRENT_CABLE.output.model ) {
                    complete = false;
                    $tracker.find('.dot[data-pointer-component="output"]').removeClass('done');
                } else {
                    $tracker.find('.dot[data-pointer-component="output"]').addClass('done');
                }

                if( !CURRENT_CABLE.other.visited ) {
                    $tracker.find('.dot[data-pointer-component="other"]').removeClass('done');
                } else {
                    $tracker.find('.dot[data-pointer-component="other"]').addClass('done');
                }

                if( complete ) {
                    $storage.addClass('complete');
                } else {
                    $storage.removeClass('complete');
                }
            },

            builder = function() {
                var data = CURRENT_CABLE, a, b, c, d;

                if( data.cable.code.length ) {
                    $('.cable .active', '#builders').prop('checked', true)
                    a = $('[data-option-id="' + data.cableType.prefix + data.cable.code.toLowerCase() + '"]');
                    b = data.cable.color;

                    if( b.length ) {
                        a.find('[data-choice-value="' + b + '"]').trigger('click');
                    }

                    a.find('.selector').prop('checked', true);
                }

                if( data.input.manufacturer && data.input.model ) {
                    $('.input .active', '#builders').prop('checked', true)
                    a = data.input;
                    b = data.input.color;
                    c = data.input.boot;
                    d = $('[data-option-side="input"][data-option-id="' + data.cableType.prefix + (a.manufacturer + '_' + a.model).toLowerCase() + '"]')

                    if( b.length || c.length ) {
                        d.find('[data-choice-value="' + ( b || c ) + '"]').trigger('click');
                    }

                    d.find('.selector').prop('checked', true);
                }

                if( data.output.manufacturer && data.output.model ) {
                    $('.output .active', '#builders').prop('checked', true)
                    a = data.output;
                    b = data.output.color;
                    c = data.output.boot;
                    d = $('[data-option-side="output"][data-option-id="' + data.cableType.prefix + (a.manufacturer + '_' + a.model).toLowerCase() + '"]')

                    if( b.length || c.length ) {
                        d.find('[data-choice-value="' + ( b || c ) + '"]').trigger('click');
                    }

                    d.find('.selector').prop('checked', true);
                }
                
                $('[data-length-type="' + data.length.type + '"].ruler').slider('value', data.length.amount);
                $('[data-length-type="' + data.length.type + '"].input input').val(data.length.amount);
                $('[data-length-type="' + data.length.type + '"].choice img').trigger('click');

                $('[data-option-type="quantity"] input').val(data.quantity);
                if( data.other.reverse_plugs ) {
                    $('[data-option-type="reverse_plugs"] input').prop('checked', true);
                } else {
                    $('[data-option-type="reverse_plugs"] input').prop('checked', false);
                }

                if( data.other.techflex.length ) {
                    $('[data-option-type="techflex"] input[value="' + data.other.techflex + '"]').prop('checked', true);
                } else {
                    $('[data-option-type="techflex"] input[value="' + data.other.techflex + '"]').prop('checked', false);
                }

                if( data.other.tourproof ) {
                    $('[data-option-type="tourproof"] input').prop('checked', true);
                } else {
                    $('[data-option-type="tourproof"] input').prop('checked', false);
                }
            },

            configuration = function(data) {
                // c = component
                // t = type
                var c, t;

                if( data.component === 'cable' ) {
                    t = data.component;
                    c = CURRENT_CABLE[t];

                    var $builder = $('ul.builder.selected');

                    if( data.only_patch ) {
                        $builder.addClass('only_patch').find('.length .choice.patch .image').click();
                    } else {
                        $builder.removeClass('only_patch');
                    }

                    c.code = data.code;
                    c.color = data.choice || '';
                    c.manufacturer = data.manufacturer;
                    c.model = data.model;
                    c.name = data.manufacturer + ' ' + data.model;
                    
                } else if( data.component === 'plug' ) {
                    t = data.optionSide;
                    c = CURRENT_CABLE[t];

                    c.manufacturer = data.manufacturer;
                    c.model = data.model;

                    if( data.boots ) {
                        c.boot = data.choice;
                        c.color = '';
                    } else if ( data.colors ) {
                        c.boot = '';
                        c.color = data.choice;
                    } else {
                        c.boot = '';
                        c.color = '';
                    }

                } else if( data.component === 'length' ) {
                    t = data.component;
                    c = CURRENT_CABLE[t];

                    var previous_length_type = c.type;

                    c.amount = data.amount;
                    c.type = data.type;
                    c.unit = data.unit;

                    if( previous_length_type !== c.type ) {
                        t = 'cable';
                    }

                } else if( data.component === 'other' ) {
                    CURRENT_CABLE[data.component][data.type] = data.value;

                    if( data.type === 'reverse_plugs' ) {
                        t = 'other';
                    }

                } else if( data.component === 'quantity' ) {
                    CURRENT_CABLE.quantity = data.value;
                    $('.build[data-storage-status="current"]', '#storage').data().quantity = data.value;
                }

                if(t) visual(t);
                backpack();
                progress();
                $('.build[data-storage-status="current"] button.set', '#storage').trigger('click');
            },

            dispatch = function(data, all) {
                all ? updateAllVisual(data) : configuration(data);
            };

        update.dispatch = dispatch;
        update.builder = builder;
    },

    build = {
        id: null,
        name: null,
        initial: false,
        structure: null,
        prefix: null,

        initialize: function(type) {
            this.id = type.id;
            this.name = type.name;
            this.type = type.type;
            this.prefix = type.prefix + '_';
            this.initial = type.default;

            // this needs a more appropriate location
            $('input[type="checkbox"]', '#details').prop('checked', false);
            $('#body').attr('data-current-length-type', 'regular');

            build.builders();
            build.handles();
        },

        skeletons: {
            block: function() {
                var container = $('.option.skeleton', '#skeletons').clone(true);
                container.removeClass('skeleton');

                return container;
            }
        },

        builders: function() {
            var structure = $(getSkeleton.builders());

            structure.attr('id', this.type);

            if( this.initial ) {
                structure.addClass('selected');

                DEFAULT_CABLETYPE_PREFIX = this.prefix;
                DEFAULT_CABLETYPE_TYPE = this.type;

                CURRENT_CABLE = new Cable();
                CURRENT_CABLE.storage = 1;
            }

            this.structure = structure;
            $('#builders').append(structure);

            build.cables();
            build.length();
            build.plugs();
            build.other();
            build.filters();
        },

        cables: function() {
            var getLengthData = function(obj) {
                    var lengthObj = {};

                    lengthObj.category_id = obj.option_category_id;

                    if( obj.is_consistent ) {
                        var start, end,
                            i;

                        if( obj.patch && obj.regular ) {
                            lengthObj = {
                                patch: [],
                                regular: []
                            };

                            var patch = obj.patch,
                                regular = obj.regular;

                            // define patch lengths
                            start = patch.start_id;
                            end = patch.end_id;
                            if( end - start === 47 ) {
                                for( i = 0; i < 48; i++ ) {
                                    lengthObj.patch[i + 1] = start + i;
                                }
                            }

                            // define regular lengths
                            start = regular.start_id;
                            end = regular.end_id;
                            if( end - start === 17 ) {
                                for( i = 0; i < 18; i++ ) {
                                    lengthObj.regular[i + 3] = start + i;
                                }
                            }

                        } else { /* cable is not instrument cable */ }
                    } else { /* individual values are manually given */ }

                    return lengthObj;
                },

                getSpecData = function(obj) {
                    return {
                        "capacitance": obj.capacitance,
                        "flexibility": obj.flexibility,
                        "shield": obj.shield,
                        "diameter": obj.diameter
                    };
                },

                getColorData = function(obj) {
                    var colorObj = {}, color;

                    if( obj.option_category_id ) {
                        colorObj.category_id = obj.option_category_id;
                    }

                    for( var i = 0, n = obj.color.length; i < n; i++ ) {
                        color = obj.color[i];

                        if( color.default ) {
                            default_color = color.name;
                        }

                        colorObj[color.name] = {
                            'id': (color.id ? color.id : '')
                        };

                        if( color.out_of_stock ) {
                            colorObj[color.name].oos = true;
                        }
                    }

                    return colorObj;
                },

                getBuilderImageUrl = function() {
                    return IMAGES_DIR + 'builder/cable/' +
                        this.type + '/' +
                        formatTextForImageUrl(manufacturer) + '/' + 
                        formatTextForImageUrl(model) +
                        (default_color ? '.' + default_color : '') + '.jpg';
                },

                setSpecs = function() {
                    var info = this.find('.info'),
                        image = this.find('.image'),
                        list = document.createElement('ul'),
                        title = document.createElement('li'),
                        item, o, color, choices;

                    title.className = 'title';
                    title.innerHTML = 'Details';
                    list.appendChild(title);

                    for( o in specs ) {
                        if( specs.hasOwnProperty(o) ) {
                            item = document.createElement('li');
                            item.innerHTML = o + '<em>' + specs[o] + '</em>';
                            list.appendChild(item);
                        }
                    }

                    info.append(list);
                },

                i, n,
                structure, info, details,
                code, model, manufacturer, price, id, lengths, specs, colors, choice,
                attributes, data, default_color, oos,

                component = 'cable',

                prefix = this.prefix,
                premium = $('div.outer.premium', this.structure),
                standard = $('div.outer.standard', this.structure);

            for( i = 0, n = J_CABLES.length; i < n; i++ ) {
                // set reference to cable object
                info = J_CABLES[i];

                // variable initializations
                code = '';
                price = '';
                model = '';
                manufacturer = '';
                attributes = {};
                data = {};
                default_color = '';
                oos = false;

                // variable definition
                code = info.code;
                price = info.price;
                model = info.model;
                manufacturer = info.manufacturer;
                
                // compound definition
                id = prefix + code;

                // get individual block skeleton
                structure = this.skeletons.block();

                /**
                 * Define attributes
                 */
                    // identifiers
                attributes['data-option-id'] = id.toLowerCase();
                attributes['data-option-type'] = component;

                    // cable only avaible for patch
                if( info.is_only_patch ) {
                    attributes['data-option-only-patch'] = 'true';
                }

                /**
                 * Define data
                 */
                    // lengths
                lengths = getLengthData(info.lengths);
                data.lengths = lengths;

                    // specs
                specs = getSpecData(info.specs);
                data.specs = specs;

                    // colors
                colors = getColorData(info.colors);
                data.colors = colors;

                if( default_color ) {
                    data.choice = default_color;
                }

                if( info.out_of_stock ) {
                    structure.attr('data-oos', 'true');
                }

                    // general
                data.code = code;
                data.component = component;
                data.model = model;
                data.manufacturer = manufacturer;
                data.price = price;


                setSpecs.call(structure);
                build.createChoicesOverlay(component, model, structure, colors);

                /**
                 * Fill visible data fields
                 */
                structure.find('input.selector').attr('name', prefix + component);
                structure.find('.name span').text(manufacturer).next().text(model);
                structure.find('img.component').attr('src', getBuilderImageUrl.call(this));
                structure.find('.price').text(price);

                // Set element Flexbox Order style
                if( info.order ) {
                    structure.css('order', info.order);
                }

                // Append attributes and data to element
                structure.attr(attributes).data(data);

                // Append element to document
                if( info.is_premium ) {
                    premium.append(structure);
                } else {
                    standard.append(structure);
                }
            }
        },

        length: function() {
            var _choice = function() {
                    var reference = choices,
                        block, type, self,
                        images, image, name, desc, span;

                    for( type in types ) {
                        if( types.hasOwnProperty(type) ) {
                            self = types[type];
                            block = document.createElement('div');
                            block.className = 'choice';
                            block.setAttribute('data-length-type', type);
                            block.setAttribute('data-length-unit', self.unit);

                            images = document.createElement('div');
                            name = document.createElement('div');
                            desc = document.createElement('div');

                            images.className = 'image';
                                image = document.createElement('img');
                                image.className = 'active';
                                image.src = IMAGES_DIR + 'misc/length/instrument/silhouette/' + type + '-red.png';
                                images.appendChild(image);

                                image = document.createElement('img');
                                image.className = 'inactive';
                                image.src = IMAGES_DIR + 'misc/length/instrument/silhouette/' + type + '-gray.png';
                                images.appendChild(image);

                            name.className = 'name';
                                span = document.createElement('span');
                                span.innerHTML = type;
                                name.appendChild(span);

                            desc.className = 'desc';
                                span = document.createElement('span');
                                span.innerHTML = self.min + self.unit + '-' + self.max + self.unit;
                                desc.appendChild(span);

                            block.appendChild(images);
                            block.appendChild(name);
                            block.appendChild(desc);

                            reference.appendChild(block);
                        }
                    }

                    return reference;
                },

                _ruler = function() {
                    var reference = rulers,
                        block, type, self,
                        ruler;

                    for( type in types ) {
                        if( types.hasOwnProperty(type) ) {
                            self = types[type];

                            block = document.createElement('div');
                            block.className = 'ruler';
                            block.setAttribute('data-length-type', type);
                            block.setAttribute('data-length-unit', self.unit);
 
                            $(block).slider({
                                value: self.init,
                                min: self.min,
                                max: self.max,
                                range: 'max'
                            })

                            reference.appendChild(block);
                        }
                    }

                    return reference;
                },

                _input = function() {
                    var reference = inputs,
                        block, type, self,
                        span, input, label;

                    for( type in types ) {
                        if( types.hasOwnProperty(type) ) {
                            self = types[type];

                            block = document.createElement('div');
                            block.className = 'input';
                            block.setAttribute('data-length-type', type);
                            block.setAttribute('data-length-min', self.min);
                            block.setAttribute('data-length-max', self.max);

                            span = document.createElement('span');
                            span.innerHTML = 'Length';
                            block.appendChild(span);

                            input = document.createElement('input');
                            input.value = self.init;
                            block.appendChild(input);

                            label = document.createElement('label');
                            label.innerHTML = self.unit;
                            block.appendChild(label);

                            reference.appendChild(block);
                        }
                    }

                    return reference;
                },

                _measuredBy = function() {
                    var block = document.createElement('div'),
                        image = document.createElement('img');

                    image.src = IMAGES_DIR + 'misc/length/measurement.png';

                    block.className = 'notice';
                    block.appendChild(image);
                    return block;
                },

                selector, choices, rulers, inputs, types,
                prefix = this.prefix;


            selector = document.createElement('input');
            choices = document.createElement('div');
            rulers = document.createElement('div');
            inputs = document.createElement('div');

            selector.className = 'selector';
            selector.setAttribute('type', 'hidden');
            choices.className = 'choices';
            rulers.className = 'rulers';
            inputs.className = 'inputs';

            if( this.type === 'instrument' ) {
                types = {
                    patch: {
                        unit: 'in',
                        min: 3,
                        max: 48,
                        init: 12
                    },
                    regular: {
                        unit: 'ft',
                        min: 3,
                        max: 20,
                        init: 10
                    }
                };

                selector.setAttribute('data-length-type', 'regular');

                this.structure.find('li.length .options').append(
                    selector,
                    _choice(),
                    _ruler(),
                    _input()
                );
            }

            this.structure.find('li.length .options').prepend(_measuredBy);
        },

        plugs: function() {
            var getColorData = function(obj) {
                    var choices = {}, color, value;

                    for( var i = 0, n = obj.color.length; i < n; i++ ) {
                        color = obj.color[i];
                        value = color.body.toLowerCase();

                        if( color.default ) {
                            default_color = value;
                        }

                        choices[value] = {
                            'body': color.body,
                            'connector': color.connector,
                            'input_option_id': color.input_option_id,
                            'output_option_id': color.output_option_id
                        };

                        if( color.out_of_stock ) {
                            choices[value].oos = true;
                        }
                    }

                    return choices;
                },

                getBootData = function(obj) {
                    var choices = {}, choice, value,
                        type = 'boot';

                    for( var i = 0, n = obj[type].length; i < n; i++ ) {
                        choice = obj[type][i];
                        value = choice.color.toLowerCase();

                        if( choice.default ) {
                            default_boot = value;
                        }

                        choices[value] = {
                            'input_option_id': choice.input_option_id,
                            'output_option_id': choice.output_option_id
                        };

                        if( choice.out_of_stock ) {
                            choices[value].oos = true;
                        }
                    }

                    return choices;
                },

                getBuilderImageUrl = function(c, color) {
                    var url = '';
                    if( c === 'component' ) {
                        url = IMAGES_DIR + 'builder/plug/' +
                            this.type + '/' +
                            formatTextForImageUrl(manufacturer) + '/' + 
                            formatTextForImageUrl(model) +
                            (default_color ? '.' + default_color : '') + '.jpg';

                    } else if( c === 'choice' && color) {
                        url = IMAGES_DIR + 'builder/plug/' +
                            this.type + '/' +
                            formatTextForImageUrl(manufacturer) + '/' + 
                            formatTextForImageUrl(model.split('-')[0]) + '/' +
                            color + '.png';
                    }

                    return url;
                },

                setInfo = function(type) {
                    var specs = document.createElement('img');

                    specs.src = IMAGES_DIR + 'builder/plug/' +
                        type + '/' +
                        formatTextForImageUrl(manufacturer) + '/overlay/' +
                        formatTextForImageUrl(model) + '.png';
                },

                i, j, m, n,
                structure, info, details,
                angle, colors, manufacturer, model, price, id,
                attributes, data,
                colors, color, default_color, boots, boot, default_boot,
                input_category_id, output_category_id, side,

                component = 'plug',
                sides = ['input', 'output'],

                prefix = this.prefix,
                right, straight,
                json_plugs = J_PLUGS[this.type],
                json_boots = J_PLUGS.boots,
                type_plugs = json_plugs.plug;


            for( i = 0, m = sides.length; i < m; i++ ) {
                input_category_id = json_plugs.input_option_category_id;
                output_category_id = json_plugs.output_option_category_id;
                side = sides[i];

                right = $('.' + side + ' div.outer.right', this.structure);
                straight = $('.' + side + ' div.outer.straight', this.structure);

                for( j = 0, n = type_plugs.length; j < n; j++ ) {
                    // set reference to plug object
                    info = type_plugs[j];

                    angle = '';
                    manufacturer = '';
                    model = '';
                    price = '';
                    id = '';
                    colors = null;
                    boots = null;
                    attributes = {};
                    data = {};

                    default_color = '';
                    default_boot = '';

                    structure = this.skeletons.block();

                    angle = info.angle;
                    manufacturer = info.manufacturer;
                    model = info.model;
                    price = info.price;

                    id = (prefix + manufacturer + '_' + model).toLowerCase().replace(/ /g, '-');

                    attributes['data-option-id'] = id;
                    attributes['data-option-side'] = side;
                    attributes['data-option-type'] = component;

                    if( info.has_boots ) {
                        boots = getBootData(json_boots[model.split('-')[0].toLowerCase()]);
                        data.boots = boots;
                        structure.find('img.choice').attr('src', getBuilderImageUrl.call(this, 'choice', default_boot));
                    } else if( info.colors ) {
                        colors = getColorData(info.colors);
                        data.colors = colors;
                    }

                    if( default_color || default_boot ) {
                        build.createChoicesOverlay(component, model, structure, colors, boots);
                        data.choice = (default_color ? default_color : default_boot);
                    }

                    if( info.out_of_stock ) {
                        structure.attr('data-oos', 'true');
                    }

                        // general
                    data.component = component;
                    data.model = model;
                    data.manufacturer = manufacturer;
                    data.price = price;

                    setInfo.call(structure, this.type);

                    /**
                     * Fill visible data fields
                     */
                    structure.find('input.selector').attr('name', prefix + side)
                    structure.find('.name').text(manufacturer + ' ' + model);
                    structure.find('img.component').attr('src', getBuilderImageUrl.call(this, 'component'));
                    structure.find('.price').text(price);

                    // Set element Flexbox Order style
                    if( info.order ) {
                        structure.css('order', info.order);
                    }

                    // Append attributes and data to element
                    structure.attr(attributes).data(data);

                    // Append element to document
                    if( angle === 'straight' ) {
                        straight.append(structure);
                    } else if ( angle === 'right' ) {
                        right.append(structure);
                    }
                }
            }
        },

        other: function() {
            var _techflex = function() {
                    var data = J_OTHER.techflex,
                        colors = data.color,
                        lengths = data.length,
                        block = document.createElement('div'),
                        title = document.createElement('h3'),
                        description = document.createElement('p'),
                        cost = document.createElement('span'),
                        option = document.createElement('div'),
                        i, l, choice, input, span, label;

                    cost.innerHTML = '+0.25/ft';
                    cost.className = 'cost';

                    description.innerHTML = 'Add an extra layer of protection to your cable.';
                    title.innerHTML = 'Techflex';
                    title.appendChild(cost);
                    title.appendChild(description);
                    option.appendChild(title);

                    for( i = 0, l = colors.option.length; i < l; i++ ) {
                        var color = colors.option[i].desc,
                            id = colors.option[i].id;

                        choice = document.createElement('div');
                        choice.className = 'choice';

                        input = document.createElement('input');
                        input.id = prefix + 'techflex_' + color;
                        input.value = color;
                        input.type = 'radio';
                        input.name = prefix + 'techflex';

                        label = document.createElement('label');
                        label.setAttribute('for', prefix + 'techflex_' + color);

                        span = document.createElement('span');
                        span.innerHTML = color;

                        choice.appendChild(input);
                        choice.appendChild(span);
                        choice.appendChild(label);

                        option.appendChild(choice);
                    }

                    option.className = 'option';
                    option.setAttribute('data-option-type', 'techflex');

                    return option;
                },
                _tourproof = function() {
                    var block = document.createElement('div'),
                        title = document.createElement('h3'),
                        description = document.createElement('p'),
                        cost = document.createElement('span'),
                        option = document.createElement('div'),
                        choice = document.createElement('div'),
                        input = document.createElement('input'),
                        label = document.createElement('label'),
                        button = document.createElement('button');

                    $(button).text('?').on('click', function() {
                        launchModal($('<div/>').addClass('tourproof').html('<p>Our Tour Proof option is just one more way for us to improve the longevity of your cable. By Tour Proofing a cable, we reinforce the two most common points of cable failure:</p><p>1. We ensure that it\'s not physically possible for the hot connections to come in contact with any other part of the plug.</p><p>2. We apply the exact amount of strain relief tubing necessary for a perfectly snug fit where the plug meets the cable.</p><img src="' + IMAGES_DIR + 'misc/other/tourproof.jpg' + '"/>'));
                    });

                    description.innerHTML = 'Extra-precision reinforcement<br />to minimize failure.';
                    
                    title.innerHTML = 'Tour Proof';
                    title.appendChild(button);
                    title.appendChild(description);

                    cost.innerHTML = '+$3/cable';
                    cost.className = 'cost';

                    input.id = prefix + 'tourproof';
                    input.type = 'checkbox';

                    label.setAttribute('for', prefix + 'tourproof');

                    choice.className = 'choice';
                    choice.appendChild(input);
                    choice.appendChild(cost);
                    choice.appendChild(label);

                    option.className = 'option';
                    option.setAttribute('data-option-type', 'tourproof');
                    option.appendChild(title);
                    option.appendChild(choice);

                    return option;
                },
                _reversed_plugs = function() {
                    var block = document.createElement('div'),
                        title = document.createElement('h3'),
                        description = document.createElement('p'),
                        option = document.createElement('div'),
                        choice = document.createElement('div'),
                        input = document.createElement('input'),
                        label = document.createElement('label');

                    description.innerHTML = 'Reverse the orientation of a right<br />angle plug on your patch cable.';
                    title.innerHTML = 'Reverse Plug';
                    title.appendChild(description);
                    option.appendChild(title);

                    input.id = prefix + 'reverse_plugs'
                    input.type = 'checkbox';

                    label.setAttribute('for', prefix + 'reverse_plugs');

                    choice.className = 'choice';
                    choice.appendChild(input);
                    choice.appendChild(label);

                    option.className = 'option';
                    option.setAttribute('data-option-type', 'reverse_plugs');
                    option.appendChild(choice);

                    return option;
                },
                _quantity = function() {
                    var block = document.createElement('div'),
                        title = document.createElement('h3'),
                        options = document.createElement('div'),
                        option = document.createElement('div'),
                        input = document.createElement('input');

                    title.innerHTML = 'Quantity';
                    options.appendChild(title);

                    input.id = prefix + 'quantity';
                    input.type = 'text';
                    options.appendChild(input);

                    options.className = 'option';
                    options.setAttribute('data-option-type', 'quantity');

                    return options;
                },

                container = this.structure.find('li.other .options'),
                component = 'other',
                prefix = this.prefix;

            container.append(
                _techflex(),
                _tourproof(),
                _reversed_plugs(),
                _quantity()
            );
        },

        createChoicesOverlay: function(component, model, structure, colors, boots) {
            var o, choices, choice, current, value, div,
                container = structure.find('div.choices');

            model = model.toLowerCase().split('-')[0];

            container.className = "choices";
            container.attr('data-choice-model', model);

            if( component === 'cable' ) {
                container.attr('data-choice-component', 'color');
                for( o in colors ) {
                    if( colors.hasOwnProperty(o) ) {
                        if( o === 'category_id' ) continue;

                        if( !colors[o].id ) continue;
                        
                        div = $('<div/>')
                                .attr('data-choice-value', o)
                                .data('id', colors[o].id);

                        if( colors[o].oos ) {
                            div.attr('data-oos', 'true');
                        }

                        container.append(div.get(0));
                    }
                }

            } else if( component === 'plug' ) {
                if( colors && Object.keys(colors).length ) {
                    container.attr('data-choice-component', 'color');

                    for( o in colors ) {
                        if( colors.hasOwnProperty(o) ) {
                            current = colors[o];
                        
                            div = $('<div/>')
                                    .attr('data-choice-value', current.body).data({
                                        input_option_id: current.input_option_id,
                                        output_option_id: current.output_option_id
                                    });

                            if( current.oos ) {
                                div.attr('data-oos', 'true');
                            }

                            container.append(div.get(0));
                        }
                    }
                }

                if( boots && Object.keys(boots).length ) {
                    container.attr('data-choice-component', 'boot');
                    
                    for( o in boots ) {
                        current = boots[o];
                        
                        div = $('<div/>')
                                .attr('data-choice-value', o)
                                .data({
                                    input_option_id: current.input_option_id,
                                    output_option_id: current.output_option_id
                                });

                        if( current.oos ) {
                            div.attr('data-oos', 'true');
                        }

                        container.append(div.get(0));
                    }
                }
            }
        },

        filters: function() {
            var prefix = this.prefix,
                cableFilters = ['capacitance', 'flexibility', 'color'],
                plugFilters = ['manufacturer'],
                components = [['cable', cableFilters], ['input', plugFilters], ['output', plugFilters]],

                _init = function() {
                    var c, i, j, k, l, m, n, o, p,
                        component, type, filters, container, reset,
                        list, filter, option, colors, bool;

                    for( i = 0, l = components.length; i < l; i++ ) {
                        component = components[i];
                        type = component[0];
                        filters = component[1];
                        container = this.structure.find('li.' + component).find('.filters');

                        for( j = 0, m = filters.length; j < m; j++ ) {
                            filter = filters[j];
                            list = [];

                            if( filter === 'capacitance' || filter === 'flexibility' ) {
                                list = ['high', 'med', 'low'];

                            } else if( filter === 'color' ) {
                                option = this.structure.find('li.cable .option');

                                for( k = 0, n = option.length; k < n; k++ ) {
                                    colors = option.eq(k).data().colors;

                                    for( c in colors ) {
                                        if( colors.hasOwnProperty(c) ) {
                                            if( c === 'category_id' ) continue;

                                            bool = true;
                                            for( o = 0, p = list.length; o < p; o++ ) {
                                                if( list[o] === c ) {
                                                    bool = false;
                                                    break;
                                                }
                                            }

                                            if( bool ) list.push(c);
                                        }
                                    }
                                }

                                list.sort();

                            } else if( filter === 'manufacturer') {
                                option = this.structure.find('li.' + component).find('.option');

                                for( k = 0; k < option.length; k++ ) {
                                    var manufacturer = option.eq(k).data().manufacturer;

                                    bool = true;
                                    for( o = 0, p = list.length; o < p; o++ ) {
                                        if( list[o] === manufacturer ) {
                                            bool = false;
                                            break;
                                        }
                                    }

                                    if( bool ) list.push(manufacturer);
                                }

                                list.sort();
                            }

                            if( list.length ) container.append(_build(filter, list));
                        }
                        reset = $(document.createElement('button')).addClass('filter-clear').text('Clear Filters');
                        container.append(reset);
                    }  
                },

                _build = function(type, list) {
                    var outer, inner, active,
                        i, n = list.length,
                        block = function(value) {
                            var container, input, label;

                            type = type.toLowerCase();
                            value = value.toLowerCase();

                            container  = document.createElement('div');
                            input = document.createElement('input');
                            label = document.createElement('label');

                            $(container).addClass('filter-option');
                            $(input).attr({
                                type: (type === 'color' ? 'checkbox' : 'radio'),
                                name: prefix + 'filter-' + type,
                                id: prefix + 'filter-' + type + '-' + value,
                                value: value,
                                'data-filter-type': type
                            });
                            $(label).attr('for', prefix + 'filter-' + type + '-' + value).text(value);

                            $(container).append(input, label);

                            return container;
                        };

                    outer = $(document.createElement('div'))
                        .addClass('filter-container')
                        .attr('data-filter-type', type)
                        .attr('data-filter-open', 'closed')
                        .append(
                            $(document.createElement('input')).attr({
                                type: 'checkbox',
                                name: 'active'
                            }),
                            $(document.createElement('h2')).text(type)
                        );

                    inner = $(document.createElement('div')).addClass('filter');

                    for( i = 0; i < n; i++ ) {
                        inner.append(block(list[i]));
                    }
                    outer.append(inner);
                    return outer;
                };

            _init.call(this);
        },

        handles: function() {
            var builders = $('ul.builder', '#builders'),
                options = builders.find('.option'),
                filters = builders.find('.filters'),
                details = $('#details'),

                /**
                 * Switch between the color options of plugs and cables
                 */
                changeChoice = function(e) {
                    if( $(e.delegateTarget).attr('id') === 'details' ) {
                        $('.option[data-option-id="' + $(e.delegateTarget).attr('data-option-id') + '"] [data-choice-value="' + $(e.target).attr('data-choice-value') + '"]', '#builders').click();
                        return false;
                    }

                    var option = $(e.delegateTarget),
                        self = $(e.target),
                        type = self.parent().attr('data-choice-component'),
                        old_val = option.data('choice'),
                        new_val = self.attr('data-choice-value'),
                        selected = option.children('input').prop('checked'),
                        image, src, x, y;

                    image = type === 'boot' ? option.find('img.choice')[0] : option.find('img.component')[0];
                    src = image.src;
                    if( type === 'boot' ) {
                        x = src.lastIndexOf('/');
                        y = src.lastIndexOf('.');
                        old_val = src.substring(x + 1, y);
                        image.src = src.substring(0, src.indexOf(old_val)) + new_val + src.substring(y);
                    } else {
                        x = src.lastIndexOf('.');
                        y = src.lastIndexOf('.', x - 1);
                        old_val = src.substring(y + 1, x);
                        image.src = src.substring(0, src.indexOf(old_val)) + new_val + src.substring(src.lastIndexOf('.'));
                    }
                    

                    

                    if( selected || $('#details').attr('data-option-id') === option.attr('data-option-id') ) {
                        toggleSpecs(e);
                    }

                    option.attr('data-choice-oos', self.attr('data-oos') === 'true' ? 'true' : 'false');
                    if( self.attr('data-oos') === 'true' ) {
                        return false;
                    }

                    option.data().choice = new_val;

                    if( selected ) {
                        update.dispatch(option.data());
                    }

                    return false;
                },

                /**
                 * Switch between option choices (plugs/cables)
                 */
                changeOption = function(e) {
                    if( $(e.delegateTarget).attr('id') === 'details' ) {
                        var side = '';
                        if( e.delegateTarget.getAttribute('data-option-component') === 'plug' ) {
                            side = '[data-option-side="' + $('li.current', '#builders').attr('data-builder-component') + '"]';
                        }
                        $('.option' + side + '[data-option-id="' + $(e.delegateTarget).attr('data-option-id') + '"] button.select', '#builders').click();
                        return false;
                    }

                    if( $(e.delegateTarget).attr('data-oos') === 'true' ) {
                        return false;
                    }

                    var option = $(e.delegateTarget),
                        active = option.parents('li').find('input.active'),
                        input = option.children('input.selector'),
                        value = !input.prop('checked'),
                        data = option.clone(true).data();

                    if( option.attr('data-option-only-patch') ) {
                        $('#body').attr('data-only-patch', true);
                        $('.choice[data-length-type="patch"] img').trigger('click');
                    } else {
                        $('#body').attr('data-only-patch', false);
                    }

                    input.prop('checked', value);
                    active.prop('checked', value);

                    toggleSpecs(e);

                    if( !value ) {
                        for( var i in data ) {
                            if( i === 'component' || i === 'optionSide' ) continue;

                            data[i] = '';
                        }
                    }

                    update.dispatch(data);
                },

                changeOtherOption = {
                    techflex: function(e) {
                        e.preventDefault();

                        var input, checked, data = {}, value;

                        input = $(e.target).siblings('input');
                        checked = input.prop('checked');
                        value = !checked ? input.val() : '';

                        input.prop('checked', !checked);

                        data.type = 'techflex';
                        data.value = value

                        $('.pointer.techflex', '#display').attr('data-techflex-color', value);

                        changeOtherOption.update(data);
                    },
                    tourproof: function(e) {
                        var input, data = {};

                        input = $(e.target).siblings('input');

                        data.type = 'tourproof';
                        data.value = !input.prop('checked');

                        changeOtherOption.update(data);
                    },
                    reverse_plugs: function(e) {
                        var input, data = {};

                        input = $(e.target).siblings('input');

                        data.type = 'reverse_plugs';
                        data.value = !input.prop('checked');
                        
                        changeOtherOption.update(data);
                    },
                    quantity: debounce(function(e) {
                        var input, value, data;

                        input = e.target;
                        value = input.value.split('.')[0].replace(/\D/g, '');

                        value = value >= 1 ? +value : 1;

                        input.value = value;

                        data = {};
                        data.component = 'quantity';
                        data.value = value;

                        changeOtherOption.update(data);
                        return false;
                    }, 100),
                    update: function(data) {
                        data.component = data.component || 'other';
                        update.dispatch(data);
                    },
                    dispatch: function(e) {
                        changeOtherOption[e.delegateTarget.getAttribute('data-option-type')](e);
                    }
                },

                toggleSpecs = function(e) {
                    var option_type = e.delegateTarget.getAttribute('data-option-type');
                    if( option_type !== 'cable' && option_type !== 'plug' ) return false;

                    var option = $(e.delegateTarget),
                        data = option.data(),
                        details = $('#details'),
                        image, name, price, specs, choice, choices, manu, model,
                        spec;

                    image = option.find('img.component').attr('src');
                    choice = option.find('img.choice').attr('src');
                    choices = option.find('.choices').clone(true);
                    manu  = data.manufacturer;
                    model = data.model;
                    price = data.price;
                    specs = data.specs;

                    details.attr('data-oos', !!option.attr('data-oos'));
                    details.attr('data-choice-oos', option.attr('data-choice-oos') === 'true' ? 'true' : 'false');

                    details.attr({
                        'data-option-id': option.attr('data-option-id'),
                        'data-option-component': data.component
                    });

                    details.find('.wrap').attr('data-measurement-toggle', 'false');

                    details.find('input[type="checkbox"]').prop('checked', true);
                    details.find('img.component').attr('src', image);
                    details.find('img.choice').attr('src', (choice ? choice : BLANK_IMAGE_URL));
                    details.find('.choices').replaceWith(choices)
                    choices.children().length ? details.find('.choices').show() : details.find('.choices').hide();
                    details.find('.name span').text(manu).next().text(model);
                    details.find('.price').text(price);

                    if( specs ) {
                        var html = '';
                        for( spec in specs ) {
                            if( specs.hasOwnProperty(spec) ) {
                                html += '<span class="' + spec + '">' + spec + ': <strong>' + specs[spec] + '</strong></span>';
                            }
                        }
                        details.find('.specs').html(html).show();
                    } else {
                        details.find('.specs').hide();
                    }

                    return false;
                },

                toggleMeasurements = function(e) {
                    var val = e.target.getAttribute('data-measurement-toggle');

                    val = !val || val === 'false' ? 'true' : 'false';

                    e.target.setAttribute('data-measurement-toggle', val);
                },

                clickSpecs = function(e) {
                    return false;
                },

                changeLength = {
                    dispatch: function(length, type, unit) {
                        update.dispatch({
                            amount: length,
                            component: 'length',
                            unit: unit,
                            type: type
                        });
                    },

                    type: function(e) {
                        var length, unit, type;

                        type = $(e.delegateTarget).attr('data-length-type');
                        unit = $(e.delegateTarget).attr('data-length-unit');
                        length = $('.ruler[data-length-type="' + type + '"]').slider('value');

                        if( $(e.target).hasClass('inactive') ) {
                            $(e.target)
                                .parents('.options')
                                .find('.selector')
                                .attr('data-length-type', type);
                        }

                        $('#body').attr('data-current-length-type', type);

                        CURRENT_CABLE.other.reverse_plugs = false;

                        changeLength.dispatch(length, type, unit);
                    },

                    input: debounce(function(e) {
                        var length, type, min, max;

                        type = e.delegateTarget.getAttribute('data-length-type');
                        length = +e.target.value.split('.')[0].replace(/\D/g, '');
                        min = +e.delegateTarget.getAttribute('data-length-min');
                        max = +e.delegateTarget.getAttribute('data-length-max');

                        length = (
                            length < min ? min :
                                length > max ? max :
                                    !length ? min : length
                        );

                        e.target.value = length;

                        $('.ruler[data-length-type="' + type + '"]').slider('value', length);
                    }, 300),

                    slider: debounce(function(length, type, unit) {
                        changeLength.dispatch(length, type, unit);
                    }, 100)
                },

                changeFilters = function(e) {
                    e.preventDefault();
                    var self, filters, filterContainer, isChecked, component, options, active, checked, numChecked, hasChecked,
                        visibleOptions = function(i, v) {
                            var status = ['visible', 'block'];

                            for( var i = 0; i < status.length; i++ ) {
                                if( $(this).attr('data-filter-status') === status[i] ) return true;
                            }

                            return false;
                        },
                        filter = {
                            capacitance: function() {
                                var spec = +$(this).data().specs.capacitance;
                                spec = spec < 27 ? 'low' : spec > 36 ? 'high' : 'med';
                                
                                return spec !== val;
                            },
                            flexibility: function() {
                                return $(this).data().specs.flexibility !== val;
                            },
                            color: function() {
                                if( $(this).attr('data-filter-status') === 'block' ) {
                                    return true;
                                }

                                var colors = $(this).data().colors;

                                for( var c in colors ) {
                                    if( colors.hasOwnProperty(c) ) {
                                        if( c === 'category_id' ) continue;

                                        if( c === val ) {
                                            $(this).attr('data-filter-status', 'block');
                                            break;
                                        } else {
                                            $(this).attr('data-filter-status', 'filtered');
                                        }
                                    }
                                }
                            },
                            manufacturer: function() {
                                return $(this).data().manufacturer.toLowerCase() !== val;
                            }
                        },

                    self = $(e.target).prev('input'); // also $(this).prev('input')
                    filters = self.parents('.filters');
                    filterContainer = self.parents('.filter');
                    isChecked = self.prop('checked');

                    component = $(e.delegateTarget);
                    options = component.find('.option');
                    active = self.parents('.filter-container').find('input[name="active"]');

                    self.prop('checked', !isChecked);
                    
                    hasChecked = filterContainer.find('input:checked').length;
                    active.prop('checked', !!hasChecked);

                    numChecked = filters.find('.filter-option input:checked').length;
                    component.find('.filters .filter-clear').attr('data-filter-active', !!numChecked);

                    if( self.attr('data-filter-type') === 'color' ) {
                        active.val(
                            hasChecked === 0 ? '' :
                                hasChecked === 1 ? filterContainer.find('input:checked').val() : 'multiple'
                        );
                    } else {
                        active.val(self.val());
                    }


                    // rebuild visible options
                    checked = component.find('.filters .filter input:checked');
                    options.attr('data-filter-status', 'visible');
                    for( var i = 0; i < checked.length; i++ ) {
                        var type = checked.eq(i).attr('data-filter-type'),
                            val = checked.eq(i).val();

                        if( type === 'capacitance' ) {
                            options
                                .filter(visibleOptions)
                                .filter(filter.capacitance)
                                .attr('data-filter-status', 'hidden');

                        } else if( type === 'flexibility' ) {
                            options
                                .filter(visibleOptions)
                                .filter(filter.flexibility)
                                .attr('data-filter-status', 'hidden');

                        } else if( type === 'color' ) {
                            options
                                .filter(visibleOptions)
                                .each(filter.color);

                        } else if( type === 'manufacturer' ) {
                            options
                                .filter(visibleOptions)
                                .filter(filter.manufacturer)
                                .attr('data-filter-status', 'hidden');
                        }
                    }

                    component.find('.outer').each(function() {
                        !$(this).find('.option').filter(visibleOptions).length ?
                            $(this).attr('data-filter-empty', 'true') :
                            $(this).attr('data-filter-empty', 'false');
                    });

                    !options.filter(visibleOptions).length ?
                        component.find('div.options').attr('data-filter-empty', 'true') :
                        component.find('div.options').attr('data-filter-empty', 'false');
                },

                clearFilters = function(e) {
                    var target = $(e.target),
                        delegate = $(e.delegateTarget);

                    delegate.find('input:checked').prop('checked', false);
                    delegate.next().find('.option').attr('data-filter-status', 'visible');
                    delegate.next().find('[data-filter-empty]').attr('data-filter-empty', 'false');
                    target.attr('data-filter-active', false);
                },

                toggleFilter = function(e) {
                    var open = $(e.delegateTarget).attr('data-filter-open') === 'closed' ? 'open' : 'closed';

                    $(e.delegateTarget)
                        .attr('data-filter-open', open)
                        .siblings('div')
                            .attr('data-filter-open', 'closed');

                    $(document).on('click', function(e) {
                        if( !$(e.target).closest('.filter-container[data-filter-open="open"]').length ) {
                            $('.filter-container[data-filter-open="open"]', '#builders')
                                .attr('data-filter-open', 'closed');

                            $(this).off('click');
                        }
                    });
                },

                changeStep = function(e) {
                    var target = $(e.target).hasClass('next') ? $(e.delegateTarget).next() : $(e.delegateTarget).prev(),
                        component = target.attr('data-builder-component');

                    if( e.target.getAttribute('data-step-value') === 'confirm' ) {
                        goToConfirm();
                        return;
                    }

                    $(e.delegateTarget).removeClass('current');
                    target.addClass('current');

                    // start scroll at top
                    target.find('.options').slimScroll({'scrollTo': 0});

                    if( component === 'length' || component === 'other' ) {
                        CURRENT_CABLE[component].visited = true;
                        // TODO - How do I push an update to color the dots?
                    }

                    $('[data-pointer-component]').removeClass('current').filter(function(){
                        return this.getAttribute('data-pointer-component') === component;
                    }).addClass('current');

                    target.find('.selector:checked ~ .inner .specs').trigger('click');
                };

            filters.find('.filter-container').on('click', 'h2', toggleFilter);
            filters.on('click', 'button.filter-clear', clearFilters);
            builders.children('li').on('click', '.filter-container .filter-option label', changeFilters);

            builders.find('li').on('click', '.step button', changeStep);

            details.on('click', '.choices div', changeChoice);
            details.on('click', '.select', changeOption);
            details.on('click', '.wrap', toggleMeasurements)

            options.on('click', changeOption);
            options.on('click', '.choices div', changeChoice);

            options.on('click', '.specs', toggleSpecs);

            builders.find('li.other .option').on('click', 'label', changeOtherOption.dispatch);
            builders.find('li.other .option').on('keyup', 'input', changeOtherOption.quantity);

            builders.find('li.length .choice').on('click', 'img', changeLength.type);
            builders.find('li.length .input').on('keyup', 'input', changeLength.input);
            builders.find('li.length').on('slide', '.ruler', function(e, ui) {
                var length, unit, type;

                unit = $(e.target).attr('data-length-unit'),
                type = $(e.target).attr('data-length-type');
                length = ui.value;

                $('.input[data-length-type="' + type + '"] input').val(length);
                
                changeLength.slider(length, type, unit);
            });

            if( TOUCH ) {
                options.on('touchstart', toggleSpecs);
            }
        }
    },

    getSkeleton = {
        builders: function() {
            var container = document.createElement('ul'),
                cable, length, input, output, other,

                getFiltersBlock = function() {
                    var block = document.createElement('div');
                    block.className = 'filters';

                    return block;
                },

                getStepBlock = function(left, right) {
                    var block = document.createElement('div'),
                        button;
                    block.className = 'step';

                    if( left ) {
                        button = document.createElement('button');
                        button.className = 'previous';
                        // button.innerHTML = left;
                        button.setAttribute('data-step-value', left);
                        block.appendChild(button);
                    }

                    if( right ) {
                        button = document.createElement('button');
                        button.className = 'next';
                        // button.innerHTML = right;
                        button.setAttribute('data-step-value', right);
                        block.appendChild(button);
                    }

                    return block;
                },

                getOptionsBlock = function() {
                    var block = document.createElement('div');
                    block.className = 'options';

                    return block;
                },

                getCableBlock = function() {
                    var block = document.createElement('li'),
                        active = document.createElement('input'),
                        filters = getFiltersBlock(),
                        options = getOptionsBlock(),
                        step = getStepBlock(null, 'length');

                    block.className = 'cable current';
                    block.setAttribute('data-builder-component', 'cable');

                    active.className = 'active';
                    active.name = 'active';
                    active.type = 'checkbox';

                    $(options).append(
                        active,
                        $('<div/>').addClass('outer premium'),
                        $('<div/>').addClass('outer standard')
                    );

                    block.appendChild(filters);
                    block.appendChild(options);
                    block.appendChild(step);

                    return block;
                },

                getLengthBlock = function() {
                    var block = document.createElement('li'),
                        filters = getFiltersBlock(),
                        options = getOptionsBlock(),
                        step = getStepBlock('cable', 'input');

                    block.className = 'length';
                    block.setAttribute('data-builder-component', 'length');

                    block.appendChild(filters);
                    block.appendChild(options);
                    block.appendChild(step);

                    return block;
                },

                getPlugBlock = function(side) {
                    var block = document.createElement('li'),
                        active = document.createElement('input'),
                        filters = getFiltersBlock(),
                        options = getOptionsBlock(),
                        step = (side === 'input' ?
                            getStepBlock('length', 'output') :
                            getStepBlock('input', 'other'));

                    block.className = side;
                    block.setAttribute('data-builder-component', side);

                    active.className = 'active';
                    active.name = 'active';
                    active.type = 'checkbox';

                    $(options).append(
                        active,
                        $('<div/>').addClass('outer straight'),
                        $('<div/>').addClass('outer right')
                    );

                    block.appendChild(filters);
                    block.appendChild(options);
                    block.appendChild(step);

                    return block;
                },

                getOtherBlock = function() {
                    var block = document.createElement('li'),
                        filters = getFiltersBlock(),
                        options = getOptionsBlock(),
                        step = getStepBlock('output', 'confirm');

                    block.className = 'other';
                    block.setAttribute('data-builder-component', 'other');

                    block.appendChild(filters);
                    block.appendChild(options);
                    block.appendChild(step);

                    return block;
                };

            container.className = 'builder';

            cable = getCableBlock();
            length = getLengthBlock();
            input = getPlugBlock('input');
            output = getPlugBlock('output');
            other = getOtherBlock();

            container.appendChild(cable);
            container.appendChild(length);
            container.appendChild(input);
            container.appendChild(output);
            container.appendChild(other);

            return container;
        },

        block: function(type, prefix, side) {
            var container = $('.option.skeleton', '#skeletons').clone(true);
            container.removeClass('skeleton');

            return container;
        }
    },

    cobj = function(obj) {
        console.log(JSON.stringify(obj, null, 4));
    },

    clog = function(msg) {
        console.log(msg);
    },

    buildScrolls = function() {
        $('#confirmation .details .inner').slimScroll({
            allowPageScroll: true,
            alwaysVisible: true,
            distance: 3,
            height: '100%',
            position: 'right',
            start: 'top',
            touchScrollStep: 50,
            wheelStep: 10
        });

        $('ul.builder li .options').attr('data-scroll-pos', 'top').slimScroll({
            height: 'calc(100% - 160px)',
            position: 'right',
            distance: 3,
            alwaysVisible: true,
            start: 'top',
            allowPageScroll: true,
            railVisible: true,
            wheelStep: 10,

            // start scroll at the top every time
            scrollTo: 0,
            touchScrollStep: 50
        }).on({
            // when user scrolls to top or bottom
            // slimscroll: function(e, pos) {},

            // when user scrolls
            slimscrolling: function(e) {
                var percentage, pos;

                percentage  = +$(e.target).data('percentage');
                pos = (
                    !percentage ? 'top' :
                        percentage === 1 ? 'bottom' : 'center'
                );

                $(e.target).attr('data-scroll-pos', pos);
            }
        });     
    },

    initialSetup = function() {
        var section;

        displayImages();
        update();

        storage.init();

        section = $('body').attr('data-display-introduction') ? 'introduction' : 'production';
        $('#content').attr('data-active-section', section);

        handles.declarations();

        $('#tracker .dot').first().click();

        buildScrolls();
        window.xmlReady = true;
        ready();
    },

    ready = function() {
        if( !window.loaded  || !window.xmlReady ) return;

        setTimeout(function() {
            $('.loader').fadeOut('fast');
        }, 500);
    };

    $(document).ajaxStop(function() {
        if( !INITIALIZED ) {
            INITIALIZED = !INITIALIZED;
            initialSetup();
        }
    });

    /**
     * Starting function of the cable builder 
     * AJAX calls the XML file that defines the different options in the builder
     * Stores the data of each component into its respective global variable
     * Calls init() to begin building each component
     */
    $(document).ready(function() {
        $.getJSON( JSON_URL )
            .done(function(response) {
                OPTIONS_JSON = response.data;
                J_CABLE_TYPES = OPTIONS_JSON.cableTypes.type;
                J_CABLES      = OPTIONS_JSON.cables.cable;
                J_PLUGS       = OPTIONS_JSON.plugs;
                J_OTHER       = OPTIONS_JSON.other;

                for( var i = 0, n = J_CABLE_TYPES.length; i < n; i++ ) {
                    build.initialize(J_CABLE_TYPES[i]);
                }
            })
            .fail(function( jqXHR, textStatus, errorThrown ) {
                alert("ERROR CS01: Initialization JSON file not found.");
                console.error(jqXHR);
                console.error(textStatus);
                console.error(errorThrown);
            });
    });

    $(window).load(function() {
        window.loaded = true;
        ready();
    });

})(jQuery);