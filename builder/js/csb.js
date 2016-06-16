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
        };

    var Setup = function() {
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
        };

    Option.prototype = {
        isSelected: function() {
            return CURRENT_CABLE[this.component] &&
                   CURRENT_CABLE[this.component].code === this.code;
        },

        getName: function() {

            return this.nameObj.manufacturer + ' ' + this.nameObj.model;
        },

        getFullName: function() {
            var str = this.getName();

            var choice = this.hasChoices && (this.currentColor || this.currentBoot) || '';

            if( choice ) {
                str += ' | ' + choice;
            }

            return str;
        },

        getPrice: function() {
            // need to format
            return this.price;
        },

        getAllowanceString: function() {
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
        },

        getBuilderImageUrl: function(color) {
            color = color || this.currentColor;

            return [
                IMAGES_DIR,
                'builder/',
                this.part, '/',
                formatTextForImageUrl(this.manufacturer), '/',
                formatTextForImageUrl(this.model),
                color && '.' + color || '',
                '.jpg'
            ].join('');
        },

        getDisplayImageUrl: function(color) {
            var part = this.part;

            color = color || this.currentColor;

            var url = [
                IMAGES_DIR,
                'display/',
                part, '/'
            ];

            if( part === 'cable' ) {
                url.push(CURRENT_CABLE.type, '/');
            }

            url.push(
                formatTextForImageUrl(this.manufacturer), '/',
                formatTextForImageUrl(this.model),
                (color && !this.hasBoots) && '.' + color || '',
                '.png'
            );

            return url.join('');
        },

        getChoices: function() {
            var p, div, colors, arr = [], extras = [];

            if( !this.hasChoices ) {
                return [];
            }

            if( !this.choicesHtml.length ) {
                if( this.hasColors ) {
                    colors = this.colors;
                } else if( this.hasBoots ) {
                    colors = J_BOOTS[this.manufacturer][this.series].boot;
                }

                for( p in colors ) { if( colors.hasOwnProperty(p) ) {
                    if( p === 'option_category_id' ) { continue; }

                    div = document.createElement('div');

                    div.option = this;

                    $(div).attr({
                        'data-value': p,
                        'data-choice-status': this.hasColors ? colors[p].status : this.status
                    }).css({
                        'background-color': colors[p].color
                    });

                    arr.push(div);
                }}

                extras = getBlankBlocks(arr.length);
                arr = arr.concat(extras);

                this.choicesHtml = arr;
            }

            return this.choicesHtml;
        },

        showDetails: function() {
            var option    = this,
                choices   = option.getChoices(),
                container = option.detailsWrap;

            if( !choices.length ) {
                container.choice.addClass('empty');
            } else {
                container.choice.removeClass('empty');
            }

            if( option.html.classList.contains('clicked') ) {
                // this.selectOption();
            }

            if( option ) {
                option.html.classList.remove('clicked');
            }

            option.html.classList.add('clicked');

            container.wrap.addClass('active');
            container.wrap.get(0).option = option;

            if( option.isSelected() ) {
                container.wrap.addClass('selected');
            } else {
                container.wrap.removeClass('selected');
            }

            if( option.status === 'unavailable' ) {
                container.wrap.addClass('unavailable');
            } else {
                container.wrap.removeClass('unavailable');
            }

            container.img_component.attr({
                src: option.getBuilderImageUrl(),
                alt: option.getName()
            });

            if( option instanceof Cable ) {
                container.specs.html(option.getSpecs());

            } else if( option instanceof Plug ) {
                if( option.hasBoots ) {
                    container.img_choice.attr({
                        src: option.getBuilderBootImageUrl()
                    });
                } else {
                    container.img_choice.attr({
                        src: BLANK_IMAGE_URL
                    });
                }
            }

            container.manufacturer.text(option.nameObj.manufacturer);
            container.model.text(option.nameObj.model);
            container.price.html(option.getPrice());
            container.choice.html(choices);
        },

        selectOption: function() {
            var c = this.component;

            if( this.status === 'unavailable' || this.stock < CURRENT_CABLE.length.amount ) {
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

                if( this.hasBoots ) {
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
                updateOverview(c, this);
                updateCost();

            } else {
                this.deselectOption.call(this);
            }
        },

        deselectOption: function() {
            var c = this.component;

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

            if( this.hasBoots ) {
                DISPLAY_IMAGES[c + 'Boot'].src = BLANK_IMAGE.boot;
            }

            updateStatus(c, 'incomplete');

            updateOverview(c, this);
            updateCost();
        }
    };

    var Cable = function(data, el) {
        Option.apply(this, arguments);

        this.part         = 'cable';
        this.component    = 'cable';
        this.specs        = data.specs;
        this.stock        = data.stock;
        this.lengths      = data.lengths;
        this.colors       = data.colors;
        this.currentColor = data.currentColor;
        this.hasChoices   = data.has_colors;
        this.hasColors    = data.has_colors;
        this.choicesHtml  = [];
        this.specsHtml    = [];
    };

    Cable.prototype = Object.create(Option.prototype);
    Cable.prototype.constructor = Cable;

    Cable.prototype.getSpecs = function() {
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

    Cable.prototype.setChoice = function(e) {
        var _getStatus = function() {
            var status = true;

            if( target.getAttribute('data-choice-status') !== 'available' ) {
                status = false;
            }

            if( this.colors[color].qty < CURRENT_CABLE.length.amount ) {
                status = false;
            }

            return status;
        };

        var target = e.target;

        var color = target.getAttribute('data-value'),
            status = _getStatus.call(this);

        var url = BLANK_IMAGE_URL;

        if( this.hasColors && color !== this.currentColor ) {
            this.currentColor = color;

            url = this.getBuilderImageUrl();

            this.detailsWrap.img_component.attr('src', url);

            if( status ) {
                $('.component', _id(this.code)).attr('src', url);

                if( CURRENT_CABLE.cable &&
                    CURRENT_CABLE.cable.code === this.code ) {
                    DISPLAY_IMAGES.cable.src = this.getDisplayImageUrl();

                    updateOverview(this.component, this);
                }
            }
        }
    };

    Cable.prototype.onHoverOption = function(e) {

        DISPLAY_IMAGES.cable.src = this.getDisplayImageUrl();
    };

    Cable.prototype.offHoverOption = function(e) {
        var url = CURRENT_CABLE[this.component] && CURRENT_CABLE[this.component].getDisplayImageUrl() || BLANK_IMAGE[CURRENT_CABLE.type];

        DISPLAY_IMAGES.cable.src = url;
    };

    var Plug = function(data, el) {
        Option.apply(this, arguments);

        this.part         = 'plug';
        this.component    = data.component;
        this.series       = data.series;
        this.angle        = data.angle;
        this.hasColors    = data.has_colors || false;
        this.hasBoots     = data.has_boots || false;
        this.hasChoices   = data.has_colors || data.has_boots;
        this.colors       = data.colors;
        this.currentColor = data.currentColor;
        this.currentBoot  = data.currentBoot;
        this.choicesHtml  = [];
    };
    Plug.prototype  = Object.create(Option.prototype);
    Plug.prototype.constructor = Plug;

    Plug.prototype.getBuilderBootImageUrl = function(color) {
        color = color || this.currentBoot;

        var model = this.model.split('-')[0];

        return [
            IMAGES_DIR, 'builder/plug/',
            formatTextForImageUrl(this.manufacturer), '/',
            formatTextForImageUrl(model), '/',
            formatTextForImageUrl(color), '.png'
        ].join('');
    };

    Plug.prototype.getDisplayBootImageUrl = function(color) {
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

    Plug.prototype.setChoice = function(e) {
        var _getStatus = function() {
            var status = true;

            if( target.getAttribute('data-choice-status') !== 'available' ) {
                status = false;
            }

            return status;
        };

        var target = e.target;

        var color = target.getAttribute('data-value'),
            status = _getStatus.call(this);

        var url = BLANK_IMAGE_URL;

        if( this.hasColors && color !== this.currentColor ) {
            this.currentColor = color;

            url = this.getBuilderImageUrl();

            this.detailsWrap.img_component.attr('src', url);

            if( status ) {
                $('.component', _id(this.code)).attr('src', url);

                if( CURRENT_CABLE[this.component] &&
                    CURRENT_CABLE[this.component].code === this.code ) {
                    DISPLAY_IMAGES[this.component].src = this.getDisplayImageUrl();

                    updateOverview(this.component, this);
                }
            }
        }

        if( this.hasBoots && color !== this.currentBoot ) {
            this.currentBoot = color;

            this.detailsWrap.img_choice.attr('src', this.getBuilderBootImageUrl());

            if( status ) {
                if( CURRENT_CABLE[this.component] &&
                    CURRENT_CABLE[this.component].code === this.code ) {
                    DISPLAY_IMAGES[this.component + 'Boot'].src = this.getDisplayBootImageUrl();

                    updateOverview(this.component, this);
                }
            }
        }


    };

    Plug.prototype.onHoverOption = function(e) {
        DISPLAY_IMAGES[this.component].src = this.getDisplayImageUrl();

        if( this.hasBoots ) {
            DISPLAY_IMAGES[this.component + 'Boot'].src = this.getDisplayBootImageUrl();
        } else {
            DISPLAY_IMAGES[this.component + 'Boot'].src = BLANK_IMAGE_URL;
        }
    };

    Plug.prototype.offHoverOption = function(e) {
        var CC = CURRENT_CABLE[this.component];

        var url = CC && CC.getDisplayImageUrl() || BLANK_IMAGE[this.component],
            boot = CC && CC.getDisplayBootImageUrl() || BLANK_IMAGE_URL;

        DISPLAY_IMAGES[this.component].src = url;
        DISPLAY_IMAGES[this.component + 'Boot'].src = boot;
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

        var order  = option.order  || 270,
            status = option.status || 'unavailable';

        block.setAttribute('data-component', option.component);
        block.setAttribute('data-status', status);
        $block.addClass(option.getAllowanceString());

        if( status === 'unavailable' ) {
            order += 600;
        }

        $block.css('order', order);

        if( option.component === 'cable' ) {
            $block.data({
                'order': order,
                'stock': option.stock
            });
        }

        var choicesDiv = null;
        if( option.hasChoices ) {
            var choices = [], obj, c;

            if( option.hasColors ) {
                obj = option.colors;

            } else if( option.hasBoots ) {
                obj = J_BOOTS[option.manufacturer][option.series].boot;

            }

            for( c in obj ) { if( obj.hasOwnProperty(c) ) {
                if( c !== 'option_category_id' ) {
                    choices.push($('<div/>').css('color', obj[c].color).text('*'));
                }
            }}

            choicesDiv = $('<div/>', {class: 'hasChoices'}).html(choices);
        }

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
        $block.append(choicesDiv, outer, inner);

        return block;
    };

    var changeStep = (function() {
        var b = _id('body');

        return function(next, prev) {
            if( prev === 'length' ) {
                updateOverview('length');
                updateStatus('length', 'complete');
            }

            b.setAttribute('data-current-step', next);
        };
    })();

    var updateStatus = (function() {
        var t = _id('tracker');

        var tracker = {
            length:  t.querySelector('div[data-pointer-component="length"]'),
            cable:   t.querySelector('div[data-pointer-component="cable"]'),
            input:   t.querySelector('div[data-pointer-component="input"]'),
            output:  t.querySelector('div[data-pointer-component="output"]'),
            extras:  t.querySelector('div[data-pointer-component="extra"]')
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
                text = data.isSelected() ? data.getFullName() : '';

                OVERVIEW_ELEMENTS[component].textContent = text;
                break;

            case 'length':
                text = [
                    CURRENT_CABLE.length.amount,
                    CURRENT_CABLE.length.unit,
                    ' ',
                    CURRENT_CABLE.type
                ].join('');

                OVERVIEW_ELEMENTS.length.textContent = text;
                break;

            case 'extras':
                OVERVIEW_ELEMENTS.extras.textContent = CURRENT_CABLE.getExtraOptions();
                break;

            default:
                break;
        }
    };

    var updateCost = function() {
        var el = _id('price').querySelector('span');

        el.textContent = '$' + CURRENT_CABLE.getPrice().formatMoney();
    };

    var confirmation = {
        check: function() {
            var cc = CURRENT_CABLE;

            var arr = [];

            if( !cc.cable ) {
                arr.push('cable');
            }

            if( !cc.input ) {
                arr.push('input');
            }

            if( !cc.output ) {
                arr.push('output');
            }

            return arr;
        },

        update: function() {
            var cc = CURRENT_CABLE;

            _id('final-cable').textContent  = cc.length.amount.toString() + cc.length.unit + ' ' + cc.cable.getFullName();
            _id('final-input').textContent  = cc.input.getFullName();
            _id('final-output').textContent = cc.output.getFullName();
            _id('final-extra').textContent  = cc.getExtraOptions();

            $('#final-price').text(CURRENT_CABLE.getPrice().formatMoney());
        },

        go: function() {
            var status = this.check();

            if( !status.length ) {
                this.update();
                this.show();
            } else {
                this.error(status);
            }
        },

        error: function(arr) {
            for( var i = 0; i < arr.length; i++ ) {
                updateStatus(arr[i], 'error');
            }
        },

        show: function() {
            _id('content').setAttribute('data-active-section', 'confirmation');
        },

        price: function() {
            var per = CURRENT_CABLE.getPrice(),
                qty = _id('final-qty').value;

            _id('final-price').textContent = (per * qty).formatMoney();
        },

        checkout: function() {
            var _getOptionName = function(type, cable, opt_cat_id, opt_id) {
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
            };

            var _getCableLengthId = function() {
                var cable  = cc.cable,
                    type   = cc.type,
                    length = cc.length.amount,
                    lengths = cable.lengths[type];

                if( lengths.isConsistent ) {
                    if( length >= lengths.start_num && length <= lengths.end_num ) {
                        return lengths.start_id + (length - lengths.start_num);
                    }
                }
            };

            // add pending to checkout button and disable it

            var cc = CURRENT_CABLE;

            var cable  = cc.cable,
                input  = cc.input,
                output = cc.output;

            var code = cable.code;

            // set default values for unknown variables
            var Post = {
                'ProductCode': code,
                'ReplaceCartID':'',
                'ReturnTo':'',
                'btnaddtocart.x':'5',
                'btnaddtocart.y':'5',
                'e':''
            };

            // set Quantity
            Post['QTY.' + code] = _id('final-qty').value;

            // set Cable and Cable Color
            Post[_getOptionName('select', code, cable.lengths.option_category_id)] = _getCableLengthId();

            if( cable.hasChoices ) {
                Post[_getOptionName('select', code, cable.colors.option_category_id)] = cable.colors[cc.cable.currentColor].id;
            }

            // set Input Plug and Inpug Plug Choice
            if( input.hasColors ) {
                Post[_getOptionName('select', code, INPUT_PLUG_OPTION_CATEGORY_ID)] = input.colors[input.currentColor].input_option_id;

            } else {
                Post[_getOptionName('select', code, INPUT_PLUG_OPTION_CATEGORY_ID)] = input.colors[Object.keys(input.colors)[0]].input_option_id;

                if( input.hasBoots ) {
                    Post[_getOptionName('select', code, J_BOOTS[input.manufacturer][input.series].input_option_category_id)] = J_BOOTS[input.manufacturer][input.series].boot[input.currentBoot].input_option_id;
                }
            }

            // set Output Plug and Output Plug Choice
            if( output.hasColors ) {
                Post[_getOptionName('select', code, OUTPUT_PLUG_OPTION_CATEGORY_ID)] = output.colors[output.currentColor].output_option_id;

            } else {
                Post[_getOptionName('select', code, OUTPUT_PLUG_OPTION_CATEGORY_ID)] = output.colors[Object.keys(output.colors)[0]].output_option_id;

                if( output.hasBoots ) {
                    Post[_getOptionName('select', code, J_BOOTS[output.manufacturer][output.series].input_option_category_id)] = J_BOOTS[output.manufacturer][output.series].boot[output.currentBoot].output_option_id;
                }
            }

            if( cc.techflex ) {
                Post[_getOptionName('select', code, J_OTHER.techflex.option_category_id)] = J_OTHER.techflex.colors[cc.techflex].id;

                Post[_getOptionName('select', code, J_OTHER.techflex.length.option_category_id)] = J_OTHER.techflex.length['feet_' + (cc.type === 'patch' ? Math.floor((cc.length.amount - 1) / 12) + 1 : cc.length.amount)];
            }

            if( cc.tourproof ) {
                Post[_getOptionName('select', code, J_OTHER.tourproof.option_category_id)] = J_OTHER.tourproof.option_id;
            }

            if( cc.reverse_plugs ) {
                Post[_getOptionName('select', code, J_OTHER.reverse_plugs.option_category_id)] = J_OTHER.reverse_plugs.option_id;
            }

            $.ajax({
                url:'/ProductDetails.asp?ProductCode=' + code + '&AjaxError=Y',
                type: 'POST',
                cache: false,
                data: $.param(Post),
                processData: false,
                dataType: 'text',
            }).done(function() {
                // $('#confirmation').removeClass('pending').addClass('complete');
                // window.location.href = "/ShoppingCart.asp";
            }).fail(function(jqXHR, textStatus, errorThrown) {
                // $('#confirmation').addClass('error');
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
            });
        }
    };

    var resetBuilder = function() {
        $('#loader').fadeIn(50);

        DISPLAY_IMAGES.cable.src      = BLANK_IMAGE[DEFAULT_CABLE_TYPE];
        DISPLAY_IMAGES.input.src      = BLANK_IMAGE.input;
        DISPLAY_IMAGES.output.src     = BLANK_IMAGE.output;
        DISPLAY_IMAGES.inputBoot.src  = BLANK_IMAGE.boot;
        DISPLAY_IMAGES.outputBoot.src = BLANK_IMAGE.boot;

        OVERVIEW_ELEMENTS.length.textContent = '';
        OVERVIEW_ELEMENTS.cable.textContent  = '';
        OVERVIEW_ELEMENTS.input.textContent  = '';
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
            var current, article, next;

            $('body').on('keydown', function(e) {

                next = '';

                current = body.getAttribute('data-current-step');

                if( e.keyCode == 37 ) { // left
                    article = $('article[data-component="' + current + '"]').prev();

                    if( article.length ) {
                        next = article.attr('data-component');
                    }

                } else if( e.keyCode == 39 ) { // right
                    article = $('article[data-component="' + current + '"]').next();

                    if( article.length ) {
                        next = article.attr('data-component');
                    } else {
                        confirmation.go();
                    }
                }

                if( next.length ) {
                    if( _id('content').getAttribute('data-active-section') === 'production' ) {
                        changeStep(next, current);
                    }
                }
            });
        })();

        (function tracker() {
            var body = _id('body'),
                current, step;

            $('.dot', '#tracker').on('click', function(e) {
                current = body.getAttribute('data-current-step');

                step = e.currentTarget.getAttribute('data-pointer-component');

                $('.details-wrap.active').removeClass('active');

                if( step !== current ) {
                    changeStep(step, current);
                }
            });
        })();

        (function intro() {
            $('#introduction').on('click', function() {
                _id('content').setAttribute('data-active-section', 'production');
            });
        })();

        (function confirmationHandles() {
            $('.return-wrap.return-button', '#confirmation').on('click', function() {
                _id('content').setAttribute('data-active-section', 'production');
            });

            $('#checkout').on('click', function() {
                confirmation.checkout();
            });

            $('#final-qty').on({
                keyup: function(e) {
                    var input, value;

                    input = e.target;
                    value = input.value.split('.')[0].replace(/\D/g, '');

                    input.value = value;

                    confirmation.price();
                }, blur: function(e) {
                    var input, value;

                    input = e.target;
                    value = +input.value;

                    if( !value || value < 1 ) value = 1;

                    input.value = value;

                    confirmation.price();
                }
            });
        })();

        $('#review').on('click', function() {
            confirmation.go()
        });
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
            var _hasDefaultColor = function(obj) {
                for( var p in obj ) { if( obj.hasOwnProperty(p) ) {
                    if( obj[p].default ) {
                        return p;
                    }
                }}

                return null;
            };

            var container = $('article[data-component="cable"] .options-wrap', '#builders');

            var opt = {};

            for( var c in J_CABLES ) { if( J_CABLES.hasOwnProperty(c) ) {
                var data = J_CABLES[c];

                data.code = c;
                data.component = 'cable';
                data.currentColor = _hasDefaultColor(data.colors);

                if( data.currentColor ) {
                    data.stock = data.colors[data.currentColor].qty;
                } else {
                    var key = Object.keys(data.colors)[0];
                    data.stock = data.colors[key].qty || 0;
                }

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
                    current = b.getAttribute('data-current-step'),
                    article = $('article[data-component="' + current + '"]'),
                    next;

                if( e.currentTarget.className === 'builder-prev') {
                    next = article.prev();

                } else if( e.currentTarget.className === 'builder-next' ) {
                    next = article.next();

                    if( !next.length ) {
                        confirmation.go();

                        return false;
                    }
                }

                if( next.length ) {
                    changeStep(next.attr('data-component'), current);
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

            _.find('.option').not('.blank').on({
                click: function(e) {
                    if( e.target.parentNode.className === 'outer' ) {
                        switch( e.target.className ) {
                            case 'option-specs':
                                e.delegateTarget.option.showDetails();
                                break;

                            case 'option-select':
                                e.delegateTarget.option.selectOption();
                                break;

                            default:
                                break;
                        }
                    }
                },

                mouseenter: function(e) {
                    this.option.onHoverOption.call(this.option, e);
                },

                mouseleave: function(e) {
                    this.option.offHoverOption.call(this.option, e);
                }
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
                        _updateCableStatus(val);
                    }

                    updateCost();
                    updateOverview('length');
                    updateStatus('length', 'complete');
                };

                var _updateCableStatus = (function() {
                    var cables = $('.option[data-component="cable"]'),
                        body = $('#body');

                    return function(val) {
                        if( body.attr('data-cable-type') === 'patch' ) {
                            val = val / 12;
                        }

                        cables.each(function() {
                            var t = $(this);

                            if( t.data('status') === 'unavailable' ) { return true; }

                            if( t.data('stock') < val ) {
                                t.addClass('insufficient');
                                t.css('order', t.data('order') + 300);

                                if( this.option.isSelected() ) {
                                    this.option.deselectOption();
                                }
                            } else {
                                t.removeClass('insufficient');
                                t.css('order', t.data('order'));
                            }
                        });
                    };
                })();

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

                        if( C.output && !C.output.allowance[type] ) {
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

        $('#content').attr('data-active-section', 'introduction');
        $('#content').attr('data-active-section', 'production');

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
