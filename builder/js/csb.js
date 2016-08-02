(function ($) {
    "use strict";

    var _id = function(id) { return document.getElementById(id); },
        _ce = function(e)  { return document.createElement(e); };

    var JSON_URL = 'builder/js/options.json',
        IMAGES_DIR = 'builder/images/';

    if( window.location.protocol !== 'file:' ) {
        if( window.location.hostname.indexOf('www') === -1 ) {
            window.location.hostname = 'www.sinasoid.com';

            return;
        }
    }

    var MOBILE = isMobile.any() ? true : false;

    if( MOBILE ) {
        document.body.classList.add("isMobile");
    }

    var OPTIONS_JSON, J_TYPES, J_CABLES, J_PLUGS, J_BOOTS, J_OTHER, J_RESTRICTIONS,
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

        TECHFLEX_SIZE = {
            patch: 0.2,
            instrument: 0.2,
            speaker: 0.2,
            xlr: 0.2
        },
        TECHFLEX_POSITION = {
            // centered at [x, y] relative to container; origin bot/left
            patch: [120, 107],
            instrument: [55, 400]
        },

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
                specs:         $(_id('cable-details-measurement')),
                backordered:   $(_id('cable-details-backordered')),
            },

            input: {
                wrap:          $(_id('input-details-wrap')),
                manufacturer:  $(_id('input-details-manufacturer')),
                model:         $(_id('input-details-model')),
                img_component: $(_id('input-details-component')),
                img_choice:    $(_id('input-details-choice')),
                img_measure:   $(_id('input-details-measurement')),
                price:         $(_id('input-details-price')),
                choice:        $(_id('input-details-choices')),
                backordered:   $(_id('input-details-backordered')),
            },

            output: {
                wrap:          $(_id('output-details-wrap')),
                manufacturer:  $(_id('output-details-manufacturer')),
                model:         $(_id('output-details-model')),
                img_component: $(_id('output-details-component')),
                img_choice:    $(_id('output-details-choice')),
                img_measure:   $(_id('output-details-measurement')),
                price:         $(_id('output-details-price')),
                choice:        $(_id('output-details-choices')),
                backordered:   $(_id('output-details-backordered')),
            }
        },

        CABLES = [],
        INPUTS = [],
        OUTPUTS = [],

        PLUG_RESTRICTIONS = {};

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
            this.restockTime  = data.restock_time || 2;
        };

    Setup.prototype = {
        getPrice: function(bool) {
            var total = 0,
                length = this.length.amount;

            if( this.cable ) {
                var price = this.cable.price;

                if( this.type === 'patch' ) {
                    total += (price / 4) * (Math.floor((length - 1) / 3) + 1);
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

            return bool ? total.formatMoney() : total;
        },

        getExtraOptions: function() {
            var str = '';

            if( this.techflex ) {
                str += this.techflex + ' Techflex';
            }

            if( this.tourproof ) {
                if( str ) { str += '; '; }

                str += 'Tourproof';
            }

            if( this.reverse_plugs ) {
                if( str ) { str += '; '; }

                str += 'Reversed Plugs';
            }

            return str;
        }
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

        getPrice: function(format) {
            var val = this.price;

            if( format ) {
                if( val % 1 !== 0 ) {
                    val += '0';
                }
            }

            return val;
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
            var c, p, div, colors, restock, arr = [];

            if( !this.hasChoices ) {
                return [];
            }

            if( !this.choicesHtml.length ) {
                if( this.hasColors ) {
                    colors = this.colors;
                } else if( this.hasBoots ) {
                    colors = J_BOOTS[this.manufacturer][this.series].boot;
                }

                restock = this.restockTime;

                for( p in colors ) { if( colors.hasOwnProperty(p) ) {
                    if( p === 'option_category_id' ) { continue; }

                    c = colors[p];

                    div = _ce('div');
                    div.option = this;

                    $(div).attr({
                        'data-value': p,
                        'data-choice-status': c.status,
                        'data-restock-time': c.restock_time || restock
                    }).css({
                        'background-color': c.color
                    });

                    if( c.default ) {
                        div.className = 'selected';
                    }

                    arr.push(div);
                }}

                this.choicesHtml = arr;
            }

            return this.choicesHtml;
        },

        showDetails: function() {
            var option    = this,
                choices   = option.getChoices(),
                container = option.detailsWrap,
                wrap      = container.wrap,
                old       = wrap.get(0).option,
                classes   = ['details-wrap active'];

            if( !choices.length ) {
                container.choice.addClass('empty');
            } else {
                classes.push('hasChoices');
                container.choice.removeClass('empty');
            }

            if( old ) {
                old.html.classList.remove('clicked');
            }

            option.html.classList.add('clicked');

            wrap.get(0).option = option;

            if( option.isSelected() ) {
                classes.push('selected');
            }

            if( option.status === 'unavailable' ) {
                classes.push('unavailable');
            } else if( option.status === 'backordered' ) {
                classes.push('backordered');
                container.backordered.text(option.restockTime + ' weeks.');
            }

            wrap.get(0).className = classes.join(' ');

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

                container.img_measure.attr('src', option.getMeasurementImage());
            }

            container.manufacturer.text(option.nameObj.manufacturer);
            container.model.text(option.nameObj.model);
            container.price.html(option.getPrice(true));
            container.choice.html(choices);
        },

        selectOption: function() {
            var c = this.component;

            if( this.status === 'unavailable' ) {
                return false;
            }

            if( !this.isSelected() ) {
                this.showDetails();

                this.detailsWrap.wrap.addClass('selected')
                    .next().addClass('selected')
                    .parent().addClass('complete');

                if( CURRENT_CABLE[c] ) {
                    CURRENT_CABLE[c].html.classList.remove('selected');
                }

                this.html.classList.add('selected');

                CURRENT_CABLE[c] = this;

                DISPLAY_IMAGES[c].src = this.getDisplayImageUrl();

                if( DISPLAY_IMAGES[c + 'Boot'] ) {
                    if( this.hasBoots) {
                        DISPLAY_IMAGES[c + 'Boot'].src = this.getDisplayBootImageUrl();
                    } else {
                        DISPLAY_IMAGES[c + 'Boot'].src = BLANK_IMAGE.boot;
                    }
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

            restrictions.check();

            if( c === 'cable' ) restrictions.cable();
            if( this.part === 'plug' ) restrictions.plug.call(this);
        },

        deselectOption: function() {
            var c = this.component;

            if( _id('body').getAttribute('data-current-step') !== this.component ) {
                this.detailsWrap.wrap.removeClass('active');
                $(this.html).removeClass('clicked');
            }

            this.detailsWrap.wrap.removeClass('selected')
                // .next().removeClass('selected')
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
        this.lengths      = data.lengths;
        this.restrict     = data.restrict_plugs || false;
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
                    '<p class="spec"><span class="label">',
                    p,
                    ':</span> <strong>',
                    this.specs[p],
                    '</strong>',
                    p === 'capacitance' ? '<button class="modal-capacitance">?</button>' : '',
                    '</p>'
                ];

                s.push(str.join(''));
            }}

            this.specsHtml = s.join('');
        }

        return this.specsHtml;
    };

    Cable.prototype.setChoice = function(e) {
        var _getAvailable = function() {
            var status = true,
                attr = target.getAttribute('data-choice-status') || '';

            if( !attr.length || attr === 'unavailable' ) {
                status = false;
            }

            return status;
        };

        var _getSelected = function(el) {

            return el.className === 'selected';
        };

        var _getNewChoice = function(el) {

            return el.getAttribute('data-value') === color;
        };

        var target = e.target;

        var color  = target.getAttribute('data-value'),
            status = _getAvailable.call(this);

        var url = BLANK_IMAGE_URL;

        var wrap = this.detailsWrap.wrap,
            option = wrap.get(0).option;

        if( this.hasColors && color !== this.currentColor ) {
            this.currentColor = color;

            url = this.getBuilderImageUrl();

            this.detailsWrap.img_component.attr('src', url);

            if( status ) {
                $('.component', _id(this.code)).attr('src', url);

                if( target.getAttribute('data-choice-status') === 'backordered' ) {
                    wrap.addClass('backordered');
                    option.html.setAttribute('data-status', 'backordered');
                    this.detailsWrap.backordered.text(target.getAttribute('data-restock-time') + ' weeks.');
                } else {
                    wrap.removeClass('backordered');
                    option.html.setAttribute('data-status', option.status);
                }

                this.choicesHtml.filter(_getSelected)[0].className = '';
                this.choicesHtml.filter(_getNewChoice)[0].className = 'selected';

                if( CURRENT_CABLE.cable &&
                    CURRENT_CABLE.cable.code === this.code ) {
                    DISPLAY_IMAGES.cable.src = this.getDisplayImageUrl();

                    updateOverview(this.component, this);
                    restrictions.check();
                }
            }
        }
    };

    Cable.prototype.onHoverOption = function(e) {

        DISPLAY_IMAGES.cable.src = this.getDisplayImageUrl();
    };

    Cable.prototype.offHoverOption = function(e) {
        var obj = CURRENT_CABLE[this.component];

        var url = obj && obj.getDisplayImageUrl() || BLANK_IMAGE[CURRENT_CABLE.type];

        DISPLAY_IMAGES.cable.src = url;
    };

    var Plug = function(data, el) {
        Option.apply(this, arguments);

        this.part         = 'plug';
        this.component    = data.component;
        this.series       = data.series;
        this.angle        = data.angle;
        this.hasColors    = data.has_colors || false;
        this.hasBoots     = data.has_boots  || false;
        this.hasChoices   = data.has_colors || data.has_boots;
        this.colors       = data.colors;
        this.currentColor = data.currentColor;
        this.currentBoot  = data.currentBoot;
        this.restrictions = data.restrictions || [];
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

    Plug.prototype.getMeasurementImage = function() {
        var manu = this.manufacturer,
            model = this.model;

        if( manu === 'g&h' ) {
            model = model.split('-')[0];
        }

        return [
            IMAGES_DIR,
            'builder/plug/',
            formatTextForImageUrl(manu), '/',
            'overlay/',
            formatTextForImageUrl(model),
            '.png'
        ].join('');
    };

    Plug.prototype.setChoice = function(e) {
        var _getAvailable = function() {
            var status = true,
                attr = target.getAttribute('data-choice-status') || '';

            if( !attr.length || attr === 'unavailable' ) {
                status = false;
            }

            return status;
        };

        var _getSelected = function(el) {

            return el.className === 'selected';
        };

        var _getNewChoice = function(el) {

            return el.getAttribute('data-value') === color;
        };

        var target = e.target;

        var color  = target.getAttribute('data-value'),
            status = _getAvailable.call(this);

        var url = BLANK_IMAGE_URL;

        var wrap = this.detailsWrap.wrap,
            option = wrap.get(0).option;

        if( target.getAttribute('data-choice-status') === 'backordered' ) {
            wrap.addClass('backordered');
            option.html.setAttribute('data-status', 'backordered');
            this.detailsWrap.backordered.text(target.getAttribute('data-restock-time') + ' weeks.');
        } else {
            if( option.status !== 'backordered' ) wrap.removeClass('backordered');
            option.html.setAttribute('data-status', option.status);
        }

        if( this.hasColors && color !== this.currentColor ) {
            this.currentColor = color;

            url = this.getBuilderImageUrl();

            this.detailsWrap.img_component.attr('src', url);

            if( status ) {
                $('.component', _id(this.code)).attr('src', url);
                this.choicesHtml.filter(_getSelected)[0].className = '';
                this.choicesHtml.filter(_getNewChoice)[0].className = 'selected';

                if( CURRENT_CABLE[this.component] &&
                    CURRENT_CABLE[this.component].code === this.code ) {
                    DISPLAY_IMAGES[this.component].src = this.getDisplayImageUrl();

                    updateOverview(this.component, this);
                    restrictions.check();
                }
            }
        }

        if( this.hasBoots && color !== this.currentBoot ) {
            this.currentBoot = color;

            this.detailsWrap.img_choice.attr('src', this.getBuilderBootImageUrl());

            if( status ) {
                this.choicesHtml.filter(_getSelected)[0].className = '';
                this.choicesHtml.filter(_getNewChoice)[0].className = 'selected';

                if( CURRENT_CABLE[this.component] &&
                    CURRENT_CABLE[this.component].code === this.code ) {
                    DISPLAY_IMAGES[this.component + 'Boot'].src = this.getDisplayBootImageUrl();

                    updateOverview(this.component, this);
                    restrictions.check();
                }
            }
        }
    };

    Plug.prototype.onHoverOption = function(e) {
        var comp = this.component;

        DISPLAY_IMAGES[comp].src = this.getDisplayImageUrl();

        if( this.hasBoots ) {
            DISPLAY_IMAGES[comp + 'Boot'].src = this.getDisplayBootImageUrl();
        } else {
            DISPLAY_IMAGES[comp + 'Boot'].src = BLANK_IMAGE_URL;
        }
    };

    Plug.prototype.offHoverOption = function(e) {
        var comp = this.component;

        var obj = CURRENT_CABLE[comp];

        var url  = obj && obj.getDisplayImageUrl()     || BLANK_IMAGE[comp],
            boot = obj && obj.getDisplayBootImageUrl() || BLANK_IMAGE_URL;

        DISPLAY_IMAGES[comp].src = url;
        DISPLAY_IMAGES[comp + 'Boot'].src = boot;
    };

    // generate #num blank blocks
    // fix flex spacing
    var getBlankBlocks = function(num, c) {
        var arr = [], i, e, text;

        text = 'blank' + (c ? ' ' + c : '');

        for( i = 0; i < num; i++ ) {
            e = _ce('div');
            e.className = text;
            arr.push(e);
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

        if( status === 'unavailable' ) {
            order += 600;
        }

        block.setAttribute('data-component', option.component);
        block.setAttribute('data-status', status);
        $block.addClass(option.getAllowanceString());
        $block.css('order', order);

        if( option.component === 'cable' ) {
            $block.data({
                'order': order
            });
        }

        if( option.restrictions && option.restrictions.length ) {
            $block.addClass('restricted');
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
            $('<button/>', {text: 'Specs', class: 'option-specs'}),
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
            $('<span/>', {class: 'price', text: option.getPrice(true)})
        );

        inner.append(images, details);
        $block.append(choicesDiv, outer, inner);

        return block;
    };

    var changeStep = (function() {
        var b = _id('body'), c = _id('content'), current;

        return function(next) {
            current = b.getAttribute('data-current-step');

            if( MQ_SMALL.matches ) {
                $('#' + current + '-details-wrap').removeClass('active');
            }

            if( c.getAttribute('data-active-section') !== 'production' ||
                current === next ) {
                return false;
            }

            if( current === 'length' ) {
                updateOverview('length');
                updateStatus('length', 'complete');
            }

            if( next === 'extras' ) {
                updateOverview('extras');
                updateStatus('extras', 'complete');
            }

            if( next === 'confirmation' ) {
                confirmation.go();

            } else {
                b.setAttribute('data-current-step', next);
            }
        };
    })();

    var updateStatus = (function() {
        var t = _id('tracker');

        var b = _id('body');

        var tracker = {
            length:  t.querySelector('div[data-pointer-component="length"]'),
            cable:   t.querySelector('div[data-pointer-component="cable"]'),
            input:   t.querySelector('div[data-pointer-component="input"]'),
            output:  t.querySelector('div[data-pointer-component="output"]'),
            extras:  t.querySelector('div[data-pointer-component="extras"]')
        };

        var _isComplete = function() {
            var _s = function(e) {
                return e.getAttribute('data-status') === 'complete';
            };

            var t = tracker;

            if( _s(t.length) &&  _s(t.cable) &&  _s(t.input) &&  _s(t.output) && _s(t.extras)) {
                return true;
            }

            return false;
        };

        return function(c, s) {
            var el = tracker[c];

            if( el ) {
                el.setAttribute('data-status', s);
            }

            if( !_isComplete() ) {
                if( b.getAttribute('data-completed') !== 'false' ) {
                    b.setAttribute('data-completed', 'false');
                }

            } else {
                b.setAttribute('data-completed', 'true');
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

    var restrictions = {
        check: function() {
            var cc = CURRENT_CABLE;

            if( !cc.cable || (!cc.input && !cc.output) ) {
                return true;
            }

            var obj = J_RESTRICTIONS[cc.cable.code];

            // if restrictions for this cable do not exist, exit
            if( !obj ) {
                this.enforce(true);
                return false;
            }

            var ref;

            var d = obj.disallow,
                a = obj.allow;

            var i, c;

            var checks = [];

            var status = [];

            if( cc.input ) {
                checks.push(cc.input);
            }

            if( cc.output ) {
                checks.push(cc.output);
            }

            if( d ) {
                if( d === 'all' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        status[i] = false;
                    }

                } else if ( typeof d === 'object' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        status[i] = true;

                        c = checks[i];

                        ref = d[c.manufacturer];

                        if( ref && ref.series[c.series] ) {
                            status[i] = false;
                        }
                    }
                }
            }

            if( a ) {
                if( a === 'all' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        status[i] = true;
                    }

                } else if( typeof a === 'object' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        c = checks[i];

                        ref = a[c.manufacturer];

                        if( ref ) {
                            if( ref.series instanceof Array ) {

                            } else if( typeof ref.series === 'object' && ref.series[c.series] ) {
                                ref = ref.series[c.series];

                                if( ref instanceof Array && ref.indexOf(c.currentBoot) > -1 ) {
                                    status[i] = true;
                                }
                            }
                        }
                    }
                }
            }

            this.enforce(status.indexOf(true) > -1);
        },

        enforce: function(status) {
            // status answers the question:
            // Is techflex allowed on this cable?
            _id('techflex').setAttribute('data-enabled', status);

            if( !status ) {
                $('.techflex input:checked', '#techflex').prop('checked', false);

                CURRENT_CABLE.techflex = false;
                toggleTechflexWindow(false);
                updateOverview('extras');
                updateCost();
            } else {
                $('.techflex input:checked', '#techflex').prop('checked', true);
            }
        },

        cable: (function() {
            var c, i, o, r, j, b, allPlugs, standardPlugs,

                attr = 'data-restriction',
                categories = null;

            return function() {
                if( ! categories ) { categories = $('article.input-wrap .options, article.output-wrap .options'); }

                if( !allPlugs ) {
                    allPlugs = $(INPUTS.concat(OUTPUTS));
                    standardPlugs = allPlugs.filter(function() {
                        return this.className.indexOf('restrict') === -1;
                    });
                }

                c = CURRENT_CABLE.cable;
                i = CURRENT_CABLE.input;
                o = CURRENT_CABLE.output;

                if( c ) {
                    r = $(PLUG_RESTRICTIONS[c.code]);

                    allPlugs.attr(attr, 'hide');
                    categories.attr(attr, 'hide');

                    r.parent().attr(attr, 'show');

                    if( c.restrict ) {
                        r.attr(attr, 'show');

                        b = false;
                        if( i ) {
                            for( j = 0; j < r.length; j++ ) {
                                if( r[j].option.code === i.code ) {
                                    b = true;
                                    break;
                                }
                            }

                            if( !b ) {
                                i.deselectOption();
                            }
                        }

                        b = false;
                        if( o ) {
                            for( j = 0; j < r.length; j++ ) {
                                if( r[j].option.code === o.code ) {
                                    b = true;
                                    break;
                                }
                            }

                            if( !b ) {
                                o.deselectOption();
                            }
                        }
                    } else {
                        standardPlugs.parent().attr(attr, 'show');
                        standardPlugs.attr(attr, 'show');
                        r.attr(attr, 'show');
                    }
                } else {
                    allPlugs.attr(attr, 'show');
                    categories.attr(attr, 'show');
                }
            };
        })(),

        plug: (function() {
            var r, allCables, type,
                matches = [],
                attr = 'data-restriction',
                categories = null,
                _filter = function() {
                    return this.className.indexOf(type) > -1;
                },
                _pushMatch = function() {
                    if( r.indexOf(this.option.code) > -1 ) {
                        matches.push(this);
                    }
                };

            return function() {
                if( ! categories ) { categories = $('article.cable-wrap .options'); }

                type = _id('body').getAttribute('data-cable-type');

                allCables = $(CABLES).filter(_filter);

                var i = CURRENT_CABLE.input,
                    o = CURRENT_CABLE.output;

                var i_arr = i && i.restrictions || [],
                    o_arr = o && o.restrictions || [];

                r = i_arr.concat(o_arr);

                if( r.length && (i || o) ) {
                    matches = [];

                    allCables.attr(attr, 'hide');
                    categories.attr(attr, 'hide');

                    allCables.each(_pushMatch);

                    for( var j = 0; j < matches.length; j++ ) {
                        matches[j].parentNode.setAttribute(attr, 'show');
                    }

                    $(matches).attr(attr, 'show');
                } else {
                    allCables.attr(attr, 'show');
                    categories.attr(attr, 'show');
                }
            };
        })()
    };

    var toggleTechflexWindow = (function() {
        var box = $('#techflex-window');

        return function(val, label) {
            if( val ) {
                box.show();
                box.children().get(0).src = label.children[0].src;

            } else {
                box.hide();
            }
        };
    })();

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
            var cc = CURRENT_CABLE,
                c = _id('final-cable'),
                i = _id('final-input'),
                o = _id('final-output'),
                e = _id('final-extras'),
                p = _id('final-price');

            var c_b = cc.cable.status  === 'backordered',
                i_b = cc.input.status  === 'backordered',
                o_b = cc.output.status === 'backordered';

            if( c_b || i_b || o_b ) {
                _id('backorder-warning').setAttribute('data-active', 'active');
            } else {
                _id('backorder-warning').setAttribute('data-active', 'inactive');
            }

            c.className = c_b ? 'backordered' : '';
            i.className = i_b ? 'backordered' : '';
            o.className = o_b ? 'backordered' : '';

            c.textContent  = cc.length.amount.toString() + cc.length.unit + ' ' + cc.cable.getFullName();
            i.textContent  = cc.input.getFullName();
            o.textContent  = cc.output.getFullName();
            e.textContent  = cc.getExtraOptions();
            p.textContent  = cc.getPrice(true);
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

        $('.scrollbar').scrollTop(0).attr('data-position', 'top');

        CURRENT_CABLE = new Setup();
        window.CC = CURRENT_CABLE;
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
        topOffset: 7,

        initialize: function() {
            var type = _id('body').getAttribute('data-cable-type');

            this.update();
            this.draw[type].call(this);

            this.techflex();
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

                var c = this.container,
                    i = this.images,
                    r = DEFAULT_PATCH_CABLE_HEIGHT / DEFAULT_PATCH_CABLE_WIDTH,
                    w = this.width * scale,
                    h = w * r,
                    o = this.topOffset;

                var m = w / DEFAULT_PATCH_CABLE_WIDTH;

                var _setOuterCss = function() {
                    i.css({
                        width: w,
                        height: w * r,
                        left: (c.width() - w) / 2,
                        // top: (c.height() - h) / 3
                        top: (c.height() - h) / o
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

                var c = this.container,
                    i = this.images,
                    m = this.multiplier * scale,
                    h = this.height * scale,
                    w = this.width * scale,
                    o = this.topOffset;

                var _setOuterCss = function(l) {
                    i.css({
                        width: l,
                        height: l,
                        left: (c.width() - l) / 2,
                        top: (c.height() - l) / o
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
        },

        techflex: function() {
            var ratios = {
                // [width, height]
                patch: [TECHFLEX_POSITION.patch[0]/DEFAULT_PATCH_CABLE_WIDTH, TECHFLEX_POSITION.patch[1]/DEFAULT_PATCH_CABLE_HEIGHT],
                instrument: [TECHFLEX_POSITION.instrument[0]/DEFAULT_CABLE_WIDTH, TECHFLEX_POSITION.instrument[1]/DEFAULT_CABLE_WIDTH],
                speaker: [TECHFLEX_POSITION.instrument[0]/DEFAULT_CABLE_WIDTH, TECHFLEX_POSITION.instrument[1]/DEFAULT_CABLE_WIDTH],
                xlr: [TECHFLEX_POSITION.instrument[0]/DEFAULT_CABLE_WIDTH, TECHFLEX_POSITION.instrument[1]/DEFAULT_CABLE_WIDTH]
            };

            var type = CURRENT_CABLE.type;

            var width  = this.images.width(),
                height = this.images.height();

            var windowSize = TECHFLEX_SIZE[type] * width;

            var box = $(_id('techflex-window'));

            box.css({
                left:   ratios[type][0]*width - windowSize/2,
                bottom: ratios[type][1]*height - windowSize/2,
                width:  windowSize,
                height: windowSize
            });
        }
    },

    formatTextForImageUrl = function(str) {

        return str.replace(/ /g,'-').toLowerCase();
    },

    handles = function() {
        (function onWindowSizeChange() {
            var $w = $(window),
                $b = $('body'),
                c = _id('content'),
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
            var current, button, next;

            $('body').on('keydown', function(e) {
                next = '';
                button = null;
                current = _id('body').getAttribute('data-current-step');

                if( e.keyCode == 37 ) { // left
                    button = $('article[data-component="' + current + '"] .builder-prev');

                    if( button.length ) {
                        next = button.attr('data-next');
                    }

                } else if( e.keyCode == 39 ) { // right
                    button = $('article[data-component="' + current + '"] .builder-next');

                    if( button.length ) {
                        next = button.attr('data-next');
                    }

                } else {
                    return true;
                }

                if( next ) {
                    changeStep(next);
                }
            });
        })();

        (function tracker() {
            $('.dot', '#tracker').on('click', function(e) {
                var next = e.currentTarget.getAttribute('data-pointer-component');

                changeStep(next);
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

        (function modal() {
            $('#modal').on('click', function() {
                var attr = 'data-modal';

                if( this.getAttribute(attr) ) {
                    this.removeAttribute(attr);
                }
            });

            $('div', '#modal').on('click', function(e) {
                if( e.target.className !== 'exit' ) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            $('.switch', '#modal').on('click', function() {
                this.parentNode.setAttribute('data-which', this.textContent);
            });
        })();

        $('.review-wrap').on('click', 'button', function() {
            confirmation.go();
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

            build.lengths();
            build.cables();
            build.plugs();
            build.other();
        },

        lengths: function() {
            var _getChoice = function() {
                var div = _ce('div');
                    div.className = 'length-choice';
                    div.setAttribute('data-type', type);
                    div.setAttribute('data-unit', unit);

                var image = _ce('div');
                    image.className = 'image';
                div.appendChild(image);

                var active = _ce('img');
                    active.className = 'active';
                    active.src = [
                        IMAGES_DIR,
                        'misc/length/silhouette/',
                        type,
                        '-red.png'
                    ].join('');
                    active.alt = display + ' Cable';
                image.appendChild(active);

                var inactive = _ce('img');
                    inactive.className = 'inactive';
                    inactive.src = [
                        IMAGES_DIR,
                        'misc/length/silhouette/',
                        type,
                        '-gray.png'
                    ].join('');
                    inactive.alt = display + ' Cable';
                image.appendChild(inactive);


                var name = _ce('div');
                    name.className = 'name';
                    name.innerHTML = '<span>' + display + '</span>';
                div.appendChild(name);

                var desc = _ce('div');
                    desc.className = 'desc';
                    desc.innerHTML = '<span>' + min + '-' + max + ' ' + unit + '</span>';
                div.appendChild(desc);

                return div;

            },  _getRuler = function() {
                var div = _ce('div');
                    div.className = 'ruler';
                    div.setAttribute('data-type', type);
                    div.setAttribute('data-unit', unit);
                    div.setAttribute('data-min',  min);
                    div.setAttribute('data-max',  max);
                    div.setAttribute('data-init', init);

                $(div).slider({
                    range: 'max',
                    value: init,
                    min: min,
                    max: max
                });

                return div;

            },  _getInput = function() {
                var div = _ce('div');
                    div.className = 'input';
                    div.setAttribute('data-type', type);
                    div.setAttribute('data-unit', unit);
                    div.setAttribute('data-min',  min);
                    div.setAttribute('data-max',  max);
                    div.setAttribute('data-init', init);
                    div.innerHTML = [
                        '<span>' + display + '</span>',
                        '<input type="text" value="' + init + '" maxlength="3">',
                        '<label>' + unit + '</label>'
                    ].join('');

                return div;

            },  _getSelect = function() {
                var div = _ce('div');
                    div.className = 'select';
                    div.setAttribute('data-type', type);
                    div.setAttribute('data-unit', unit);
                    div.setAttribute('data-min',  min);
                    div.setAttribute('data-max',  max);
                    div.setAttribute('data-init', init);

                var select = _ce('select');

                var opt = null;
                for( var i = min; i <= max; i++ ) {
                    opt = _ce('option');
                    opt.value = i;
                    opt.textContent = i + ' ' + unit;

                    if( i === init ) {
                        opt.selected = true;
                    }

                    select.appendChild(opt);
                }

                div.appendChild(select);

                return div;
            };

            var choices = [], rulers = [], inputs = [], selects = [];

            var type, display, min, max, unit, init;

            for( type in J_TYPES ) { if( J_TYPES.hasOwnProperty(type) ) {
                var data = J_TYPES[type];

                display = data.display;
                min     = data.min;
                max     = data.max;
                unit    = data.unit;
                init    = data.initial;

                if( !data.enabled || !display.length || !min || !max || !init ) { continue; }

                choices.push(_getChoice());
                rulers.push(_getRuler());
                inputs.push(_getInput());
                selects.push(_getSelect());
            }}

            for( var i = 0; i < inputs.length; i++ ) {
                var input = inputs[i].querySelector('input'),
                    select = selects[i].querySelector('select');

                input.ruler = $(rulers[i]);
                input.select = select;

                rulers[i].input = input;
                rulers[i].select = select;

                select.input = input;
                select.ruler = $(rulers[i]);
            }

            var article = $('.length-wrap', '#builders');

            article.find('.length-choices').append(choices);
            article.find('.rulers').append(rulers);
            article.find('.inputs').append(inputs);
            article.find('.selects').append(selects);
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

                var cable = new Cable(data);
                var block = getOptionBlock(cable);

                if( !opt[data.category] ) {
                    opt[data.category] = [];
                }

                opt[data.category].push(block);

                CABLES.push(block);
            }}

            for( var p in opt ) { if( opt.hasOwnProperty(p) ) {
                var blanks = getBlankBlocks(opt[p].length, 'option');
                var el = opt[p].concat(blanks);

                var div = $('<div/>', {class: 'options ' + p});

                var h = $('<h3/>', {text: p});

                div.html(el).prepend(h);

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
                        data.currentBoot = _hasDefaultColor(J_BOOTS[data.manufacturer][data.series].boot);
                    }

                    var plug = new Plug(data);
                    var block = getOptionBlock(plug);

                    if( !opt[data.category] ) {
                        opt[data.category] = [];
                    }

                    opt[data.category].push(block);

                    if( sides[i] === 'input' ) {
                        INPUTS.push(block);
                    } else {
                        OUTPUTS.push(block);
                    }

                    if( data.restrictions && data.restrictions.length ) {
                        for( var j = 0; j < data.restrictions.length; j++ ) {
                            var c = data.restrictions[j];

                            if( !PLUG_RESTRICTIONS[c] ) {
                                PLUG_RESTRICTIONS[c] = [];
                            }

                            PLUG_RESTRICTIONS[c].push(block);
                        }
                    }
                }}

                for( p in opt ) { if( opt.hasOwnProperty(p) ) {
                    var blanks = getBlankBlocks(opt[p].length, 'option');
                    var el = opt[p].concat(blanks);

                    var div = $('<div/>', {class: 'options ' + p});

                    var h = $('<h3/>', {text: p});

                    div.html(el).prepend(h);

                    container.append(div);
                }}
            }
        },

        other: function() {
            var _getTechflexBlock = function(color) {
                return $('<div/>', {class: 'techflex'}).append(
                    $('<input/>', {
                        type: 'radio',
                        id: 'techflex_' + color,
                        name: 'techflex',
                        value: color
                    }),
                    $('<span/>', {text: color}),
                    $('<label/>', {for: 'techflex_' + color}).append(
                        $('<img/>', {
                            alt: color + ' techflex',
                            src: IMAGES_DIR + 'techflex/' + color + '.png'
                        })
                    )
                );
            };

            var c, colors = J_OTHER.techflex.colors, arr = [];
            for( c in colors ) { if( colors.hasOwnProperty(c) ) {
                arr.push(_getTechflexBlock(c));
            }}

            arr = arr.concat(getBlankBlocks(arr.length, 'techflex'));

            $('#techflex').append(arr);
        },

        handles: function() {
            var _ = this.structure;

            _.find('.footer', '#builders').on('click', 'button', function(e) {
                var next = e.currentTarget.getAttribute('data-next');

                changeStep(next);
            });

            _.find('.details-wrap .back').on('click', function(e) {
                var parent = $(e.currentTarget).parents('.details-wrap');

                parent.get(0).option.html.classList.remove('clicked');

                if( parent.hasClass('active') ) {
                    parent.removeClass('active');
                }
            });

            _.find('.details-wrap').on('click', '.modal-capacitance', function(e) {
                var attr = 'data-modal';

                if( _id('modal').getAttribute(attr) !== 'capacitance' ) {
                    _id('modal').setAttribute(attr, 'capacitance');
                }
            });

            _.find('.measurement').on('click', function(e) {
                if( e.target.className === 'modal-capacitance') {
                    return true;
                }

                e.currentTarget.classList.toggle('clicked');
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
                    } else if( e.target.className === 'outer' ) {
                        e.delegateTarget.option.showDetails();
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
                        updateCost();
                    }

                    updateOverview('length');
                    updateStatus('length', 'complete');
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

                        if( C.output && !C.output.allowance[type] ) {
                            C.output.selectOption();
                        }

                        displayImages.initialize();
                    }

                    _updateLength(val);
                });

                _.find('.length-wrap .ruler').on('slide', function(e, ui) {
                    var val = ui.value,
                        el = e.currentTarget;

                    // update input
                    el.input.value = val;
                    el.select.value = val;

                    _updateLength(val);
                });

                _.find('.length-wrap .input').on('keyup', 'input', function(e) {
                    var el = e.currentTarget,
                        val = el.value.split('.')[0].replace(/\D/g, '');

                    el.value = val;
                    el.ruler.slider('value', val);
                    el.select.value = val;

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
                    el.select.value = val;

                    _updateLength(val);
                });

                _.find('.length-wrap .select').on('change', 'select', function(e) {
                    var el = e.currentTarget,
                        val = Number(el.value);

                    el.input.value = val;
                    el.ruler.slider('value', val);

                    _updateLength(val);
                });

                _.find('#length-confirm').on('click', function() {
                    $('#body').attr('data-current-step', 'cable');

                    _updateLength();
                });
            })();

            _.find('.extras-wrap input[type="checkbox"]').on('change', function() {
                var opt = this.name;

                CURRENT_CABLE[opt] = this.checked;
                updateOverview('extras');
                updateStatus('extras', 'complete');
                updateCost();
            });

            _.find('.extras-wrap .techflex').on('click', 'label', function(e) {
                e.preventDefault();

                var label = e.currentTarget,
                    id    = label.htmlFor,
                    input = _id(id),
                    checked = input.checked,
                    value = !checked ? input.value : false;

                input.checked = !checked;
                CURRENT_CABLE.techflex = value;

                toggleTechflexWindow(value, label);

                updateStatus('extras', 'complete');
                updateOverview('extras');
                updateCost();
            });

            $('#techflex-window').on('click', function() {
                changeStep('extras');
            });

            $('#tourproof-modal').on('click', function(e) {
                var attr = 'data-modal';

                if( _id('modal').getAttribute(attr) !== 'tourproof' ) {
                    _id('modal').setAttribute(attr, 'tourproof');
                }
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

        $('.scrollbar').each(function() {
            $(this).css('width', 'calc(100% + ' + scrollbarWidth + 'px)');
        }).on('scroll', function() {
            var $this = $(this);

            var scrolled = $this.scrollTop();

            var sum = $this.innerHeight() + scrolled;

            if( scrolled === 0 ) {
                this.setAttribute('data-position', 'top');
            } else if( sum >= this.scrollHeight ) {
                this.setAttribute('data-position', 'bottom');
            } else {
                this.setAttribute('data-position', 'center');
            }
        });

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
        if( MOBILE &&
            typeof $zopim === 'function' &&
            typeof $zopim.livechat === 'object' ) {
            $zopim.livechat.hideAll();
        }

        FastClick.attach(document.body);

        $.getJSON( JSON_URL )
            .done(function(response) {
                OPTIONS_JSON   = response;
                J_TYPES        = OPTIONS_JSON.types;
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
