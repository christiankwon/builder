(function ($) {
    "use strict";

    var _id = function(id) { return document.getElementById(id); },
        _ce = function(e)  { return document.createElement(e); },
        _qs = function(q)  { return document.querySelector(q); };

    var JSON_URL = 'builder/js/options.json',
        IMAGES_DIR = 'builder/images/';

    if( window.location.protocol !== 'file:' ) {
        if( window.location.hostname.indexOf('www') === -1 ) {
            window.location.hostname = 'www.sinasoid.com';

            return;
        }
    }

    if( isMobile.any() ) {

        document.body.classList.add("isMobile");
    }

    var OPTIONS_JSON, J_CABLES, J_PLUGS, J_BOOTS, J_OTHER, J_RESTRICTIONS,
        CURRENT_CABLE = null,

        CURRENT_VERSION = 3,

        DEFAULT_CABLE_TYPE         = 'patch',
        DEFAULT_LENGTH             = 12,
        DEFAULT_UNIT               = 'in',

        // DEFAULT_CABLE_TYPE         = 'regular',
        // DEFAULT_LENGTH             = 10,
        // DEFAULT_UNIT               = 'ft',

        DEFAULT_PLUG_HEIGHT        = 300,
        DEFAULT_PLUG_WIDTH         = 180,
        DEFAULT_CABLE_HEIGHT       = 600,
        DEFAULT_CABLE_WIDTH        = 600,
        DEFAULT_PATCH_CABLE_HEIGHT = 162,
        DEFAULT_PATCH_CABLE_WIDTH  = 480,

        BP_SMALL                   = '(max-width: 599px)',
        MQ_SMALL                   = Modernizr.matchmedia ? window.matchMedia(BP_SMALL) : null,

        BLANK_PLUG_URL             = IMAGES_DIR + 'display/plug_outline.png',
        BLANK_PATCH_CABLE_URL      = IMAGES_DIR + 'display/cable_patch_outline.png',
        BLANK_INSTRUMENT_CABLE_URL = IMAGES_DIR + 'display/cable_instrument_outline.png',
        BLANK_IMAGE_URL            = IMAGES_DIR + 'blank.png',

        BLANK_IMAGE = {
            instrument: BLANK_INSTRUMENT_CABLE_URL,
            speaker:    BLANK_INSTRUMENT_CABLE_URL,
            patch:      BLANK_PATCH_CABLE_URL,
            input:      BLANK_PLUG_URL,
            output:     BLANK_PLUG_URL,
            boot:       BLANK_IMAGE_URL
        },

        INPUT_PLUG_OPTION_CATEGORY_ID  = 64,
        OUTPUT_PLUG_OPTION_CATEGORY_ID = 65,

        TECHFLEX_COST = 0.45,
        TOURPROOF_COST = 3,

        TOUCH = Modernizr.touch,

        OVERVIEW_ELEMENTS = {
            length: _id('overview-length'),
            cable:  _id('overview-cable'),
            input:  _id('overview-input'),
            output: _id('overview-output'),
            extras: _id('overview-extras')
        },

        DISPLAY_IMAGES = {
            cable: _id('cable-image'),
            input: _id('input-plug-image'),
            output: _id('output-plug-image'),
            inputBoot: _id('input-boot-image'),
            outputBoot: _id('output-boot-image')
        },

        DETAILS_CONTAINER = {
            cable: {
                wrap:          $(_id('cable-details-wrap')),
                manufacturer:  $(_id('cable-details-manufacturer')),
                model:         $(_id('cable-details-model')),
                img_component: $(_id('cable-details-component')),
                price:         $(_id('cable-details-price')),
                choice:        $(_id('cable-details-choices')),
                specs:         $(_id('cable-details-information')),
            },

            input: {
                wrap:          $(_id('input-details-wrap')),
                manufacturer:  $(_id('input-details-manufacturer')),
                model:         $(_id('input-details-model')),
                img_component: $(_id('input-details-component')),
                img_choice:    $(_id('input-details-choice')),
                price:         $(_id('input-details-price')),
                choice:        $(_id('input-details-choices')),
            },

            output: {
                wrap:          $(_id('output-details-wrap')),
                manufacturer:  $(_id('output-details-manufacturer')),
                model:         $(_id('output-details-model')),
                img_component: $(_id('output-details-component')),
                img_choice:    $(_id('output-details-choice')),
                price:         $(_id('output-details-price')),
                choice:        $(_id('output-details-choices')),
            }
        },

        BOOTS = {},

        Setup = function() {
            this.type = DEFAULT_CABLE_TYPE;
            this.length = {
                amount: DEFAULT_LENGTH,
                unit: DEFAULT_UNIT
            };
            this.cable = null;
            this.input = null;
            this.output = null;
            this.reverse_plugs = false;
            this.tourproof = false;
            this.techflex = '';
            this.price = 0;
            this.quantity = 1;
            this.version = CURRENT_VERSION;
            this.getPrice = function() {
                var total = 0,
                    length = this.length.amount;

                if( this.cable ) {
                    var price = this.cable.price;

                    if( this.type === 'patch' ) {
                        total += (price / 4) * (Math.floor((length - 1) / 3) + 1)
                    } else {
                        total += price * length;
                    }
                }

                if( this.input ) {
                    total += this.input.price;
                }

                if( this.output ) {
                    total += this.output.price;
                }

                if( this.tourproof ) {
                    total += TOURPROOF_COST;
                }

                if( this.techflex ) {
                    if( this.type === 'patch' ) {
                        total += TECHFLEX_COST * (Math.floor((length - 1) / 12 ) + 1);
                    } else {
                        total += TECHFLEX_COST * length;
                    }
                }

                return total;
            };
            this.getExtraOptions = function() {
                var str = '';

                if( this.techflex ) {
                    str += this.techflex + ' Techflex'
                }

                if( this.tourproof ) {
                    if( str ) { str += '; ' }

                    str += 'Tourproof'
                }

                if( this.reverse_plugs ) {
                    if( str ) { str += '; ' }

                    str += 'Reversed Plugs'
                }

                return str;
            };
        },

        Option = function(data) {
            this.code         = data.code;
            this.manufacturer = data.manufacturer;
            this.model        = data.model;
            this.nameObj      = data.name;
            this.price        = data.price;
            this.order        = data.order;
            this.status       = data.status;
            this.allowance    = data.allowance;
            this.detailsWrap  = DETAILS_CONTAINER[data.component];
            // this.perUnit   = data.perUnit;

            this.isSelected = function() {
                return CURRENT_CABLE[this.component] &&
                       CURRENT_CABLE[this.component].code === this.code;
            };

            this.getName = function() {

                return this.nameObj.manufacturer + ' ' + this.nameObj.model;
            };

            this.getPrice = function() {
                // need to format
                return this.price;
            };

            this.getAllowanceString = function() {
                var val = '';

                var a = this.allowance;

                if( a.patch ) {
                    val += 'patch ';
                }

                if( a.instrument ) {
                    val += 'instrument ';
                }

                if( a.speaker ) {
                    val += 'speaker ';
                }

                if( a.xlr ) {
                    val += 'xlr ';
                }

                return val.trim();
            };

            this.selectOption = function(e) {
                var c = this.component;

                if( this.status === 'unavailable' ) {
                    return false;
                }

                if( !this.isSelected() ) {
                    this.detailsWrap.wrap.addClass('selected')
                        .next().addClass('selected')
                        .parent().addClass('complete');

                    if( CURRENT_CABLE[c] ) {
                        CURRENT_CABLE[c].html.classList.remove('selected');
                    }

                    this.html.classList.add('selected');

                    CURRENT_CABLE[c] = this;

                    DISPLAY_IMAGES[c].src = this.getDisplayImageUrl();

                    if( this.hasBoot ) {
                        DISPLAY_IMAGES[c + 'Boot'].src = this.getDisplayBootImageUrl();
                    }

                    if( MQ_SMALL.matches ) {
                        var wrap = this.detailsWrap.wrap;

                        if( wrap.hasClass('active') ) {
                            wrap.removeClass('active');
                            _id('body').setAttribute('data-current-step', 'closed');
                        }
                    }

                    updateStatus(c, 'complete');

                } else {
                    this.detailsWrap.wrap.removeClass('selected')
                        .next().removeClass('selected')
                        .parent().removeClass('complete');

                    this.html.classList.remove('selected');

                    CURRENT_CABLE[c] = null;

                    if( c === 'cable' ) {
                        DISPLAY_IMAGES[c].src = BLANK_IMAGE[CURRENT_CABLE.type];
                    } else {
                        DISPLAY_IMAGES[c].src = BLANK_IMAGE[c];
                    }

                    if( this.hasBoot ) {
                        DISPLAY_IMAGES[c + 'Boot'].src = BLANK_IMAGE.boot;
                    }

                    updateStatus(c, 'incomplete');
                }

                updateOverview(c, this);
                updateCost();
            };
        },

        Cable = function(data, el) {
            Option.apply(this, arguments);

            this.part         = 'cable';
            this.component    = 'cable';
            this.specs        = data.specs;
            this.stock        = data.stock;
            this.lengths      = data.lengths;
            this.colors       = data.colors;
            this.currentColor = data.currentColor;
            this.hasChoices   = data.has_colors;
            this.choicesHtml  = [];
            this.specsHtml    = [];

            this.getFullName = function() {
                var str = this.getName();

                if( this.hasChoices ) {
                    str += ' | ' + this.currentColor;
                }

                return str;
            };

            this.getSpecs = function() {
                if( !this.specsHtml.length ) {
                    var p, s = [], str;

                    for( p in this.specs ) { if( this.specs.hasOwnProperty(p) ) {
                        str = [
                            '<span class="',
                            p,
                            '">',
                            p,
                            ': <strong>',
                            this.specs[p],
                            '</strong></span>'
                        ].join('');

                        s.push(str);
                    }}

                    this.specsHtml = s.join('');
                }

                return this.specsHtml;
            };

            this.getChoices = function() {
                if( this.colors.option_category_id && !this.choicesHtml.length ) {
                    var p, colors = this.colors, arr = [];

                    for( p in colors ) { if( colors.hasOwnProperty(p) ) {
                        if( p === 'option_category_id' ) { continue; }

                        var div = document.createElement('div');

                        div.option = this;

                        $(div)
                            .attr({
                                'data-value': p,
                                'data-choice-status': colors[p].status,
                                'data-qty': colors[p].qty
                            })
                            .css('background-color', colors[p].color);

                        arr.push(div);
                    }}

                    var extras = getBlankBlocks(arr.length);
                    arr = arr.concat(extras);

                    this.choicesHtml = arr;
                }

                return this.choicesHtml;
            };

            this.getBuilderImageUrl = function(color) {
                color = color || this.currentColor;

                return [
                    IMAGES_DIR, 'builder/cable/',
                    formatTextForImageUrl(this.manufacturer), '/',
                    formatTextForImageUrl(this.model),
                    color && '.' + color || '',
                    '.jpg'
                ].join('');
            };

            this.getDisplayImageUrl = function(color) {
                color = color || this.currentColor;

                return [
                    IMAGES_DIR, 'display/cable/',
                    CURRENT_CABLE.type, '/',
                    formatTextForImageUrl(this.manufacturer), '/',
                    formatTextForImageUrl(this.model),
                    color && '.' + color || '',
                    '.png'
                ].join('');
            };

            this.setChoice = function(e) {
                var color = e.target.getAttribute('data-value'),
                    status = e.target.getAttribute('data-choice-status') === 'available' ? true : false,
                    url;

                if( this.hasChoices && color !== this.currentColor ) {
                    this.currentColor = color;

                    url = this.getBuilderImageUrl();

                    $('#'+ this.code).find('.component').attr('src', url);

                    this.detailsWrap.img_component.attr('src', url);

                    if( CURRENT_CABLE.cable &&
                        CURRENT_CABLE.cable.code === this.code ) {
                        DISPLAY_IMAGES.cable.src = this.getDisplayImageUrl();
                    }
                }

                updateOverview(this.component, this);
            };

            this.showDetails = function() {
                var _ = this.detailsWrap,
                    choices = this.getChoices(),
                    option  = _.wrap.get(0).option;

                if( !choices.length ) {
                    _.choice.addClass('empty');
                } else {
                    _.choice.removeClass('empty');
                }

                if( this.html.classList.contains('clicked') ) {
                    // this.selectOption();
                }

                if( option ) {
                    option.html.classList.remove('clicked');
                }

                this.html.classList.add('clicked');

                _.wrap.addClass('active');
                _.wrap.get(0).option = this;

                if( this.isSelected() ) {
                    _.wrap.addClass('selected');
                } else {
                    _.wrap.removeClass('selected');
                }

                if( this.status === 'unavailable' ) {
                    _.wrap.addClass('unavailable');
                } else {
                    _.wrap.removeClass('unavailable');
                }

                _.img_component.attr({
                    src: this.getBuilderImageUrl(),
                    alt: this.getName()
                });

                _.manufacturer.text(this.nameObj.manufacturer);
                _.model.text(this.nameObj.model);
                _.price.html(this.getPrice());
                _.choice.html(this.getChoices());
                _.specs.html(this.getSpecs());
            };

            this.onHoverOption = function(e) {

                DISPLAY_IMAGES.cable.src = this.getDisplayImageUrl();
            };

            this.offHoverOption = function(e) {
                var url = CURRENT_CABLE[this.component] && CURRENT_CABLE[this.component].getDisplayImageUrl() || BLANK_IMAGE[CURRENT_CABLE.type];

                DISPLAY_IMAGES.cable.src = url;
            };
        },

        Plug = function(data, el) {
            Option.apply(this, arguments);

            this.part         = 'plug';
            this.component    = data.component;
            this.series       = data.series;
            this.angle        = data.angle;
            this.hasColor     = data.has_colors;
            this.hasBoot      = data.has_boots;
            this.hasChoices   = data.has_colors || data.has_boots;
            this.colors       = data.colors;
            this.currentColor = data.currentColor;
            this.currentBoot  = data.currentBoot;
            this.choicesHtml  = [];

            this.getFullName = function() {
                var str = this.getName();

                if( this.hasChoices ) {
                    if( this.hasColor ) {
                        str += ' | ' + this.currentColor;
                    }

                    if( this.hasBoot ) {
                        str += ' | ' + this.currentBoot;
                    }
                }

                return str;
            };

            this.getBuilderImageUrl = function(color) {
                color = color || this.currentColor;

                return [
                    IMAGES_DIR, 'builder/plug/',
                    formatTextForImageUrl(this.manufacturer), '/',
                    formatTextForImageUrl(this.model),
                    color && '.' + color || '',
                    '.jpg'
                ].join('');
            };

            this.getBuilderBootImageUrl = function(color) {
                color = color || this.currentBoot;

                var model = this.model.split('-')[0];

                return [
                    IMAGES_DIR, 'builder/plug/',
                    formatTextForImageUrl(this.manufacturer), '/',
                    formatTextForImageUrl(model), '/',
                    formatTextForImageUrl(color), '.png'
                ].join('');
            };

            this.getDisplayImageUrl = function(color) {
                color = color || this.currentColor;

                if( this.hasBoot ) {
                    color = '';
                }

                return [
                    IMAGES_DIR, 'display/plug/',
                    formatTextForImageUrl(this.manufacturer), '/',
                    formatTextForImageUrl(this.model),
                    color && '.' + color || '',
                    '.png'
                ].join('');
            };

            this.getDisplayBootImageUrl = function(color) {
                color = color || this.currentBoot;

                if( !color ) {
                    return BLANK_IMAGE_URL;
                }

                var model = this.model.split('-')[0];

                return [
                    IMAGES_DIR, 'display/plug/',
                    formatTextForImageUrl(this.manufacturer), '/',
                    formatTextForImageUrl(model), '/',
                    formatTextForImageUrl(color), '.png'
                ].join('');
            };

            this.getChoices = function() {
                var p, colors, arr = [], div, extras = [];

                if( !this.choicesHtml.length ) {
                    if( this.hasBoot ) {
                        colors = BOOTS[this.manufacturer][this.series];

                        for( p in colors ) { if( colors.hasOwnProperty(p) ) {
                            div = document.createElement('div');

                            div.option = this;

                            $(div)
                                .attr({
                                    'data-value': p,
                                    'data-choice-status': colors[p].status
                                })
                                .css('background-color', colors[p]);

                            arr.push(div);
                        }}

                        extras = getBlankBlocks(arr.length);
                        arr = arr.concat(extras);

                        this.choicesHtml = arr;

                    } else if( this.hasColor ) {
                        colors = this.colors;

                        for( p in colors ) { if( colors.hasOwnProperty(p) ) {
                            div = document.createElement('div');

                            div.option = this;

                            $(div)
                                .attr({
                                    'data-value': p,
                                    'data-choice-status': colors[p].status
                                })
                                .css('background-color', colors[p].color);

                            arr.push(div);
                        }}

                        extras = getBlankBlocks(arr.length);
                        arr = arr.concat(extras);

                        this.choicesHtml = arr;
                    }
                }

                return this.choicesHtml;
            };

            this.setChoice = function(e) {
                var color = e.target.getAttribute('data-value'),
                    status = true,
                    url = BLANK_IMAGE_URL;

                if( e.target.getAttribute('data-choice-status') === 'unavailable' ) {
                    status = false;
                }

                if( this.hasBoot && color !== this.currentBoot ) {
                    this.currentBoot = color;

                    url = this.getBuilderBootImageUrl();
                    this.detailsWrap.img_choice.attr('src', url);

                    if( CURRENT_CABLE[this.component] &&
                        CURRENT_CABLE[this.component].code === this.code ) {
                        DISPLAY_IMAGES[this.component + 'Boot'].src = this.getDisplayBootImageUrl();
                    }
                }

                if( this.hasColor && color !== this.currentColor ) {
                    this.currentColor = color;
                    url = this.getBuilderImageUrl();
                    $(document.getElementById(this.code)).find('.component').attr('src', url);
                    this.detailsWrap.img_component.attr('src', url);

                    if( CURRENT_CABLE[this.component] &&
                        CURRENT_CABLE[this.component].code === this.code ) {
                        DISPLAY_IMAGES[this.component].src = this.getDisplayImageUrl();
                    }
                }

                updateOverview(this.component, this);
            };

            this.showDetails = function() {
                var _ = this.detailsWrap,
                    choices = this.getChoices(),
                    option  = _.wrap.get(0).option;

                if( !choices.length ) {
                    _.choice.addClass('empty');
                } else {
                    _.choice.removeClass('empty');
                }

                if( this.html.classList.contains('clicked') ) {
                    // this.selectOption();
                }

                if( option ) {
                    option.html.classList.remove('clicked');
                }

                this.html.classList.add('clicked');

                _.wrap.addClass('active');
                _.wrap.get(0).option = this;

                if( this.isSelected() ) {
                    _.wrap.addClass('selected');
                } else {
                    _.wrap.removeClass('selected');
                }

                if( this.status === 'unavailable' ) {
                    _.wrap.addClass('unavailable');
                } else {
                    _.wrap.removeClass('unavailable');
                }

                _.img_component.attr({
                    src: this.getBuilderImageUrl(),
                    alt: this.getName()
                });

                if( this.hasBoot ) {
                    _.img_choice.attr({
                        src: this.getBuilderBootImageUrl()
                    });
                } else {
                    _.img_choice.attr({
                        src: BLANK_IMAGE_URL
                    });
                }

                _.manufacturer.text(this.nameObj.manufacturer);
                _.model.text(this.nameObj.model);
                _.price.html(this.getPrice());
                _.choice.html(this.getChoices());
            };

            this.onHoverOption = function(e) {
                DISPLAY_IMAGES[this.component].src = this.getDisplayImageUrl();

                if( this.hasBoot ) {
                    DISPLAY_IMAGES[this.component + 'Boot'].src = this.getDisplayBootImageUrl();
                } else {
                    DISPLAY_IMAGES[this.component + 'Boot'].src = BLANK_IMAGE_URL;
                }
            };

            this.offHoverOption = function(e) {
                var CC = CURRENT_CABLE[this.component];

                var url = CC && CC.getDisplayImageUrl() || BLANK_IMAGE[this.component],
                    boot = CC && CC.getDisplayBootImageUrl() || BLANK_IMAGE_URL;

                DISPLAY_IMAGES[this.component].src = url;
                DISPLAY_IMAGES[this.component + 'Boot'].src = boot;
            };
        };

    // generate #num blank blocks
    // fix flex spacing
    var getBlankBlocks = function(num, c) {
        var arr = [], i, e, text;

        text = 'blank' + (c ? ' ' + c : '');

        for( i = 0; i < num; i++ ) {
            e = _ce('div');
            e.className = text;
            arr.push(e)
        }

        return arr;
    };

    // generate standard option block
    var getOptionBlock = function(option) {
        var $block = $('<div/>', {id: option.code, class: 'option'}),
            block  = $block.get(0);

        option.html = block;
        block.option = option;

        var order = option.order || 270,
            status = option.status || 'unavailable';

        block.setAttribute('data-component', option.component);
        block.setAttribute('data-status', status);
        block.setAttribute('data-stock', option.stock);

        $block.addClass(option.getAllowanceString());

        if( status === 'unavailable' ) {
            order += 300;
        }
        $block.css('order', order);

        var hasChoices = option.hasChoices ? $('<div/>', {class: 'hasChoices'}).append($('<span/>', {text: '*'})) : null;

        var outer = $('<div/>', {class: 'outer'}).append(
            $('<button/>', {text: 'Specs & Info', class: 'option-specs'}),
            $('<button/>', {text: 'Select', class: 'option-select'})
        );

        var inner = $('<div/>', {class: 'inner'});

        var images = $('<div/>', {class: 'image-wrap'}).append(
            $('<img/>', {class: 'component', src: option.getBuilderImageUrl()}),
            $('<img/>', {class: 'choice'})
        );

        var details = $('<div/>', {class: 'details'}).append(
            $('<p/>', {class: 'name'}).append(
                $('<span/>', {text: option.nameObj.manufacturer}),
                $('<strong/>', {text: option.nameObj.model})
            ),
            $('<span/>', {class: 'price', text: option.price})
        );

        inner.append(images, details);
        $block.append(hasChoices, outer, inner);

        return block;
    };

    var updateStatus = (function() {
        var t = _id('tracker');

        var tracker = {
            length: t.querySelector('div[data-pointer-component="length"]'),
            cable: t.querySelector('div[data-pointer-component="cable"]'),
            input: t.querySelector('div[data-pointer-component="input"]'),
            output: t.querySelector('div[data-pointer-component="output"]'),
            extra: t.querySelector('div[data-pointer-component="extra"]')
        };

        return function(c, s) {
            var el = tracker[c];

            if( el ) {
                el.setAttribute('data-status', s);
            }
        };
    })();

    var updateOverview = function(component, data) {
        var text;

        switch(component) {
            case 'cable':
            case 'input':
            case 'output':
                // data is an option
                text = data.getFullName();

                OVERVIEW_ELEMENTS[component].textContent = text;
                break;

            case 'length':
                text = [
                    CURRENT_CABLE.type,
                    ' ',
                    CURRENT_CABLE.length.amount,
                    CURRENT_CABLE.length.unit
                ].join('');

                OVERVIEW_ELEMENTS.length.textContent = text;
                break;

            case 'extras':
                console.log(CURRENT_CABLE);
                break;

            default:
                break;
        }
    };

    var updateCost = function() {
        var el = _id('price').querySelector('span');

        el.textContent = '$' + CURRENT_CABLE.getPrice().formatMoney();
    };

    var updateConfirmation = function() {
        var ul = _id('final-build');

        var cable = _ce('li');
            // cable.textContent = CURRENT_CABLE.cable.

        $('#final-price').text(CURRENT_CABLE.getPrice().formatMoney());
    };

    var resetBuilder = function() {
        $('#loader').fadeIn(50);

        DISPLAY_IMAGES.cable.src  = BLANK_IMAGE[DEFAULT_CABLE_TYPE];
        DISPLAY_IMAGES.input.src  = BLANK_IMAGE.input;
        DISPLAY_IMAGES.output.src = BLANK_IMAGE.output;
        DISPLAY_IMAGES.inputBoot.src  = BLANK_IMAGE.boot;
        DISPLAY_IMAGES.outputBoot.src = BLANK_IMAGE.boot;

        OVERVIEW_ELEMENTS.length.textContent = '';
        OVERVIEW_ELEMENTS.cable.textContent = '';
        OVERVIEW_ELEMENTS.input.textContent = '';
        OVERVIEW_ELEMENTS.output.textContent = '';
        OVERVIEW_ELEMENTS.extras.textContent = '';

        $('#body').attr({
            'data-cable-type': DEFAULT_CABLE_TYPE,
            'data-current-step': MQ_SMALL.matches ? 'closed' : 'length'
        });

        $('.ruler').each(function() {
            $(this).slider('value', this.getAttribute('data-init'));
        });
        $('.input').each(function() {
            $(this).find('input').val(this.getAttribute('data-init'));
        });

        $('span', '#price').text('$0.00');
        $('.dot').attr('data-status', 'incomplete');

        $('.option.clicked, .option.selected').removeClass('clicked selected');
        $('.details-wrap.active').removeClass('active');

        $('.extra-wrap input:checked').prop('checked', false);

        CURRENT_CABLE = new Setup();
        window.CC = CURRENT_CABLE;

        $('#loader').fadeOut();
    };

    var scrollToSection = function(section, speed) {
        speed = speed || 0;
        $('#content').animate({
            scrollTop: $('#' + section ).position().top + $('#content').scrollTop()
        }, speed || 0);

        $('#content').attr('data-active-section', section);
    },

    displayImages = {
        container: $('#display'),
        images: $('.images', '#display'),
        multiplier: 1,
        height: 0,
        width: 0,
        headerHeight: $('#header').height(),

        initialize: function() {
            var type = _id('body').getAttribute('data-cable-type');

            this.update();
            this.draw[type].call(this);
        },

        update: function() {
            var w, h;

            w = this.container.width();
            h = this.container.height();

            this.width = w;
            this.height = h;
            this.multiplier = h > w ?
                w / DEFAULT_CABLE_WIDTH :
                h / DEFAULT_CABLE_HEIGHT;
        },

        draw: {
            patch: function() {
                var scale = 0.5;

                var c  = this.container,
                    i  = this.images,
                    r  = DEFAULT_PATCH_CABLE_HEIGHT / DEFAULT_PATCH_CABLE_WIDTH,
                    hh = this.headerHeight,
                    w  = this.width * scale,
                    h  = w * r;

                var m = w / DEFAULT_PATCH_CABLE_WIDTH;

                var _setOuterCss = function() {
                    i.css({
                        width: w,
                        height: w * r,
                        left: (c.width() - w) / 2,
                        top: (c.height() - h) / 3
                    });
                };

                // assume input on the left
                var _posInput = function() {
                    var container = i.find('div.input');

                    container.css({
                        height: DEFAULT_PLUG_HEIGHT * m,
                        width: DEFAULT_PLUG_WIDTH * m,
                        bottom: -m * DEFAULT_PLUG_HEIGHT + 43 * m,
                        left: -m * 100
                    });
                };

                // assume output on the right
                var _posOutput = function() {
                    var container = i.find('div.output');

                    container.css({
                        height: DEFAULT_PLUG_HEIGHT * m,
                        width: DEFAULT_PLUG_WIDTH * m,
                        bottom: -m * DEFAULT_PLUG_HEIGHT + 45 * m,
                        right: -m * 100
                    });
                };

                _setOuterCss();
                _posInput();
                _posOutput();
            },

            instrument: function() {
                var scale = 0.6;

                var c  = this.container,
                    i  = this.images,
                    m  = this.multiplier * scale,
                    h  = this.height * scale,
                    w  = this.width * scale;

                var _setOuterCss = function(l) {
                    i.css({
                        width: l,
                        height: l,
                        left: (c.width() - l) / 2,
                        top: (c.height() - l) / 3
                    });
                };

                // assume input on the left
                var _posInput = function() {
                    var container = i.find('div.input');

                    container.css({
                        bottom: -m * ( DEFAULT_PLUG_HEIGHT - 176 ),
                        left: -21 * m,
                        height: DEFAULT_PLUG_HEIGHT * m,
                        width: DEFAULT_PLUG_WIDTH * m
                    });
                };

                // assume output on the right
                var _posOutput = function() {
                    var container = i.find('div.output');

                    container.css({
                        bottom: -m * ( DEFAULT_PLUG_HEIGHT - 176 ),
                        right: -21 * m,
                        height: DEFAULT_PLUG_HEIGHT * m,
                        width: DEFAULT_PLUG_WIDTH * m
                    });
                };

                if( w < h ) {
                    _setOuterCss(w);
                } else {
                    _setOuterCss(h);
                }

                _posInput();
                _posOutput();
            },

            speaker: function() {
                this.draw.instrument.call(this);
            }
        }
    },

    formatTextForImageUrl = function(str) {

        return str.replace(/ /g,'-').toLowerCase();
    },

    handles = function() {
        (function onWindowSizeChange() {
            var $w = $(window), $b = $('body'), c = _id('content'),
                width, height, section;

            $w.on('resize orientationchange', function() {
                width = $w.width();
                height = $w.height();
                section = c.getAttribute('data-active-section');

                $b.attr('data-orientation', width > height ? 'horizontal' : 'vertical');

                displayImages.initialize();

                scrollToSection(section);
            });
        })();

        (function horizontalArrowKeys() {
            var body = _id('body'), current, temp;

            $('body').on('keydown', function(e) {
                current = body.getAttribute('data-current-step');

                if( e.keyCode == 37 ) { // left
                    temp = $('article[data-component="' + current + '"]').prev();

                    if( temp.length ) body.setAttribute('data-current-step', temp.attr('data-component'));

                } else if( e.keyCode == 39 ) { // right
                    temp = $('article[data-component="' + current + '"]').next();

                    if( temp.length ) body.setAttribute('data-current-step', temp.attr('data-component'));
                }
            });
        })();

        (function tracker() {
            var body = _id('body'), step;

            $('.dot', '#tracker').on('click', function(e) {
                step = e.currentTarget.getAttribute('data-pointer-component');

                $('.details-wrap.active').removeClass('active');

                if( body.getAttribute('data-current-step') !== step ) {
                    body.setAttribute('data-current-step', step);
                }
            });
        })();

        (function intro() {
            $('#introduction').on('click', 'button', function(e) {
                var parent = e.delegateTarget;

                parent.parentNode.setAttribute('data-active-section', 'production');
            });
        })();
    },

    build = {
        structure: null,

        initialize: function( data ) {
            this.builders();
            this.handles();
        },

        builders: function() {
            var structure = $('#builders');

            structure.addClass('selected');
            this.structure = structure;

            $('#builders').append(structure);

            build.length();
            build.cables();
            build.plugs();
            build.other();
        },

        length: function() {
            var rulers = this.structure.find('.ruler');
            rulers.each(function() {
                var type = this.getAttribute('data-type'),
                    $this = $(this);

                $this.slider({
                    value: +this.getAttribute('data-init'),
                    min: +this.getAttribute('data-min'),
                    max: +this.getAttribute('data-max'),
                    range: 'max'
                });

                this.input = $('.input[data-type="' + type + '"] input').get(0);
                this.input.ruler = $this;
            });

            var selects = this.structure.find('article.length .select');
            selects.each(function() {
                var init = +this.getAttribute('data-init');

                var select = $('<select/>'),
                    min = +this.getAttribute('data-min'),
                    max = +this.getAttribute('data-max'),
                    html = '';

                for( var i = min; i <= max; i++ ) {
                    var selected = init === i ? ' selected="selected"' : '';

                    html += '<option value="' + i + '"' + selected + '>' + i + '</option>';
                }

                select.html(html).prependTo(this);
            });
        },

        cables: function() {
            var container = $('article[data-component="cable"] .options-wrap', '#builders');

            var _hasDefaultColor = function(obj) {
                for( var p in obj ) { if( obj.hasOwnProperty(p) ) {
                    if( obj[p].default ) {
                        return p;
                    }
                }}

                return null;
            };

            var opt = {};

            for( var c in J_CABLES ) { if( J_CABLES.hasOwnProperty(c) ) {
                var data = J_CABLES[c];

                data.code = c;
                data.component = 'cable';
                data.currentColor = _hasDefaultColor(data.colors);

                var cable = new Cable(data);
                var block = getOptionBlock(cable);

                if( !opt[data.category] ) {
                    opt[data.category] = [];
                }

                opt[data.category].push(block);
            }}

            for( var p in opt ) { if( opt.hasOwnProperty(p) ) {
                var blanks = getBlankBlocks(opt[p].length, 'option');
                var data = opt[p].concat(blanks);

                var div = $('<div/>', {class: 'options ' + p});

                var h = $('<h3/>', {text: p});

                div.html(data).prepend(h);

                container.append(div);
            }}
        },

        plugs: function() {
            var sides = ['input', 'output'];

            var _hasDefaultColor = function(obj) {
                for( var p in obj ) { if( obj.hasOwnProperty(p) ) {
                    if( obj[p].default ) {
                        return p;
                    }
                }}

                return '';
            };

            for( var m in J_BOOTS ) { if( J_BOOTS.hasOwnProperty(m) ) {
                var manu = J_BOOTS[m];

                if( !BOOTS[m] ) { BOOTS[m] = {}; }

                for( var s in manu ) { if( manu.hasOwnProperty(s) ) {
                    var series = manu[s];

                    if( !BOOTS[m][s] ) { BOOTS[m][s] = {}; }

                    for( var c in series.boot ) { if( series.boot.hasOwnProperty(c) ) {
                        BOOTS[m][s][c] = series.boot[c].color;
                    }}
                }}
            }}

            for( var i = 0; i < sides.length; i++ ) {
                var container = $('article[data-component="' + sides[i] + '"] .options-wrap', '#builders');

                var opt = {}, p;

                for( p in J_PLUGS ) { if( J_PLUGS.hasOwnProperty(p) ) {
                    var data = J_PLUGS[p];

                    data.code = sides[i].toUpperCase() + '_' + p;
                    data.component = sides[i];

                    if( data.has_colors ) {
                        data.currentColor = _hasDefaultColor(data.colors);
                    } else if( data.has_boots ) {
                        data.currentBoot = _hasDefaultColor(J_BOOTS[data.manufacturer][data.series]['boot']);
                    }

                    var plug = new Plug(data);
                    var block = getOptionBlock(plug);

                    if( !opt[data.category] ) {
                        opt[data.category] = [];
                    }

                    opt[data.category].push(block);
                }}

                for( p in opt ) { if( opt.hasOwnProperty(p) ) {
                    var blanks = getBlankBlocks(opt[p].length, 'option');
                    var data = opt[p].concat(blanks);

                    var div = $('<div/>', {class: 'options ' + p});

                    var h = $('<h3/>', {text: p});

                    div.html(data).prepend(h);

                    container.append(div);
                }}
            }
        },

        other: function() {
            // double length of techflex items to fix flexbox alignment
            var length = $('.techflex').length;


            var arr = getBlankBlocks(length, 'techflex');

            $('#techflex').append(arr);
        },

        handles: function() {
            var _ = this.structure;

            _.find('.footer').on('click', 'button', function(e) {
                var b = _id('body'),
                    attr = 'data-current-step',
                    current = b.getAttribute(attr),
                    article = $('article[data-component="' + current + '"]'),
                    next;

                if( e.currentTarget.className === 'builder-prev') {
                    next = article.prev();

                } else if( e.currentTarget.className === 'builder-next' ) {
                    next = article.next();
                }

                if( next.length ) {
                    b.setAttribute(attr, next.attr('data-component'));
                }
            });

            _.find('.details-wrap .back').on('click', function(e) {
                var parent = $(e.currentTarget).parents('.details-wrap');

                parent.get(0).option.html.classList.remove('clicked');

                if( parent.hasClass('active') ) {
                    parent.removeClass('active');
                }
            });

            _.find('.home').on('click', function(e) {
                if( e.currentTarget.parentNode.nodeName === 'div' ) {
                    var parent = $(e.currentTarget).parent();

                    parent.get(0).option.html.classList.remove('clicked');

                    if( parent.hasClass('active') ) {
                        parent.removeClass('active');
                    }
                }

                _id('body').setAttribute('data-current-step', 'closed');
            });

            _.find('.option').not('.blank').on('click', '.option-specs', function(e) {
                e.delegateTarget.option.showDetails();
            });

            _.find('.option').not('.blank').on('click', '.option-select', function(e) {
                e.delegateTarget.option.selectOption();
            });

            _.find('.option').not('.blank').on('mouseenter', function(e) {
                this.option.onHoverOption.call(this.option, e);
            });

            _.find('.option').not('.blank').on('mouseleave', function(e) {
                this.option.offHoverOption.call(this.option, e);
            });

            _.find('.select-option').on('click', function() {
                this.parentNode.parentNode.option.selectOption();
            });

            _.find('.choice-wrap').on('click', 'div', function(e) {
                this.option.setChoice.call(this.option, e);
            });

            (function _lengthHandles() {
                var _updateLength = function(val) {
                    if( val ) {
                        CURRENT_CABLE.length.amount = val;

                        $('#body').attr('data-length', val);
                    }

                    updateCost();
                    updateOverview('length');
                    updateStatus('length', 'complete');
                    _updateCableStatus(val);
                };

                _.find('.length-wrap .length-choice').on('click', 'img', function(e) {
                    var type = e.delegateTarget.getAttribute('data-type'),
                        val = $('.input[data-type="' + type + '"] input').val();

                    var C = CURRENT_CABLE;

                    // if current type is not the clicked type
                    if( C.type !== type ) {
                        _id('body').setAttribute('data-cable-type', type);

                        C.type = type;
                        C.length.amount = +val;
                        C.length.unit = e.delegateTarget.getAttribute('data-unit');

                        // if no cable is selected
                        // show empty cable image
                        if( !C.cable ) {
                            DISPLAY_IMAGES.cable.src = BLANK_IMAGE[type];

                        } else {
                            // if selected cable is not allowed as type
                            // unselect cable and show empty cable image
                            if( !C.cable.allowance[type] ) {
                                C.cable.selectOption();

                            // else show correct type cable image
                            } else {
                                DISPLAY_IMAGES.cable.src = C.cable.getDisplayImageUrl();
                            }
                        }

                        if( C.input && !C.input.allowance[type] ) {
                            C.input.selectOption();
                        }

                        if( C.output && C.output.allowance[type] ) {
                            C.output.selectOption();
                        }

                        displayImages.initialize();
                    }

                    _updateLength(val);
                });

                _.find('.length-wrap .ruler').on('slide', function(e, ui) {
                    var val = ui.value;
                    // update CC
                    CURRENT_CABLE.length.amount = val;

                    // update input
                    this.input.value = val;

                    _updateLength(val);
                });

                _.find('.length-wrap .input').on('keyup', 'input', function(e) {
                    var el = e.currentTarget,
                        val = el.value.split('.')[0].replace(/\D/g, '');

                    el.value = val;
                    el.ruler.slider('value', val);

                    _updateLength(val);
                });

                _.find('.length-wrap .input').on('blur', 'input', function(e) {
                    var el = e.currentTarget,
                        de = e.delegateTarget,
                        val = Number(el.value),
                        min = +de.getAttribute('data-min'),
                        max = +de.getAttribute('data-max');

                    if( !val || val < min ) {
                        val = min;
                    }

                    if( val > max ) {
                        val = max;
                    }

                    el.value = val;
                    el.ruler.slider('value', val);

                    _updateLength(val);
                });

                _.find('#length-confirm').on('click', function() {
                    $('#body').attr('data-current-step', 'cable');
                    _updateLength();
                });
            })();

            _.find('.extra-wrap input[type="checkbox"]').on('change', function() {
                var opt = this.name;

                CURRENT_CABLE[opt] = this.checked;
                updateOverview('extras');
                updateStatus('extras', 'complete');
                updateCost();
            });

            _.find('.extra-wrap .techflex').on('click', 'label', function(e) {
                e.preventDefault();

                var label = e.currentTarget,
                    id    = label.htmlFor,
                    input = _id(id),
                    checked = input.checked,
                    value = !checked ? input.value : false;

                input.checked = !checked;
                CURRENT_CABLE.techflex = value;
                updateOverview('extras');
                updateStatus('extras', 'complete');
                updateCost();
            });

            $(DISPLAY_IMAGES.cable).on('click', function() {
                $('#body').attr('data-current-step', 'cable');

                if( CURRENT_CABLE.cable ) {
                    CURRENT_CABLE.cable.showDetails();
                }
            });

            $(DISPLAY_IMAGES.input).on('click', function() {
                $('#body').attr('data-current-step', 'input');

                if( CURRENT_CABLE.input ) {
                    CURRENT_CABLE.input.showDetails();
                }
            });

            $(DISPLAY_IMAGES.output).on('click', function() {
                $('#body').attr('data-current-step', 'output');

                if( CURRENT_CABLE.output ) {
                    CURRENT_CABLE.output.showDetails();
                }
            });
        }
    },

    initialSetup = function() {
        resetBuilder();

        var section = $('body').attr('data-display-introduction') ? 'introduction' : 'production';
        $('#content').attr('data-active-section', section);
        $('#content').attr('data-active-section', 'introduction');

        displayImages.initialize();
        handles();

        setTimeout(function() {
            $('#loader').fadeOut('fast');
        }, Math.floor(Math.random() * (500 - 100 + 1)) + 100);
    };

    /**
     * Starting function of the cable builder
     * AJAX calls the XML file that defines the different options in the builder
     * Stores the data of each component into its respective global variable
     * Calls init() to begin building each component
     */
    $(document).ready(function() {
        if( isMobile.any() &&
            typeof $zopim === 'function' &&
            typeof $zopim.livechat === 'object' ) {
            $zopim.livechat.hideAll();
        }

        FastClick.attach(document.body);

        $.getJSON( JSON_URL )
            .done(function(response) {
                OPTIONS_JSON   = response;
                J_CABLES       = OPTIONS_JSON.cables;
                J_PLUGS        = OPTIONS_JSON.plugs;
                J_BOOTS        = OPTIONS_JSON.boots;
                J_OTHER        = OPTIONS_JSON.other;
                J_RESTRICTIONS = OPTIONS_JSON.restrictions;

                build.initialize(OPTIONS_JSON);

                initialSetup();
            })
            .fail(function( jqXHR, textStatus, errorThrown ) {
                alert("ERROR CS01: Initialization JSON file not found.");
                console.error(jqXHR);
                console.error(textStatus);
                console.error(errorThrown);
            });
    });

})(jQuery);
