(function ($) {
    "use strict";
    var XML_URL = '/v/t/Builder/options.xml',
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
        BLANK_PATCH_CABLE_URL = IMAGES_DIR + 'cable_patch_outline.png',
        BLANK_REGULAR_CABLE_URL = IMAGES_DIR + 'cable_regular_outline.png',
        BLANK_IMAGE_URL = IMAGES_DIR + 'blank.png',
        COUNTER = 0,
        BENCH = 0,
        FLAG = false,
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
                change: false
            };
            this.inputPlug = {
                manufacturer: '',
                model: '',
                boot: '', // color
                color: ''
            };
            this.outputPlug = {
                manufacturer: '',
                model: '',
                boot: '', // color
                color: ''
            };
            this.other = {
                reverse_plugs: false,
                heatshrink: false,
                techflex: '' // color
            };
        },

    windowResize = function() {
        functionLog('windowResize');

        $('#screen-width').text(window.innerWidth);
        $('#screen-height').text(window.innerHeight);

        if( $('#content').hasClass('production') ) {
            scrollToSection('production');
        } else if( $('#content').hasClass('confirmation') ) {
            scrollToSection('confirmation');
        }

        repositionBuilders();
        resizeBuilders();
    },

    showIntro = function() {
        var $builders = $('#body > .builders'),
            $intro = $('<div/>').addClass('introduction');

        $intro.append(
            $('<h1/>').text('Welcome to the cable builder!'),
            $('<button/>').text('Click here to begin!')
        ).on('click', function() {
            var self = $(this),
                animation_time = 400;
            self.animate({
                opacity: 0
            }, animation_time);
            $builders.next().css('visibility', 'visible').animate({
                'opacity': 1
            }, animation_time);
            $builders.find('button.expand').css('visibility', 'visible').animate({
                'opacity': 1
            }, animation_time);
            setTimeout(function() {
                clog(self);
                self.remove();
            }, animation_time);
        });

        $builders.next().css('opacity', 0).css('visibility', 'hidden');
        $builders.find('button.expand').css('opacity', 0).css('visibility', 'hidden');

        $builders.prepend($intro);
    },

    repositionBuilders = function() {
        var $body = $('#body'),
            $builders = $body.find('.builders'),
            bodyHeight = $body.height(),
            buildersHeight = $builders.height();

        $builders.css('margin-top', (bodyHeight - buildersHeight) / 2);
    },

    resizeBuilders = function(width) {
        var $builders = $('#body > div.builders'),
            $outer    = $builders.find('div.outer').not('.other'),
            optionWidth = 170,
            parentWidth, numFit, containerWidth;

        if( !width ) {
            // resize builder to fit the current window
            parentWidth = $builders.width();
            numFit = Math.floor(parentWidth / optionWidth);
            containerWidth = optionWidth * numFit;
        } else {
            if( width.indexOf('%') > -1 ) {
                parentWidth = ($builders.parent().width() * (+width.replace(/\D/g,'') / 100)) - 65;
            } else {
                // assume px value
                parentWidth = +width.replace(/\D/g,'');
            }
            // resize the builder to fit width
            numFit = Math.floor(parentWidth / optionWidth);
            containerWidth = optionWidth * numFit;
        }

        $outer.width(containerWidth);

        setTimeout(function() {
            displayImages.resizeImage()
        }, 500);
    },

    toggleBuilderExpansion = function() {
        $('#body').toggleClass('expanded');

        if( $('#body').hasClass('expanded') ) resizeBuilders('80%');
        else resizeBuilders('50%');
    },

    scrollToSection = function(section, speed) {
        functionLog('scroll');

        if( speed ) {
            $('#content').animate({
                scrollTop: $('#' + section ).position().top + $('#content').scrollTop()
            }, speed);
        } else {
            $('#content').scrollTop($('#' + section ).position().top + $('#content').scrollTop());
        }
        $('#content').removeClass().addClass(section);
    },

    displayImages = function(caller) {
        functionLog((caller ? caller + '-->' : '') + 'displayImages');
        var plug_width = null,
            plug_height = null,

        resizeImage = function(size) {
            functionLog('displayImages/resizeImage');
            // assuming the height of the plug image is half of the cable image
            var $plugs = $('.display img.plug'),
                $boots = $('.display img.boot'),
                $cable = $('.display .cable > img');

            setCableSize();
            setPlugSize();
            setBootSize();

            var cableHeight = getCableHeight(),
                plugOffSet = getPlugOffSet(),
                bootTopOffSet = getBootTopOffSet(),
                bootRightOffSet = getBootRightOffSet();

            // 355|368 is the default offset at full size
            $plugs.parent().css('top', ((CURRENT_CABLE.length.type === 'regular' ? 355 : 368 ) / 500) * cableHeight + 'px');

            $('.display .inputPlug').css('left', plugOffSet);
            $('.display .outputPlug').css('right', plugOffSet - 1);
            $('.display .inputPlug .boot').css('right', bootRightOffSet);
            $('.display .outputPlug .boot').css('right', bootRightOffSet + (2 * getCurrentPlugWidthRatio()));
            $('.display .inputPlug .boot, .display .outputPlug .boot').css('top', bootTopOffSet);

            $('#body .display .outer').removeClass('loading');
        };

        function setCableSize() {
            function imageDimensionRatio(which) {
                switch( which ) {
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
                var $body = $('#body');
                if( $body.hasClass('patch') ) return 'patch';
                else if( $body.hasClass('regular') ) return 'regular';

                return '';
            }

            var $outer = $('#body > .display .outer'),
                $inner = $outer.children('.inner'),
                outerH = $('#body').height() * 0.8,
                outerW = ($('#body').width() * 0.5 - 125) * 0.8,
                bottomMargin = outerH / 35,
                which = getWhich(),
                imageToContainerRatio = imageToContainerRatio(which),
                imageDimensionRatio = imageDimensionRatio(which),
                height, width;

            if( outerW > outerH ) {
                height = outerH * imageToContainerRatio;
                width = height * imageDimensionRatio;

                if( width > outerW ) {
                    width = outerW * imageToContainerRatio;
                    height = width / imageDimensionRatio;
                }
            } else {
                width = outerW * imageToContainerRatio;
                height = width / imageDimensionRatio;
            }

            $inner.height(height);
            $inner.width(width);
            $outer.css('margin-bottom', bottomMargin);
        }

        function setPlugSize() {
            var $plugs = $('.display img.plug'),
                cableHeight = getCableHeight(),
                typeRatio = getCurrentTypeRatio(),
                height = cableHeight / typeRatio,
                width = height * (180/300);

            $plugs.height(height);
            $plugs.width(width);
        }

        function setBootSize() {
            var DEFAULT_BOOT_HEIGHT = 100,
                $boots = $('.display img.boot'),
                height = getCurrentPlugWidthRatio() * DEFAULT_BOOT_HEIGHT + 'px';

            $boots.height(height);
        }

        function getCurrentTypeRatio() {
            functionLog('displayImages/getCurrentTypeRatio');
            if( CURRENT_CABLE.length.type === 'regular' ) return 2; // 600 / 300
            else if( CURRENT_CABLE.length.type === 'patch' ) return 135/250;
        }

        function getPlugWidth() {
            functionLog('displayImages/getPlugWidth');
            var val;

            val = $('.display .inputPlug img.plug').width();

            if( !val ) return 0;

            return val;
        }

        function getCurrentPlugWidthRatio() {
            functionLog('displayImages/getCurrentPlugWidthRatio');
            return getPlugWidth() / DEFAULT_PLUG_WIDTH;
        }

        function getBootRightOffSet() {
            functionLog('displayImages/getBootRightOffset');
            var default_offset;

            if( CURRENT_CABLE.length.type === 'patch' ) {
                default_offset = 78;
            } else if( CURRENT_CABLE.length.type === 'regular' ) {
                default_offset = 12;
            }

            // if( CURRENT_CABLE.other.reverse_plugs ) {
            //     default_offset = -72;
            // }

            var offset = default_offset * getCurrentPlugWidthRatio();

            return offset;
        }

        function getBootTopOffSet() {
            functionLog('displayImages/getBootTopOffset');
            var default_offset;

            if( CURRENT_CABLE.length.type === 'patch' ) {
                default_offset = -8.5;
            } else if( CURRENT_CABLE.length.type === 'regular' ) {
                default_offset = 3;
            }

            // if( CURRENT_CABLE.other.reverse_plugs ) {
            //     default_offset = 71;
            // }

            var offset = default_offset * getCurrentPlugWidthRatio();

            return offset + 'px';
        }

        function getCableWidth() {
            functionLog('displayImages/getCableWidth');
            return $('.display .cable > img').width();
        }

        function getCableHeight() {
            functionLog('displayImages/getCableHeight');
            return $('.display .cable > img').height();
        }

        /**
         * Center of plug is 37px from the right side.
         * Center of cable is 24px from the side of the image
         * @return {int} Resized image ratio multiplied by default widths
         */
        function getPlugOffSet() {
            functionLog('displayImages/getPlugOffSet');

            var plugWidthRatio = getCurrentPlugWidthRatio(),
                cableWidth = getCableWidth();

            if( CURRENT_CABLE.length.type === 'patch' ) {
                return -97 * plugWidthRatio;
            } else if( CURRENT_CABLE.length.type === 'regular' ) {
                // 31 and 10 are the px distances from the edge of the image to the closest dot where the images are supposed to align
                return -1 * ( (31 * plugWidthRatio) - (10 * (cableWidth / 600)) );
            }
        }

        displayImages.resizeImage = resizeImage;
    },

    /**
     * JSON hack to return a deep copy of an object
     * @param  {Object} obj [Assumed that obj is of type Cable]
     * @return {Object}     [Returns a clone of obj]
     */
    clone = function(obj) {
        functionLog('clone');
        return (JSON.parse(JSON.stringify(obj)));
    },

    reset = function() {
        functionLog('reset');
        var $builder = $('ul.builder.selected'),
            $length = $builder.find('.length'),
            $display = $('div.display'),
            src;

        $('#body').removeClass('patch').addClass('regular');

        $builder.find('input:checked').prop('checked', false);
        $builder.find('.overlay').each(function() {
            src = this.src;
            this.src = src.substring(0, src.lastIndexOf('/')  + 1) + 'black.png';
        });
        $builder.find('.option.specs').removeClass('specs');

        $length.find('input[name="switch"]').removeClass().addClass('regular');
        $length.find('.rulerContainer.patch .ruler').slider('value',12);
        $length.find('.rulerContainer.regular .ruler').slider('value',10);
        $length.find('input.patch').val(12);
        $length.find('input.regular').val(10);

        $display.find('img').attr('src',BLANK_IMAGE_URL);
        $display.find('img.plug').attr('src',BLANK_PLUG_URL);
        $display.find('.cable > img').attr('src',BLANK_REGULAR_CABLE_URL);
        $('#techflexOverlay').removeClass();

        $('.tracker .dot').removeClass('done');

        if( $('.storage .build').length >= 5 ) {
            $('#storage_new').prop('disabled', true);
        } else {
            $('#storage_new').prop('disabled', false);
        }

        CURRENT_CABLE = new Cable();
    },

    formatTextForImageUrl = function(str) {
        functionLog('formatTextForImageUrl(' + str + ')');
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
        functionLog('getOptionName');
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
        functionLog('goToConfirm');
        function getUnits(type) {
            functionLog('goToConfirm/getUnits');
            if( type === 'regular' ) return 'ft'; 
            if( type === 'patch' ) return 'in';
        }

        function buildLineItem() {
            functionLog('goToConfirm/buildLineItem');
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
                    $('<button/>').text('Remove').click(function() {
                            //todo
                    }).addClass('hidden')
                ),
                $('<div/>').addClass('price').append(
                    $('<p/>')
                )
            );

            return $block;
        }

        function fillLineItem($block, data) {
            functionLog('goToConfirm/fillLineItem');
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

            var ip = data.inputPlug;
            cable_input = ip.manufacturer + ' ' + ip.model;
            if( ip.boot ) cable_input += ' | ' + ip.boot.charAt(0).toUpperCase() + ip.boot.slice(1);
            if( ip.color ) {
                ip.color = ip.color.toUpperCase();
                if( ip.color === '-BGG') {
                    temp_color = 'Black';
                } else if( ip.color === '-GGG' ) {
                    temp_color = 'Gold';
                } else if( ip.color === '-NGG') {
                    temp_color = 'Nickel';
                }
                cable_input += ' | ' + temp_color;
            }

            var op = data.outputPlug;
            cable_output = op.manufacturer + ' ' + op.model;
            if( op.boot ) cable_output += ' | ' + op.boot.charAt(0).toUpperCase() + op.boot.slice(1);
            if( op.color ) {
                op.color = op.color.toUpperCase();
                if( op.color === '-BGG') {
                    temp_color = 'Black';
                } else if( op.color === '-GGG' ) {
                    temp_color = 'Gold';
                } else if( op.color === '-NGG') {
                    temp_color = 'Nickel';
                }
                cable_output += ' | ' + temp_color;
            }

            var o = data.other;
            if( o.heatshrink ) {
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

            $block.css('order', data.storage);
        }

        function checkData(data) {
            var check = true,
                mark = function(type) {
                    var $target = $('.storage .build').eq(+data.storage - 1);

                    $target.addClass('open').addClass('alert');
                    $target.find('p.' + type).addClass('error')
                };

            if( !data.cableType.prefix || !data.cableType.type ) {
                mark('type');
                check = false;
            }

            if( !data.cable.code ) {
                mark('cable');
                check = false;
            }

            if( !data.length.type || !data.length.amount ) {
                mark('length');
                check = false;
            }

            if( !data.inputPlug.manufacturer || !data.inputPlug.model ) {
                mark('input');
                check = false;
            }

            if( !data.outputPlug.manufacturer || !data.outputPlug.model ) {
                mark('output');
                check = false;
            }

            return check;
        }

        var bool = true;

        $('#confirmation .details ul').empty();

        $('.storage .error').removeClass('error');
        $('.storage .alert').removeClass('alert');
        $('.storage .open').removeClass('open');

        $('.storage .build').each(function() {
            if( !checkData($(this).data()) ) {
                bool = false;
                return false;
            } else {
                var $block = buildLineItem();
                fillLineItem($block, $(this).data());
                $('#confirmation .details ul').append($block);
            }
        });
        
        if( bool ) {
            calculateTotalCost();
            scrollToSection('confirmation', 500);
        }
    },

    calculateTotalCost = function() {
        var $this = $('#confirmation .totals h3 strong'),
            $builds = $('.storage .build'),
            totalCost = 0.00;

        $builds.each(function() {
            totalCost += $(this).data().quantity * $(this).data().price;
        });

        $this.text('$' + totalCost.toFixed(2));
    },

    addToCart = function() {
        functionLog('addToCart');

        var delay = 500;

        $('.storage .build').each(function(i, v) {
            var el = v;
            setTimeout(function() {
                var _cable = $(el).data();

                var prefix = _cable.cableType.prefix,
                    cable_code = _cable.cable.code;

                var Post = {
                    'ProductCode': cable_code,
                    'ReplaceCartID':'',
                    'ReturnTo':'',
                    'btnaddtocart.x':'5',
                    'btnaddtocart.y':'5',
                    'e':''
                };

                Post['QTY.' + cable_code] = _cable.quantity;

                var opt_cat_id, opt_id;

                // set cable length
                opt_id     = $('#' + prefix + cable_code).parent().data().lengths[_cable.length.type + (_cable.length.amount * 1)];
                opt_cat_id = CABLES.find('cable').filter(function() {
                    return $(this).find('code').text() === _cable.cable.code;
                }).find('lengths').find('option_category_id').text();
                Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;

                // set input plug
                opt_id = PLUGS.find('plug').filter(function() {
                    return $(this).find('manufacturer').text() == _cable.inputPlug.manufacturer &&
                           $(this).find('model').text() == _cable.inputPlug.model;
                    })
                if( _cable.inputPlug.color.length ) {
                    opt_id = opt_id.find('color').filter(function() {
                        return $(this).find('suffix').text().toLowerCase() === _cable.inputPlug.color.substring(1).toLowerCase();
                    }).find('input_option_id').text();
                } else {
                    opt_id = opt_id.find('input_option_id').text();
                }
                opt_cat_id = PLUGS.find(_cable.cableType.type).find('input_option_category_id').text();
                Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;

                // set input boot
                if( _cable.inputPlug.boot.length ) {
                    var boots = PLUGS.find('boots').find(_cable.inputPlug.model.split('-')[0].toLowerCase());
                    opt_id = boots.find('boot').filter(function() {
                        return $(this).find('color').text() == _cable.inputPlug.boot;
                    }).find('input_option_id').text();
                    opt_cat_id = boots.find('input_option_category_id').text();
                    Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;
                }

                // set output plug
                opt_id = PLUGS.find('plug').filter(function() {
                    return $(this).find('manufacturer').text() == _cable.outputPlug.manufacturer &&
                           $(this).find('model').text() == _cable.outputPlug.model;
                    })
                if( _cable.outputPlug.color.length ) {
                    opt_id = opt_id.find('color').filter(function() {
                        return $(this).find('suffix').text().toLowerCase() === _cable.outputPlug.color.substring(1).toLowerCase();
                    }).find('output_option_id').text();
                } else {
                    opt_id = opt_id.find('output_option_id').text();
                }
                opt_cat_id = PLUGS.find(_cable.cableType.type).find('output_option_category_id').text();
                Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;

                // set output boot
                if( _cable.outputPlug.boot.length ) {
                    var boots = PLUGS.find('boots').find(_cable.outputPlug.model.split('-')[0].toLowerCase());
                    opt_id = boots.find('boot').filter(function() {
                            return $(this).find('color').text() == _cable.outputPlug.boot;
                        }).find('output_option_id').text();
                    opt_cat_id = boots.find('output_option_category_id').text();
                    Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;
                }

                // set heatshrink
                if( _cable.other.heatshrink ) {
                    opt_id = OTHER.find('heatshrink').find('option_id').text();
                    opt_cat_id = OTHER.find('heatshrink').find('option_category_id').text();
                    Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;
                }

                // set techflex
                if( _cable.other.techflex ) {
                    opt_id = OTHER.find('techflex').find('color').find('option').filter(function() {
                            return $(this).find('desc').text().toLowerCase() == _cable.other.techflex.toLowerCase();
                        }).find('id').text();
                    opt_cat_id = OTHER.find('techflex').find('color').find('option_category_id').text();
                    Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;

                    var techflexLength;
                    if( _cable.length.type === 'patch' ) {
                        techflexLength = Math.floor( (_cable.length.amount - 1) / 12 ) + 1;
                    } else {
                        techflexLength = _cable.length.amount;
                    }

                    opt_id = OTHER.find('techflex').find('length').find('feet_' + techflexLength).text();
                    opt_cat_id = OTHER.find('techflex').find('length').find('option_category_id').text();
                    Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;
                }

                // set reverse
                if( _cable.other.reverse_plugs ) {
                    opt_id = OTHER.find('reverse_plugs').find('option_id').text();
                    opt_cat_id = OTHER.find('reverse_plugs').find('option_category_id').text();
                    Post[getOptionName('select', cable_code, opt_cat_id)] = opt_id;
                }

                console.log(JSON.stringify(Post, null, 4));

                $.ajax({
                    url:'/ProductDetails.asp?ProductCode=' + cable_code + '&AjaxError=Y',
                    type: 'POST',
                    cache: false,
                    data: $.param(Post),
                    processData: false,
                    dataType: 'text',
                }).done(function() {
                    // redirect to cart?
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    alert("ERROR CS05: Something went wrong while adding this to the cart. I bet the intern monkey broke something again...");
                    console.error(jqXHR);
                    console.error(textStatus);
                    console.error(errorThrown);
                });

            }, i * delay);
        });
    },

    launchModal = function(e) {
        functionLog('launchModal');

        // prevent cable from being selected/deselected
        e.stopPropagation();

        var $container = $('.modal'),
            $this = $(this);

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
                e.stopPropagation();
            }).text(JSON.stringify($this.parents('.option').data(), null, 4));
    },

    updateQuantity = function() {
        functionLog('updateQuantity');

        var val = $(this).val().replace(/\D/g, '');

        if( !val.length ) val = 1;
        $(this).val(val);

        if( $(this).parents('ul.builder').length ) {
            CURRENT_CABLE.quantity = val;
        } else if( $(this).parents('div#confirmation') ) {
            var number = $(this).attr('id').substring($(this).attr('id').indexOf('_') + 1),
                this_build = $('.storage .build').eq(number - 1).data();
            this_build.quantity = val;
            $(this).parent().next().children('p').text('$' + (val * this_build.price).toFixed(2));
            calculateTotalCost();
        }

        updateStorage();
    },

    updateStorage = function(caller) {
        functionLog((caller ? caller + '-->' : '') + 'updateStorage');
        function getUnits() {
            functionLog('updateStorage/getUnits');
            if( CURRENT_CABLE.length.type === 'regular' ) return 'ft'; 
            if( CURRENT_CABLE.length.type === 'patch' ) return 'in';
        }

        function getCable() {
            functionLog('updateStorage/getCable');
            if( !CURRENT_CABLE.cableType.prefix || !CURRENT_CABLE.cable.code ) return '';
            return $('#' + CURRENT_CABLE.cableType.prefix + CURRENT_CABLE.cable.code).parent().data().name;
        }

        calculateCost();

        var $storage = $('.storage .build').filter(function() {
                return $(this).data('storage') == CURRENT_CABLE.storage;
            }),
            $info = $storage.find('.information'),
            length_switch = false;

        $storage.find('.identifier p.id').text(CURRENT_CABLE.storage);
        $storage.find('.identifier p.type').text('Inst/Patch');
        $storage.find('.identifier p.price').text(CURRENT_CABLE.price);

        $info.find('.type em').text(CURRENT_CABLE.cableType.type);
        $info.find('.cable em').text(getCable());
        $info.find('.length em').text(CURRENT_CABLE.length.amount + '' + getUnits());
        $info.find('.input em').text(CURRENT_CABLE.inputPlug.manufacturer + ' ' + CURRENT_CABLE.inputPlug.model);
        $info.find('.output em').text(CURRENT_CABLE.outputPlug.manufacturer + ' ' + CURRENT_CABLE.outputPlug.model);
        $info.find('.other em').text(
            (CURRENT_CABLE.other.heatshrink ? 'Heatshrink;' : '') + ' ' + 
            (CURRENT_CABLE.other.techflex.length ? 'Techflex;' : '') + ' ' +
            (CURRENT_CABLE.other.reverse_plugs ? 'Reversed Plugs;' : '')
        );

        if( !$info.find('.other em').text().trim().length ) {
            $info.find('.other').hide();
        }

        if( CURRENT_CABLE.other.heatshrink === true ) {
            $info.find('.options em').text('Extra Heatshrink: Yes');
        }
        if( CURRENT_CABLE.other.techflex ) {
            $info.find('.options em').append(document.createTextNode(' Techflex Shielding: Yes'));
        }

        /**
         * prevent unnecessary calls to updateVisual when length slider is moved
         * CURRENT_CABLE.length.change is changed solely in switchLengthType
         */
        if( CURRENT_CABLE.length.change || caller !== 'updateLength' ) {
            CURRENT_CABLE.length.change = false;
            updateVisual('updateStorage');
        }

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

        storeThis.save();
    },

    calculateCost = function() {
        functionLog('calculateCost');
        var cablePrice = 0.00,
            inputPlugCost = 0.00,
            outputPlugCost = 0.00,
            extraCosts = 0.00,
            ppf = 0.00,
            prefix = CURRENT_CABLE.cableType.prefix,
            length = CURRENT_CABLE.length.amount,
            length_type = CURRENT_CABLE.length.type,
            cable_type   = CURRENT_CABLE.cableType.type;

        if( cable_type === 'instrument' ) {
            ppf = CABLES.find('cable').filter(function() {
                return $(this).children('code').text() === CURRENT_CABLE.cable.code;
            }).find('price').text();
            if( length_type === 'regular' ) {
                cablePrice = ppf * length;
            } else if( length_type === 'patch' ) {
                cablePrice = +(ppf / 4) * ((Math.floor((length-1) / 3))+1);
            }
        }

        inputPlugCost = (CURRENT_CABLE.inputPlug.manufacturer && CURRENT_CABLE.inputPlug.model ?
            +PLUGS.find(CURRENT_CABLE.cableType.type).find('plug').filter(function() {
                return $(this).find('manufacturer').text() === CURRENT_CABLE.inputPlug.manufacturer &&
                       $(this).find('model').text() === CURRENT_CABLE.inputPlug.model;
            }).find('price').text() : 0);

        outputPlugCost = (CURRENT_CABLE.outputPlug.manufacturer && CURRENT_CABLE.outputPlug.model ?
            +PLUGS.find(cable_type).find('plug').filter(function() {
                return $(this).find('manufacturer').text() === CURRENT_CABLE.outputPlug.manufacturer &&
                       $(this).find('model').text() === CURRENT_CABLE.outputPlug.model;
            }).find('price').text() : 0);

        if( CURRENT_CABLE.other.techflex || CURRENT_CABLE.other.techflex === 'true' ) {
            if( cable_type === 'instrument' ) {
                if( length_type === 'regular' ) {
                    extraCosts += 0.25 * length;
                } else if(length_type === 'patch' ) {
                    extraCosts += 0.25 * (Math.floor((length-1)/12) + 1);
                }
            }
        }

        if( CURRENT_CABLE.other.heatshrink ) {
            extraCosts += 3;
        }

        var totalCost = cablePrice + inputPlugCost + outputPlugCost + extraCosts;

        // return totalCost;
        CURRENT_CABLE.price = totalCost.toFixed(2);
    },

    updateVisual = function(caller) {
        functionLog((caller ? caller + '-->' : '') + 'updateVisual');

        $('#body .display .outer').addClass('loading');

        // var cb = '?cb=' + new Date().getTime(),
        var cb = '',
            $display = $('div.display'),
            CC = clone(CURRENT_CABLE),
            cable_color = (CC.cable.color ? '.' + CC.cable.color : ''),
            cable_src = IMAGES_DIR + 'display/cable/' +
                        CC.cableType.type + '/' +
                        CC.length.type + '/' +
                        formatTextForImageUrl(CC.cable.manufacturer) + '/' +
                        formatTextForImageUrl(CC.cable.name.substring(CC.cable.manufacturer.length + 1)) +
                        cable_color + '.png' + cb,

            inPlug_src = IMAGES_DIR + 'display/plug/' +
                         CC.cableType.type + '/' +
                         formatTextForImageUrl(CC.inputPlug.manufacturer) + '/' +
                         formatTextForImageUrl(CC.inputPlug.model + CC.inputPlug.color) + '.png' + cb,

            inBoot_src = IMAGES_DIR + 'display/plug/' +
                         CC.cableType.type + '/' +
                         formatTextForImageUrl(CC.inputPlug.manufacturer) + '/' +
                         formatTextForImageUrl(CC.inputPlug.model.split('-')[0]) + '/' +
                         CC.inputPlug.boot + '.png' + cb,

            outPlug_src = IMAGES_DIR + 'display/plug/' +
                          CC.cableType.type + '/' +
                          formatTextForImageUrl(CC.outputPlug.manufacturer) + '/' +
                          formatTextForImageUrl(CC.outputPlug.model + CC.outputPlug.color) + '.png' + cb,

            outBoot_src = IMAGES_DIR + 'display/plug/' +
                          CC.cableType.type + '/' +
                          formatTextForImageUrl(CC.outputPlug.manufacturer) + '/' +
                          formatTextForImageUrl(CC.outputPlug.model.split('-')[0]) + '/' +
                          CC.outputPlug.boot + '.png' + cb,

            num_images = $display.find('img').length;

        var $cableImage = $display.find('.cable > img'),
            $inputPlugImage = $display.find('.inputPlug img.plug'),
            $outputPlugImage = $display.find('.outputPlug img.plug'),
            $inputBootImage = $display.find('.inputPlug img.boot'),
            $outputBootImage = $display.find('.outputPlug img.boot'),

            cable = (CC.cable.code ? cable_src : (CC.length.type === 'regular' ? BLANK_REGULAR_CABLE_URL + cb : BLANK_PATCH_CABLE_URL + cb)),
            input = (CC.inputPlug.manufacturer && CC.inputPlug.model ? inPlug_src : BLANK_PLUG_URL + cb),
            output = (CC.outputPlug.manufacturer && CC.outputPlug.model ? outPlug_src : BLANK_PLUG_URL + cb),
            inputBoot = (CC.inputPlug.boot ? inBoot_src : BLANK_IMAGE_URL),
            outputBoot = (CC.outputPlug.boot ?  outBoot_src : BLANK_IMAGE_URL);

        $display.imagesLoaded().done( function( instance ) {
            console.log($('.display .cable > img')[0].complete);
            displayImages.resizeImage('updateVisual');
        })
        .progress( function( instance, image ) {
            if( image.img.src.indexOf('display/cable') == -1 ) return;
            var result = image.isLoaded ? 'loaded' : 'broken';
            console.log(image);
            console.log( 'image is ' + result + ' for ' + image.img.src );
        });

        $cableImage.attr('src', cable);
        $inputPlugImage.attr('src', input);
        $outputPlugImage.attr('src', output);
        $inputBootImage.attr('src', inputBoot);
        $outputBootImage.attr('src', outputBoot);
    },

    updateDots = function() {
        functionLog('updateDots');

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

            if( $(this).find('input[type="radio"]:checked').length || $(this).find('input[type="checkbox"]:checked').length) {
                $dot.addClass('done');
            } else {
                $dot.removeClass('done');
            }
        })

        $tracker.children().removeClass('current');
        var current = $('ul.builder.selected').children('.current').attr('class').replace(/current/g, '').trim();
        $tracker.find('.' + current).addClass('current');
        rebuildScroll();
    },

    updateLength = function(ui) {
        functionLog('updateLength');

        var value;

        if( ui.options ) {
            value = ui.options.value;
        } else if( ui.value ) {
            value = ui.value;
        }

        CURRENT_CABLE.length.amount = value;

        CURRENT_CABLE.length.type = $(ui.handle).parent().data('type');
        updateStorage('updateLength');

        if( !$(ui.handle).parents('li.length').find('input.visited').prop('checked') ) {
            $(ui.handle).parents('li.length').find('input.visited').prop('checked', true);
            updateDots();
        }
    },

    updateOther = function() {
        functionLog('updateOther');
        var $parent = $(this).parents('.other').not('.filters').not('li'),
            $visited   = $parent.parent().find('input.visited');

        if( !$visited.prop('checked') ) $visited.prop('checked', true);

        if( $parent.hasClass('techflex') ) {
            var $radios = $parent.find('input[name="' + $(this).attr('name') + '"]'),
                $overlay = $('#techflexOverlay');

            if( $(this).data('checked') ) {
                $radios.prop('checked', false).data('checked', false);
                $overlay.removeClass();
            } else {
                $radios.data('checked', false);
                $(this).data('checked', true);
                $overlay.removeClass().addClass(this.value);
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
            if( $(this).prop('checked') ) {
                $('#body').addClass('reverse_plugs');
            } else {
                $('#body').removeClass('reverse_plugs');
            }
        }

        updateStorage('updateOther');
    },

    applyFilter = function() {
        functionLog('applyFilter');
        function getBrightnessFromCapacitance(val) {
            functionLog('applyFilter/getBrightnessFromCapacitance');
            if( +val < 27 ) return 'low';
            else if( +val >= 27 && +val <= 36 ) return 'med';
            else if( +val > 36 ) return 'high';
            return ''; 
        }
        var $button = $(this),
            $radio = $button.parents('.filter').find('input[name="' + $button.attr('name') + '"][type="radio"]'),
            type = $button.attr('class');

        $button.parents('.filterContainer')
            .removeClass()
            .addClass('filterContainer filter-open')
            .addClass($button.data('type'));

        if( $button.data('checked') && $radio.length ) {
            $radio.prop('checked', false).data('checked', false);
        } else {
            $radio.data('checked', false);
            $button.data('checked', true);
            $button.parents('.filterContainer').addClass('filter-on');

            if( type === 'brightness' || type === 'flexibility') {
                $button.parents('.filterContainer').addClass('filter-on-' + $button.val());
            } else if( type === 'manufacturer') {
                $button.parents('.filterContainer').addClass('filter-on-' + $button.val().replace(/&/g, 'and').toLowerCase());
            } else if( $button.attr('class') === 'color' ) {
                var $cbxes = $button.parents('.filter').find('input[name="' + $button.attr('name') + '"][type="checkbox"]:checked');

                if( $cbxes.length > 1 ) {
                    $button.parents('.filterContainer').addClass('filter-on-multiple');
                } else if( $cbxes.length === 1 ) {
                    $button.parents('.filterContainer').addClass('filter-on-' + $cbxes.val());
                } else {
                    $button.parents('.filterContainer').removeClass('filter-on');
                }
            }

            $button.parent().addClass('filter-selected');

            if( type === 'brightness' || type === 'flexibility' ) {
                $button.parent().siblings().removeClass('filter-selected');
            }
        }

        var $parent = $button.parents('.filters').parent(), // <li class="cable current" />
            $containers = $parent.find('div.options'),
            $options = $containers.find('.option'),
            $radios = $button.parents('.filters').find('input[type="radio"]:checked'),
            $checks = $button.parents('.filters').find('input[type="checkbox"]:checked'),
            $this, value, filter, $visible, colors;

        $options.show();

        if( $parent.hasClass('cable') ) {
            $radios.each(function() {
                $this = $(this);
                value = $this.val();
                filter = $this.attr('class');

                $options.filter(function() {
                    if( $this.hasClass('brightness') ) {
                        return value !== getBrightnessFromCapacitance($(this).data().specs.capacitance);
                    } else if( $this.hasClass('flexibility') ) {
                        return value !== $(this).data().specs.flexibility;
                    }
                }).hide();
            });

            if( $checks.length ) {
                $visible = $parent.find('.option:visible');
                $visible.hide();

                $checks.each(function() {
                    value = $(this).val();
                    $visible.filter(function() {
                        colors = $(this).data().colors;

                        for( var color in colors ) {
                            if( color.indexOf(value) > -1 && color.indexOf('opt_') > -1 ) return true;
                        }

                        return false;
                    }).show();
                });
            }
        } else if( $parent.hasClass('inputPlug') || $parent.hasClass('outputPlug') ) {
            $radios.each(function() {
                $this = $(this);
                value = $this.val();
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
            $containers.addClass('empty');
        } else {
            $containers.removeClass('empty');
        }
    },

    changeOption = function() {
        functionLog('changeOption');
        cbreak('changeOption');
        var $option = $(this).parent(),
            newCable = new Cable(),
            set = true, src, color;

        if( $option.hasClass('cable') || $option.hasClass('plug')) {
            var $radio = $option.find('input[type="radio"]');
            if( !$radio.prop('checked') ) {
                $radio.prop('checked', true);

                $option.parents('.options').addClass('active').find('.option').removeClass('selected');
                $option.addClass('selected');
            } else {
                $radio.prop('checked', false);
                set = false;

                $option.parents('.options').removeClass('active');
                $option.removeClass('selected');
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
                    src = $option.find('.image img').attr('src');
                    color = src.substring(src.indexOf('.') + 1, src.lastIndexOf('.'));

                    CURRENT_CABLE.cable.color = color;
                } else {
                    CURRENT_CABLE.cable.color = '';
                }

                if( $option.hasClass('only_patch') ) {
                    $option.parents('ul.builder').addClass('only_patch');
                    $option.parents('ul.builder').find('.length .choice.patch .image').click();
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

                    if( $option.find('.image .boots').length ) {
                        src = $option.find('.image img.overlay').attr('src');
                        color = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

                        CURRENT_CABLE.inputPlug.boot = color;
                    } else {
                        CURRENT_CABLE.inputPlug.boot = '';
                    }

                    if( $option.find('.image .colors').length ) {
                        src = $option.find('.image img').attr('src');
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

                    if( $option.find('.image .boots').length ) {
                        src = $option.find('.image img.overlay').attr('src');
                        color = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

                        CURRENT_CABLE.outputPlug.boot = color;
                    } else {
                        CURRENT_CABLE.outputPlug.boot = '';
                    }

                    if( $option.find('.image .colors').length ) {
                        src = $option.find('.image img').attr('src');
                        color = src.substring(src.lastIndexOf('-'), src.lastIndexOf('.'));

                        CURRENT_CABLE.outputPlug.color = color;
                    } else {
                        CURRENT_CABLE.outputPlug.color = '';
                    }
                }
            }
        }

        updateStorage('changeOption');
        updateDots();
    },

    /**
     * Onclick function - displays builder depending on clicked cable type
     */
    changeTab = function() {
        functionLog('changeTab');
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
        functionLog('changeStep');
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
        functionLog('switchStep');
        var index = $(this).parent().find('.dot').index(this),
            steps = $('ul.builder.selected');

        steps.find('.current').removeClass('current');
        steps.children('li').eq(index).addClass('current');

        updateDots();
    },

    switchLengthType = function() {
        functionLog('switchLengthType');

        var $parent = $(this).parents('li.length'),
            $input = $parent.find('input[name="switch"]'),
            type = $(this).data('type');

        $parent.find('input.visited').prop('checked', true);

        $input.removeClass().addClass(type);

        if( !$('#body').hasClass(type) ) {
            var types = ['patch', 'regular'];

            for( var i = 0; i < types.length; i++ ) {
                $('#body').removeClass(types[i]);
            }

            $('#body').addClass(type);
        }
        CURRENT_CABLE.length.reverse_plugs = false;
        CURRENT_CABLE.length.change = true;
        updateLength($(this).parents('li.length').find('.rulerContainer.' + type + ' .ruler').slider('instance'));
    },

    toggleSpecs = function(e) {
        functionLog('toggleSpecs');
        e.preventDefault();
        e.stopPropagation();
        $(this).parents('.option').toggleClass('specs');
    },

    storeThis = function() {
        functionLog('storeThis');
        function loadBuild(options) {
            functionLog('storeThis/loadBuild');
            CURRENT_CABLE = options;
        }

        function selectBuildOptions(data) {
            functionLog('storeThis/selectBuildOptions');
            var prefix, type, name, src, image;
            if( data.cableType.prefix ) {
                prefix = data.cableType.prefix;
            }
            if( data.cableType.type ) {
                type = data.cableType.type;
            }

            if( !prefix || !type ) return;


            $('ul.builder').removeClass('selected');
            $('ul.builder#' + type).addClass('selected');

            $('.options.active').removeClass('active');
            $('.option.selected').removeClass('selected');

            $('div#body').removeClass().addClass(data.length.type);

            $('ul.builder#' + type).find('li.length .rulerContainer.' + data.length.type + ' .ruler')
                .slider('value', data.length.amount)
                .next().find('input').val(data.length.amount);
            $('ul.builder#' + type).find('li.length input[name="switch"]').attr('class', data.length.type);
            
            $('#' + prefix + data.cable.code)
                .prop('checked', true)
                .parent().addClass('selected')
                .parents('.options').addClass('active');

            // "\\&" escapes the ampersand (specifically in G&H) to be allowed in selector
            name = data.inputPlug.manufacturer.replace(/ /g, '_').replace(/&/g, '\\&') + '_' + data.inputPlug.model.replace(/ /g, '_');
            $('#' + prefix + 'inputPlug_' + name)
                .prop('checked', true)
                .parent().addClass('selected')
                .parents('.options').addClass('active');

            if( data.inputPlug.boot.length ) {
                image = $('#' + prefix + 'inputPlug_' + name).next().children('.overlay');
                src = image.attr('src');
                image.attr('src', src.substring(0, src.lastIndexOf('/') + 1) + data.inputPlug.boot + '.png');
            }

            if( data.inputPlug.color.length ) {
                image = $('#' + prefix + 'inputPlug_' + name).next().children('img');
                src = image.attr('src');
                image.attr('src', src.substring(0, src.lastIndexOf('-')) + data.inputPlug.color + '.jpg')
            }

            name = data.outputPlug.manufacturer.replace(/ /g, '_').replace(/&/g, '\\&') + '_' + data.outputPlug.model.replace(/ /g, '_');
            $('#' + prefix + 'outputPlug_'  + name)
                .prop('checked', true)
                .parent().addClass('selected')
                .parents('.options').addClass('active');

            if( data.outputPlug.boot.length ) {
                image = $('#' + prefix + 'outputPlug_' + name).next().children('.overlay');
                src = image.attr('src');
                image.attr('src', src.substring(0, src.lastIndexOf('/') + 1) + data.outputPlug.boot + '.png');
            }

            if( data.outputPlug.color.length ) {
                image = $('#' + prefix + 'outputPlug_' + name).next().children('img');
                src = image.attr('src');
                image.attr('src', src.substring(0, src.lastIndexOf('-')) + data.outputPlug.color + '.jpg')
            }


            if( data.other.reverse_plugs ) {
                $('#' + prefix + 'reverse_plugs').prop('checked', true);
            }

            if( data.other.heatshrink ) {
                $('#' + prefix + 'heatshrink').prop('checked', true);
            }

            if( data.other.techflex.length ) {
                $('#' + prefix + 'techflex_' + data.other.techflex).prop('checked', true);
                $('#techflexOverlay').addClass(data.other.techflex);
            }

            if( data.cable.code === 'CSB_EVIA_MNRL' ) {
                $('ul.builder.selected').addClass('only_patch');
            } else {
                $('ul.builder.selected').removeClass('only_patch');
            }

            $('input[name="' + prefix + 'quantity"]').val(data.quantity);

            updateStorage('selectBuildOptions');
            updateDots();
        }

        function getCurrentStorage() {
            functionLog('storeThis/getCurrentStorage');
            var $current = $('.storage .build').filter(function() {
                return $(this).data('storage') == CURRENT_CABLE.storage;
            });

            return $current;
        }

        function save() {
            functionLog('storeThis/save');
            var $block = getCurrentStorage();
            $block.data(CURRENT_CABLE);
            store($block);
        }

        function updateBuildCounter() {
            $('.storage').find('p.counter strong').text($('.storage .builds .build').length);
        }

        function remove() {
            functionLog('storeThis/remove');
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

            if( $('#storage_new').prop('disabled') ) {
                $('#storage_new').prop('disabled', false);
            }

            updateBuildCounter();
        }

        function reNumberStorage() {
            function styleStorage() {
                // give first cable class first
                $builds.filter(function() {
                    return $(this).css('order') == 1;
                }).addClass('first');

                // give largest numbered build class last
                $builds.filter(function() {
                    return $(this).css('order') == largest;
                }).addClass('last');
            }
            var largest = 0,
                $builds = $('.storage .build');

            $builds.each(function() {
                if( $(this).data().storage > largest ) largest = $(this).data().storage;
            });

            // if the numbers are already in order, return
            if( largest === $builds.length ) {
                styleStorage();
                return;
            }

            $builds.each(function(i) {
                var j = i + 1;
                $(this).data().storage = j;
                $(this).css('order', j);
                $(this).find('p.id').text(j);
            });
            styleStorage();
        }

        function load() {
            functionLog('storeThis/load');
            var data = $('.storage .builds').find('input[name="storage_build"]:checked').parent().data();

            // if a build is selected
            // checks to make sure this call isnt from initialization
            if( this ) {
                if( CURRENT_CABLE.storage === data.storage ) {
                    return false;
                }

                save();
            }

            $('.storage .build.open').removeClass('open');

            reset();

            $('#body .display .outer').addClass('loading');

            // set CURRENT_CABLE
            loadBuild(data);

            // load builder from CURRENT_CABLE
            selectBuildOptions(CURRENT_CABLE);

            // highlight current storage
            $('.storage .build').removeClass('current').filter(function() {
                return $(this).data().storage == CURRENT_CABLE.storage;
            }).addClass('current');
        }

        function create(data) {
            functionLog('storeThis/create');
            function getNextBlockNumber() {
                functionLog('storeThis/create/getNextBlockNumber');
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

            if(!data) {
                data = new Cable();
                i = getNextBlockNumber();
            } else {
                i = data.storage;
            }

            $block.data(data).data('storage', i).css('order', i);

            // instantiate text fields with default text
            $block.find('.identifier .id').text(i);
            $block.find('.identifier .type').text('inst/patch');
            $block.find('.identifier .price').text('0.00');

            return $block;
        }

        function generate() {
            functionLog('storeThis/generate');

            if( $('.storage .build').length >= 5 ) {
                $('#storage_new').prop('disabled', true);
                return;
            }

            var $block = create();

            reset();
            CURRENT_CABLE.storage = $block.data('storage');

            $block.find('input[name="storage_build"]').prop('checked',true);

            $('.storage .builds').append($block);

            // reset builder to first step
            $('ul.builder.selected > li').removeClass('current').first().addClass('current');
            
            // highlight current storage
            $('.storage .build').removeClass('current').filter(function() {
                return $(this).data().storage == CURRENT_CABLE.storage;
            }).addClass('current');

            if( $('.storage .build').length >= 5 ) {
                $('#storage_new').prop('disabled', true);
                return;
            }

            updateBuildCounter();
        }

        function build() {
            functionLog('storeThis/build');
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
            ).click(function() {
                $(this).siblings('input').prop('checked', true);
                storeThis.load();
            });

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
            functionLog('storeThis/store');
            data = $block.data();
            localStorage.setItem('build_' + data.storage, JSON.stringify(data));
        }

        function recall(data) {
            functionLog('storeThis/recall');
            var $block = create(data);
            $block.find('input[type="radio"]').prop('checked',true);
            $('.storage .builds').prepend($block);
            load();
        }

        $('#storage_save').on('click', function() {
        });

        $('#storage_new').on('click', function() {
            generate();
        });

        $('#storage_remove').on('click', function() {
            remove();
        });

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

        var numberLocalStorage = 0;

        for (var i = 0; i < localStorage.length; i++) {
            if( localStorage.key(i).indexOf('build_') > -1 ) {
                numberLocalStorage++;

                var data = JSON.parse(localStorage.getItem(localStorage.key(i)));
                recall(data);
            }
        }

        reNumberStorage();
        updateBuildCounter();

        if( !numberLocalStorage ) {
            $('#body').addClass('regular');
            generate();
            showIntro();
        }
    },

    /**
     * Takes data defined in the global variables and uses JS to build each option in each component
     */
    init = function() {
        functionLog('init');
        var $builders_container   = $('div.builders'),
            $cable_type_container = $('div.builders ul.cableTypes'),
            cable_container       = 'li.cable div.options',
            input_plug_container  = 'li.inputPlug div.options',
            output_plug_container = 'li.outputPlug div.options',
            other_container       = 'li.other div.options',

        getBuilderSkeleton = function(id) {
            functionLog('init/getBuilderSkeleton');
            var $skeleton = $('<ul/>').addClass('builder'),
                $c = $('<li/>').addClass('cable'),
                $l = $('<li/>').addClass('length'),
                $ip = $('<li/>').addClass('inputPlug'),
                $op = $('<li/>').addClass('outputPlug'),
                $o = $('<li/>').addClass('other')

            // append "Expand Builders" arrow
            $skeleton.append(
                $('<button/>').addClass('expand').click(toggleBuilderExpansion)
            );
            var $filters = $('<div/>')
                    .addClass('filters'),

                $options = $('<div/>')
                    .addClass('options'),

                $step = $('<div/>')
                    .addClass('step')
                    .append(
                        $('<button/>')
                            .addClass('previous')
                            .on('click', changeStep),
                        $('<button/>')
                            .addClass('next')
                            .on('click', changeStep)
                    );

            var step;
            step = $step.clone(true);
            step.find('.previous').remove();
            step.find('.next').text('Step 2');

            /**
             * Initialize Cable Section
             */
            $c.append(
                $filters.clone(true),
                $options.clone(true),
                step
            );
            $c.find('button.previous').remove();

            /**
             * Initialize Length Section
             */ 
            var $rulers = $('<div/>').addClass('rulers'),
                $rulerContainer = $('<div/>').addClass('rulerContainer'),
                $ruler = $('<div/>').addClass('ruler'),
                $length = $('<input/>').attr('type','text'),
                $lengthContainer = $('<div/>').addClass('lengthContainer'),

                $choices = $('<div/>').addClass('choices'),
                $choice = $('<div/>').addClass('choice'),

                $selected = $('<input/>').attr('type','hidden').attr('name','switch'),
                $visited = $('<input/>').addClass('hidden visited').attr('type','radio'),
                $measurement = $('<img/>', {
                    src: IMAGES_DIR + 'misc/length/measurement.png',
                    alt: "The measured length of the cable"
                }).addClass('measurement'),
                $measurement_small = $('<img/>', {
                    src: IMAGES_DIR + 'misc/length/measurement-small.png',
                    alt: "The measured length of the cable"
                }).addClass('measurement'),
                arr, rulers, choices, selected, visited;

            if( id === 'instrument' ) {
                rulers      = $rulers.clone(true);
                choices     = $choices.clone(true);
                selected    = $selected.clone(true);
                visited     = $visited.clone(true);

                /**
                 * [length type, unit, min, max, initial value]
                 */
                arr = [['patch', 'in', 3, 48, 12], ['regular', 'ft', 3, 20, 10]];

                // arr[1] is the default selected length type
                selected.addClass(arr[1]);

                for( var i = 0; i < arr.length; i++ ) {
                    var ruler   = $ruler.clone(true),
                        rulerContainer = $rulerContainer.clone(true),
                        length  = $length.clone(true),
                        lengthContainer = $lengthContainer.clone(true),
                        choice  = $choice.clone(true),
                        type    = arr[i][0],
                        unit    = arr[i][1],
                        minVal  = arr[i][2],
                        maxVal  = arr[i][3],
                        initVal = arr[i][4],
                        detail  = minVal + unit + '-' + maxVal + unit;

                    choice.addClass(type).append(
                        $('<input/>', {
                            type: 'radio',
                            name: 'choice_' + id
                        }),
                        $('<div/>')
                            .addClass('image')
                            .data('type', type)
                            .on('click', switchLengthType)
                            .append(
                                $('<img/>')
                                    .addClass('silhouette red')
                                    .attr('src',IMAGES_DIR + 'misc/length/instrument/silhouette/' + type + '-red.png'),
                                $('<img/>')
                                    .addClass('silhouette gray')
                                    .attr('src',IMAGES_DIR + 'misc/length/instrument/silhouette/' + type + '-gray.png')
                        ),
                        $('<div/>').addClass('type').append($('<span/>').text(type)),
                        $('<div/>').addClass('detail').append($('<span/>').text(detail))
                    ).appendTo(choices);

                    ruler.data('type', type).slider({
                        value: initVal,
                        min: minVal,
                        max: maxVal,
                        range: 'max',
                        slide: function(e, ui) {
                            $(ui.handle).parent().next().find('input').val(ui.value);
                            updateLength(ui);
                        // },
                        // change: function(e, ui) {
                        //     $(ui.handle).parent().next().find('input').val(ui.value);
                        //     updateLength(ui);
                        }
                    });

                    lengthContainer.append(
                        $('<span/>').text('Length')
                    );

                    length
                        .addClass(type)
                        .val(ruler.slider('value'))
                        .data({
                            'min': minVal,
                            'max': maxVal
                        })
                        .keydown(function(e) {
                            e.stopPropagation();
                        })
                        .change(function() {
                            var value = +$(this).val().split('.')[0].replace(/\D/g, '');

                            if( value < $(this).data('min') ) value = $(this).data('min');
                            if( value > $(this).data('max') ) value = $(this).data('max');

                            $(this).val(value);
                            $(this).parent().prev().slider('value', value);
                        })
                        .appendTo(lengthContainer);

                    lengthContainer.append(
                        $('<label/>').text(unit)
                    );

                    rulerContainer.addClass(type).append(ruler, lengthContainer).appendTo(rulers);
                }
            }

            step = $step.clone(true);
            step.find('.previous').text('Step 1');
            step.find('.next').text('Step 3');

            $l.append(
                $filters.clone(true).append(
                    $('<div/>').append(
                        $('<img/>')
                            .attr('src', IMAGES_DIR + 'misc/length/notice.png')
                            .addClass('notice').click(function() {
                                $(this).parent().toggleClass('showNotice');
                            }),
                        $measurement_small
                    )),
                $options.clone(true).append(
                    visited,
                    selected,
                    $measurement,
                    choices,
                    rulers
                ),
                step
            );

            /**
             * Initialize Input Plug Section
             */
            step = $step.clone(true);
            step.find('.previous').text('Step 2');
            step.find('.next').text('Step 4');
            $ip.append($filters.clone(true), $options.clone(true), step);

            /**
             * Initialize OutputPlug Section
             */
            step = $step.clone(true);
            step.find('.previous').text('Step 3');
            step.find('.next').text('Step 5');
            $op.append($filters.clone(true), $options.clone(true), step);

            /**
             * Initialize Others Section
             */
            var $confirm = $('<button/>').text('Confirm').addClass('next').on('click', goToConfirm);

            step = $step.clone(true);
            step.find('.previous').text('Step 4');
            step.find('.next').remove();
            step.append($confirm);
            $o.append($filters.clone(true).addClass('other'), $options.clone(true).empty(), step);

            if (id) $skeleton.attr('id', id);

            $skeleton.append($c, $l, $ip, $op, $o);

            return $skeleton;
        },

        getBlockSkeleton = function(type) {
            functionLog('init/getBlockSkeleton');
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
                    .append(
                        $('<button/>').append(
                            $('<span/>').addClass('pickme').text('Pick Me!'),
                            $('<span/>').addClass('picked').text('Picked')
                        )
                    ),

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
                            .on('click', launchModal)
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
            functionLog('init/fillBlock');
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
            functionLog('init/initCables');
            function changeColor(e) {
                functionLog('init/initCables/changeColor');
                e.stopPropagation();

                var $img = $(this).parents('.image').find('img'),
                    src = $img.attr('src'),
                    color = src.substring(src.indexOf('.') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(color, this.className));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) {
                    CURRENT_CABLE.cable.color = (this.className ? this.className : '');

                    updateStorage('initCables/changeColor');
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
                                formatTextForImageUrl(manufacturer) + '/' + 
                                formatTextForImageUrl(model) +
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
                                check = ( +$end.text() - +$start.text() === 47 ? true : false );
                                if( check ) {
                                    for( var i = 0; i < 48; i++) {
                                        lengths[name + (i + 1)] = +$start.text() + i;
                                    }
                                }
                            } else if( name.indexOf('regular') > -1 ) {
                                check = ( +$end.text() - +$start.text() === 17 ? true : false );
                                if( check ) {
                                    for( var j = 0; j < 18; j++) {
                                        lengths[name + (j + 3)] = +$start.text() + j;
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
            functionLog('init/initPlugs');
            function changeBoot(e) {
                functionLog('init/initPlugs/changeBoot');
                e.stopPropagation();

                var which = ($(this).parents('li').hasClass('inputPlug') ? 'inputPlug' : 'outputPlug');

                var $img = $(this).parents('.image').find('img.overlay'),
                    src = $img.attr('src'),
                    color = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(color, this.className));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) {
                    CURRENT_CABLE[which].boot = this.className;
                    updateStorage('initPlugs/changeBoot');
                }
            }

            function changeColor(e) {
                functionLog('init/changeBoot/changeColor');
                e.stopPropagation();

                var which = ($(this).parents('li').hasClass('inputPlug') ? 'inputPlug' : 'outputPlug');

                var $img = $(this).parents('.image').find('img'),
                    src = $img.attr('src'),
                    suffix = src.substring(src.lastIndexOf('-') + 1, src.lastIndexOf('.'));

                $img.attr('src', src.replace(suffix, $(this).data('suffix')));

                if( $(this).parents('.option').find('input.selector').prop('checked') ) {
                    CURRENT_CABLE[which].color = '-' + $(this).data('suffix');
                    updateStorage('initPlugs/changeColor');
                }
            }
            var $plugs = PLUGS.find(type).find('plug'),
                which = ['inputPlug', 'outputPlug'],
                which_container = [input_plug_container, output_plug_container],
                prefix = skeleton.data('prefix'),

                build = function() {
                    var $this = $(this),
                        $block = getBlockSkeleton('plug'),

                        manufacturer = $this.find('manufacturer').text(),
                        model = $this.find('model').text(),
                        model_split = model.split('-')[0],

                        default_color = ($this.find('colors').length ? '-' + $this.find('colors').find('default').parent().find('suffix').text() : ''),

                        manufacturer_image = formatTextForImageUrl(manufacturer),
                        model_image = formatTextForImageUrl(model + default_color),

                        options = {
                            id: prefix + which[i] + '_' + manufacturer.replace(/ /g, '_') + '_' + model.replace(/ /g, '_'),
                            name: manufacturer + ' ' + model,
                            price: $this.find('price').text(),
                            image_alt: manufacturer + ' ' + model,
                            image_src: IMAGES_DIR + 'builder/plug/' +
                                       type + '/' +
                                       manufacturer_image + '/' +
                                       model_image + '.jpg',
                            component: prefix + which[i],
                            manufacturer: manufacturer,
                            model: model,
                            specs: {
                                image_src: IMAGES_DIR + 'builder/plug/' +
                                           type + '/' +
                                           manufacturer_image + '/overlay/' +
                                           model_image + '.png'
                            }
                        },
                        data = {
                            'type': which[i],
                            'manufacturer': options.manufacturer,
                            'model': options.model,
                            'color': '',
                            'boot': ''
                        };

                    fillBlock($block, options);

                    if( $this.find('has_boots').length ) {
                        var default_color = PLUGS
                                            .find('boots')
                                            .find(model_split.toLowerCase())
                                            .find('default').parent()
                                            .find('color').text(),
                            $container = $('<div/>').addClass('boots'),
                            $overlay = $('<img/>')
                                .addClass('overlay')
                                .attr('src', IMAGES_DIR + 
                                         'builder/plug/' + 
                                         type + '/' + 
                                         formatTextForImageUrl(options.manufacturer) + '/' +
                                         formatTextForImageUrl(model_split) + '/' + 
                                         default_color + '.png'
                                );

                        PLUGS.find('boots').find(model_split.toLowerCase()).children('boot').each(function() {
                            $('<div/>')
                                .addClass($(this).find('color').text())
                                .on('click', changeBoot)
                                .appendTo($container);
                        });
                        data.boot = default_color;
                        $block.find('.image').append($overlay, $container);
                    }

                    if( $this.find('colors').length ) {
                        var $container = $('<div/>').addClass('colors');

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
            functionLog('init/initOther');
            var prefix = $(skeleton).data('prefix'),
                $container = $(skeleton).find(other_container);

            $container.append($('<input/>').addClass('hidden visited').attr('type','radio'));

            OTHER.children().each(function() {
                var name = this.tagName,
                    $this = $(this),
                    $title = $('<h3/>').text(name.replace(/_/g, ' ')),
                    $opt = $('<div/>').addClass('other outer').addClass(name);
                
                if( name === 'techflex' ) {
                    $title.append($('<span/>').text('+$0.50/ft'));
                } else if( name === 'heatshrink' ) {
                    $title.text('Tour-Proof');
                    $title.append($('<span/>').text('+$3 per cable'));
                } else if( name === 'reverse_plugs' ) {
                    $title.append($('<span/>').html('&nbsp;'));
                }

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
                                // .text(name.replace(/_/g, ' '))
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
                                // .text(desc)
                                .attr('for', prefix + name + '_' + desc)
                        );
                        $opt.append($option);
                    });

                }
                $opt.appendTo($container);
            });

            $('<div/>').addClass('other outer quantity').append(
                $('<h3/>').text('quantity'),
                $('<input/>', {
                    type: 'text',
                    name: prefix + 'quantity',
                    val: 1
                }).on('keyup', updateQuantity)
            ).appendTo($container);
        },

        initFilters = function() {
            functionLog('init/initFilters');
            var filterOpen = function() {
                if( !$(this).parent().hasClass('filter-open') ) {
                    $(this).parent().addClass('filter-open').siblings().removeClass('filter-open');
                } else {
                    $(this).parent().removeClass('filter-open');
                }

                $(this).parent().on('click', function(e) {
                    e.stopPropagation();
                });

                $(document).on('click', function() {
                    $('ul.builder .filterContainer').removeClass('filter-open');
                    $(this).off('click');
                });
            },

            initCableFilter = function() {
                functionLog('initFilters/initCableFilter'); 
                function colorFilter(parent) {
                    functionLog('colorFilter');
                    var $filterContainer = $('<div/>').addClass('filterContainer').data('type', 'color');
                    $('<h2/>').text('Color').addClass('color').click(filterOpen).appendTo($filterContainer);

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
                    functionLog('initFilters/initCableFilter/brightnessFilter');
                    var $filterContainer = $('<div/>').addClass('filterContainer').data('type', 'brightness');
                    $('<h2/>').text('Brightness').addClass('brightness').click(filterOpen).appendTo($filterContainer);

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
                    functionLog('initFilters/initCableFilter/flexibilityFilter');
                    var $filterContainer = $('<div/>').addClass('filterContainer').data('type', 'flexibility');
                    $('<h2/>').text('Flexibility').addClass('flexibility').click(filterOpen).appendTo($filterContainer);

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
                functionLog('initFilters/initPlugFilter');
                function manufacturerFilter(parent) {
                    functionLog('initFilters/initPlugFilter/manufacturerFilter');
                    var $filterContainer = $('<div/>').addClass('filterContainer').data('type', 'manufacturer');

                    $('<h2/>').text('Manufacturer').addClass('manufacturer').click(filterOpen).appendTo($filterContainer);
                    var $filterManufacturer = $('<div/>').addClass('filter'),
                    options = [];

                    $(parent).find('.options .option').each(function() {
                        var manu = $(this).data('manufacturer');
                        if( $.inArray(manu, options) === -1 ) options.push(manu);
                    });

                    $(options).each(function() {
                        var $filter = $('<div/>').addClass('filter-option');
                        var $label = $('<label/>')
                                .attr('for', $(parent).attr('class') + '-filter-manufacturer-' + this)
                                .text(this),
                            $radio = $('<input/>', {
                                'type': 'radio',
                                'name': $(parent).parents('ul.builder').data('prefix') + $(parent).attr('class') + '-filter-manufacturer',
                                'id': $(parent).attr('class') + '-filter-manufacturer-' + this,
                                'value': this
                            }).addClass('manufacturer').on('click', applyFilter);

                        $filter.append($radio, $label).appendTo($filterManufacturer);
                    });

                    $filterContainer.append($filterManufacturer);

                    $(parent).find('.filters').append($filterContainer);
                }

                $('ul.builder li.inputPlug, ul.builder li.outputPlug').each(function() {
                    manufacturerFilter(this);
                });
            };

            initCableFilter();
            initPlugFilter();
        },

        initBuilders = function() {
            functionLog('init/initBuilders');
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
                        .addClass('outer')
                        .addClass('premium')
                        .append(
                                $('<h3/>').text('Premium')
                            ),
                    $('<div/>')
                        .addClass('outer')
                        .addClass('standard')
                        .append(
                                $('<h3/>').text('Standard')
                            )
                );

            $skeleton.find('.inputPlug .options')
                .append(
                    $('<div/>')
                        .addClass('outer')
                        .addClass('straight')
                        .append(
                                $('<h3/>').text('Straight Angle Plugs')
                            ),
                    $('<div/>')
                        .addClass('outer')
                        .addClass('right')
                        .append(
                                $('<h3/>').text('Right Angle Plugs')
                            )
                );

            $skeleton.find('.outputPlug .options')
                .append(
                    $('<div/>')
                        .addClass('outer')
                        .addClass('straight')
                        .append(
                                $('<h3/>').text('Straight Angle Plugs')
                            ),
                    $('<div/>')
                        .addClass('outer')
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


        if( CABLE_TYPES && CABLES && PLUGS && OTHER ) {
            CABLE_TYPES.find('type').each(initBuilders);
            init.filters = initFilters;
            cbreak('END INIT');
            FLAG = true;
        } else {
            alert("ERROR CS02: One or more of the categories did not load properly.");
        }
    },

    initializeDisplayPointers = function() {
        var $cableSelector = $('#cableSelector'),
            $lengthSelector = $('#lengthSelector'),
            $inputPlugSelector = $('#inputPlugSelector'),
            $outputPlugSelector = $('#outputPlugSelector'),
            $otherSelector = $('#otherSelector'),
            pointerClick = function(goTo) {
                $('.tracker .dot.' + goTo).click();
            };

        $cableSelector.find('.dot').on('click', function() {
            pointerClick('cable');
        });
        $lengthSelector.find('.dot').on('click', function() {
            pointerClick('length');
        });
        $inputPlugSelector.find('.dot').on('click', function() {
            pointerClick('inputPlug');
        });
        $outputPlugSelector.find('.dot').on('click', function() {
            pointerClick('outputPlug');
        });
        $otherSelector.find('.dot').on('click', function() {
            pointerClick('other');
        });

        $('#techflexOverlay').on('click', function() {
            if( $(this).is(':visible') ) {
                $('.tracker .dot.other').click();
            }
        });
    },

    clog = function(msg) {
        console.log(msg);
    },

    cbreak = function(msg) {
        // console.info('------------------------------=== ' + msg + ' ===------------------------------')
    },

    functionLog = function(name) {
        if( !FLAG ) return;
        // console.info(name);
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

    rebuildScroll = function() {
        $('ul.builder li .options').slimScroll({
            height: '100%',
            wheelStep: 10,
            position: 'right',
            distance: 3,
            alwaysVisible: true,
            start: 'top',
            allowPageScroll: true,
            railVisible: true,

            // start scroll at the top every time
            scrollTo: 0,
            touchScrollStep: 50
        }).on('slimscroll', function(e, pos) {
            // reach top|bottom
            $(e.target).removeClass().addClass('options').addClass(pos);
        }).on('slimscrolling', function(e) {
            // return pos of scrollbar
            // $(e.target).data('percentage') for percent position of scrollbar
            var $self = $(e.target),
                percentage = +$self.data('percentage');

            if( percentage === 0 || percentage === 1 ) {
                return;
            }

            $(e.target).removeClass().addClass('options');
        }).addClass('top');

        if( !$('ul.builder li .options').has('.scrollIndicator').length ) {
            var scrollIndicator = $('<div/>').addClass('scrollIndicator');
            scrollIndicator.append(
                $('<div/>').addClass('seeMore').addClass('up'),
                $('<div/>').addClass('seeMore').addClass('down')
            );
            $('ul.builder li .options').each(function() {
                $(this).parent().append(scrollIndicator.clone(true));
            });
        }

    },

    prep = function() {
        // set cable builder to default settings
        $('ul.builder').each(function() {
            $(this).find('li').first().addClass('current');
        });

        $('.tracker .dot').on('click', switchStep);

        $('#confirmation .close').on('click', function() {
            $('div.builders').removeClass('confirm');
        });

        init.filters();

        rebuildScroll();

        initializeDisplayPointers();

        $('#confirmation').find('.return').click(function() {
            scrollToSection('production', 500);
        });

        $('#confirmation .details .inner').slimScroll({
            height: '100%',
            wheelStep: 10,
            position: 'right',
            distance: 3,
            allowPageScroll: true,
            alwaysVisible: true,
            start: 'top',
            touchScrollStep: 50
        });

        storeThis();

        window.xmlReady = true;
        ready();
    },

    ready = function() {
        if( !window.loaded  || !window.xmlReady ) {
            return;
        }

        $('#test').on('click', function() {
            console.log(JSON.stringify(CURRENT_CABLE,null,4));
        });

        $('#test2').on('click', function() {
            $('.build').each(function() {
                console.log(JSON.stringify($(this).data(), null, 4));
            });
            
        });

        $('#confirmation button.checkout').click(addToCart);

        $('body').keydown(function(e) {
            if(e.keyCode == 37) { // left
                var prev = $('ul.builder.selected li.current .step .previous');
                if( prev.length ) prev.click();
            }
            else if(e.keyCode == 39) { // right
                var next = $('ul.builder.selected li.current .step .next');
                if( next.length ) next.click();
            }
        });

        var goWindowResize = debounce(function() {
            windowResize();
        }, 250);

        $(window).on('resize', goWindowResize).resize();
        window.addEventListener("orientationchange", goWindowResize, false);

        $(window).bind('beforeunload', function() {
        });

        scrollToSection('production');
        $('.loader').fadeOut('fast');
    },

    /**
     * Starting function of the cable builder 
     * AJAX calls the XML file that defines the different options in the builder
     * Stores the data of each component into its respective global variable
     * Calls init() to begin building each component
     */
    start = function() {
        functionLog('start');
        displayImages('start');

        $(document).ajaxStop(function() {
            if( !INITIALIZED ) {
                INITIALIZED = !INITIALIZED;
                prep();
            }
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

    $(window).load(function() {
        window.loaded = true;
        ready();
    });

})(jQuery);
