(function ($) {
    "use strict";

    var JSON_URL = 'skin/js/options.json',
        IMAGES_DIR = 'skin/images/';

    if( window.location.protocol !== 'file:' ) {
        if( window.location.hostname.indexOf('www') === -1 ) {
            window.location.hostname = 'www.sinasoid.com';
        }
    }

    var OPTIONS_JSON, J_CABLE_TYPES, J_CABLES, J_PLUGS, J_OTHER, J_RESTRICTIONS,
        CURRENT_CABLE = null,

        DEFAULT_CABLETYPE_TYPE = '',
        DEFAULT_CABLETYPE_PREFIX = '',
        DEFAULT_CABLE_LENGTH_TYPE = 'patch',

        DEFAULT_PLUG_HEIGHT = 300,
        DEFAULT_PLUG_WIDTH = 180,
        DEFAULT_REGULAR_CABLE_HEIGHT = 600,
        DEFAULT_REGULAR_CABLE_WIDTH = 600,
        DEFAULT_PATCH_CABLE_HEIGHT = 162,
        DEFAULT_PATCH_CABLE_WIDTH = 480,

        BLANK_PLUG_URL = IMAGES_DIR + 'display/plug_outline.png',
        BLANK_PATCH_CABLE_URL = IMAGES_DIR + 'display/cable_patch_outline.png',
        BLANK_REGULAR_CABLE_URL = IMAGES_DIR + 'display/cable_regular_outline.png',
        BLANK_IMAGE_URL = IMAGES_DIR + 'blank.png',

        TECHFLEX_COST = 0.50,

        TOUCH = Modernizr.touch,

        CURRENT_VERSION = 3,
        Cable = function() {
            this.id = null;
            this.price = 0;
            this.quantity = 1;
            this.version = CURRENT_VERSION;
            this.cableType = {
                prefix: DEFAULT_CABLETYPE_PREFIX,
                type: DEFAULT_CABLETYPE_TYPE
            };
            this.cable = {
                code: '',
                choice: null,
                name: '',
                manufacturer: '',
                model: ''
            };
            this.length = {
                amount: 0,
                unit: '',
                type: DEFAULT_CABLE_LENGTH_TYPE
            };
            this.input = {
                code: '',
                name: '',
                manufacturer: '',
                model: '',
                choice: null,
                series: ''
            };
            this.output = {
                code: '',
                name: '',
                manufacturer: '',
                model: '',
                choice: null,
                series: ''
            };
            this.other = {
                reverse_plugs: false,
                tourproof: false,
                techflex: '',
                visited: false
            };
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

    getScrollbarSize = function() {
        var outer = document.createElement("div");
        outer.style.visibility = "hidden";
        outer.style.width = "100px";
        outer.style.height = "100px";
        outer.style.overflow = "scroll";
        document.body.appendChild(outer);

        var widthNoScroll = outer.offsetWidth;
        var heightNoScroll = outer.offsetHeight;

        // add innerdiv
        var inner = document.createElement("div");
        inner.style.width = "100%";
        inner.style.height = "100%";
        outer.appendChild(inner);

        var widthWithScroll = inner.offsetWidth;
        var heightWithScroll = inner.offsetHeight;

        // remove divs
        outer.parentNode.removeChild(outer);

        return {
            width: widthNoScroll - widthWithScroll,
            height: heightNoScroll - heightWithScroll
        };
    },

    resize = {
        viewport: function() {
            var section = $('#content').attr('data-active-section');

            update.dispatch(CURRENT_CABLE, true);

            scrollToSection(section);

            displayImages.resize();
        }
    },

    oos = function(option) {

        return option.data('status') === 'unavailable';
    },

    scrollToSection = function(section) {

        $('#content').attr('data-active-section', section);
    },

    changeDisplayImageURL = (function() {
        var display = $('.images', '#display'),
            cable = display.find('.cable .cable-image'),
            input = display.find('.input img.input-plug-image'),
            output = display.find('.output img.output-plug-image'),
            input_boot = display.find('.input img.input-boot-image'),
            output_boot = display.find('.output img.output-boot-image');

        var _getEmptyURL = function(c) {
            var src = BLANK_IMAGE_URL;

            switch(c) {
                case 'cable':
                    if( CURRENT_CABLE.length.type === 'regular' ) {
                        src = BLANK_REGULAR_CABLE_URL;
                    } else if( CURRENT_CABLE.length.type === 'patch' ) {
                        src = BLANK_PATCH_CABLE_URL;
                    }
                    break;

                case 'input':
                case 'output':
                case 'plug':
                    src = BLANK_PLUG_URL;
                    break;
            }

            return src;
        };

        var _getLengthURL = function() {
            var ref = CURRENT_CABLE.cable;

            var choice = ref.choice;

            var url;

            if( checked || !ref.code ) {
                url = _getEmptyURL('cable');
            } else {
                url = [
                    IMAGES_DIR,
                    'display/cable/',
                    CURRENT_CABLE.cableType.type, '/',
                    CURRENT_CABLE.length.type, '/',
                    formatTextForImageUrl(ref.manufacturer), '/',
                    formatTextForImageUrl(ref.model),
                    choice ? '.' + choice.color : '',
                    '.png'
                ].join('');
            }

            return url;
        };

        var _getCableURL = function(manufacturer, model, choice) {
            var url;

            if( !manufacturer || !model ) {
                url = _getEmptyURL('cable');

            } else {
                url = [
                    IMAGES_DIR,
                    'display/cable/',
                    CURRENT_CABLE.cableType.type, '/',
                    CURRENT_CABLE.length.type, '/',
                    formatTextForImageUrl(manufacturer), '/',
                    formatTextForImageUrl(model),
                    choice && choice.color ? '.' + choice.color : '',
                    '.png'
                ].join('');
            }

            return url;
        };

        var _getPlugURL = function(component, manufacturer, model, choice) {
            var url;

            if( !component || ! manufacturer || !model ) {
                url = _getEmptyURL('plug');

            } else {
                url = [
                    IMAGES_DIR,
                    'display/plug/',
                    CURRENT_CABLE.cableType.type, '/',
                    formatTextForImageUrl(manufacturer), '/',
                    formatTextForImageUrl(model),
                    choice && choice.color ? '.' + choice.color : '',
                    '.png'
                ].join('');
            }

            return url;
        };

        var _getBootURL = function(component, manufacturer, model, choice) {
            var url;

            if( !component || ! manufacturer || !model || !choice || !choice.boot ) {
                url = _getEmptyURL();

            } else {
                url = [
                    IMAGES_DIR,
                    'display/plug/',
                    CURRENT_CABLE.cableType.type, '/',
                    formatTextForImageUrl(manufacturer), '/',
                    formatTextForImageUrl(model.split('-')[0]), '/',
                    choice.boot,
                    '.png'
                ].join('');
            }

            return url;
        };

        return function(option) {
            var component, data, choice,
                cc = CURRENT_CABLE;

            if( option === 'reset' ) {
                cable.attr('src', _getEmptyURL('cable'));

                input.attr('src', _getEmptyURL('plug'));
                input_boot.attr('src', _getEmptyURL());

                output.attr('src', _getEmptyURL('plug'));
                output_boot.attr('src', _getEmptyURL());

                return;
            }

            if( option === 'all' ) {
                cable.attr('src',
                    _getCableURL(
                        cc.cable.manufacturer,
                        cc.cable.model,
                        cc.cable.choice
                    )
                );

                input.attr('src',
                    _getPlugURL('input',
                        cc.input.manufacturer,
                        cc.input.model,
                        cc.input.choice
                    )
                );
                input_boot.attr('src',
                    _getBootURL('input',
                        cc.input.manufacturer,
                        cc.input.model,
                        cc.input.choice
                    )
                );

                output.attr('src',
                    _getPlugURL('output',
                        cc.output.manufacturer,
                        cc.output.model,
                        cc.output.choice
                    )
                );
                output_boot.attr('src',
                    _getBootURL('output',
                        cc.output.manufacturer,
                        cc.output.model,
                        cc.output.choice
                    )
                );

                return;
            }

            data = option.data();
            component = data.component;
            choice = data.choice;

            if( component === 'length' ) {
                cable.attr('src', _getLengthURL());

            } else if( component === 'cable' ) {
                cable.attr('src',
                    _getCableURL(
                        data.manufacturer,
                        data.model,
                        choice
                    )
                );

            }  else if( component === 'input' ) {
                input.attr('src',
                    _getPlugURL('input',
                        data.manufacturer,
                        data.model,
                        choice
                    )
                );
                input_boot.attr('src',
                    _getBootURL('input',
                        data.manufacturer,
                        data.model,
                        choice
                    )
                );

            } else if( component === 'output' ) {
                output.attr('src',
                    _getPlugURL('output',
                        data.manufacturer,
                        data.model,
                        choice
                    )
                );
                output_boot.attr('src',
                    _getBootURL('output',
                        data.manufacturer,
                        data.model,
                        choice
                    )
                );
            }
        };
    })(),

    displayImages = {
        container: $('#display'),
        multiplier: 1,
        height: 0,
        width: 0,
        headerHeight: $('#header').height(),

        initialize: function() {
            var type = document.getElementById('body').getAttribute('data-current-length-type');

            this.update();
            this.draw[type](this);
        },

        update: function() {
            var w, h;

            w = $(this.container).width();
            h = $(this.container).height();

            this.width = w;
            this.height = h;
            this.multiplier = h > w ?
                w / DEFAULT_REGULAR_CABLE_WIDTH :
                h / DEFAULT_REGULAR_CABLE_HEIGHT;
        },

        draw: {
            regular: function(that) {
                var c = that.container,
                    i = c.find('.images'),
                    m = that.multiplier * 0.8,
                    hh = that.headerHeight,
                    h = that.height * 0.8,
                    w = that.width * 0.8;

                var _setOuterCss = function(l) {
                    i.css({
                        width: l,
                        height: l,
                        left: (c.width() - l) / 2,
                        top: hh + ((c.height() - l) / 8)
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

            patch: function(that) {
                var c = that.container,
                    i = c.find('.images'),
                    r = DEFAULT_PATCH_CABLE_HEIGHT / DEFAULT_PATCH_CABLE_WIDTH,
                    hh = that.headerHeight,
                    w = that.width * 0.5,
                    h = w * r;

                var m = w / DEFAULT_PATCH_CABLE_WIDTH;

                var _setOuterCss = function() {
                    i.css({
                        width: w,
                        height: w * r,
                        left: (c.width() - w) / 2,
                        top: hh + ((c.height() - h) / 8)
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
            }
        },

        resize: function() {
            var type = document.getElementById('body').getAttribute('data-current-length-type');

            this.update();
            this.draw[type](this);
        }
    },

    reset = (function() {
        var _r = {
            cc: function() {
                CURRENT_CABLE = new Cable();
                CURRENT_CABLE.id = 1;
            },

            length: function() {
                var article = $('article.length');

                article.find('.selects select').val('');
                article.find('.inputs input').val('');
                // article.find('.ruler').slider('value', 0);

                $('#body').attr('data-current-length-type', DEFAULT_CABLE_LENGTH_TYPE);
            },

            cable: function() {
                // changeDisplayImageURL('cable');

                var article = $('article.cable');

                article.find('.active').prop('checked', false);
                article.find('.selector').prop('checked', false);

                // clear details container
            },

            input: function() {
                // changeDisplayImageURL('input');

                var article = $('article.input');

                article.find('.active').prop('checked', false);
                article.find('.selector').prop('checked', false);

                // clear details container
            },

            output: function() {
                // changeDisplayImageURL('output');

                var article = $('article.output');

                article.find('.active').prop('checked', false);
                article.find('.selector').prop('checked', false);

                // clear details container
            },

            other: function() {
                var article = $('article.other');

                article.find('input').prop('checked', false);
                article.find('[data-option-type="quantity"] input').val(1);
            },

            steps: function() {
                var steps = $('.step-container .step', '#display');

                steps.removeAttr('data-component-status');
            },

            overview: function() {
                $('.cost span', '#header').text('0.00');

                $('.overview strong', '#body').text('');
            }
        };

        return function( component ) {
            if( !arguments.length ) return false;

            for( var i = 0; i < arguments.length; i++ ) {
                component = arguments[i];

                if( component === 'all' || typeof component === 'boolean' ) {
                    for( var j in _r ) {
                        if( _r.hasOwnProperty(j) && typeof _r[j] === 'function' ) {
                            _r[j]();
                        }
                    }
                    return true;

                } else {
                    if( typeof _r[component] === 'function' ) {
                        _r[component]();
                    }
                }
            }
        };
    })(),

    formatTextForImageUrl = function(str) {

        return str.replace(/ /g,'-').toLowerCase();
    },

    checkRestrictions = function() {
        var bool = true,
            skip = false,
            cc = CURRENT_CABLE.cable.code.toUpperCase(),
            ci = CURRENT_CABLE.input,
            co = CURRENT_CABLE.output,
            ref = J_RESTRICTIONS,
            disallow, allow, i;

        // If no selected cable or no plug selected, no checks required
        if( !cc || (!ci || !co) ) skip = true;

        // there are no restrictions for this cable code
        if( !ref[cc] ) skip = true;

        if( !skip ) {
            disallow = ref[cc].disallow;
            allow    = ref[cc].allow;

            var checks = [], check;
            if( ci.manufacturer && ci.model ) checks.push(ci);
            if( co.manufacturer && co.model ) checks.push(co);

            var bools = [];

            if( disallow ) {
                if( disallow === 'all' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        bools[i] = false;
                    }

                } else if( typeof disallow === 'object' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        bools[i] = true;
                        ref = disallow[checks[i].manufacturer];

                        if( ref && ref.series[checks[i].series] ) {
                            bools[i] = false;
                        }
                    }
                }
            }

            if( allow ) {
                if( allow === 'all' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        bools[i] = true;
                    }

                } else if( typeof allow === 'object' ) {
                    for( i = 0; i < checks.length; i++ ) {
                        check = checks[i];

                        ref = allow[check.manufacturer];

                        if( ref ) {
                            if( ref.series instanceof Array ) {
                                // todo

                            } else if( typeof ref.series === 'object' &&
                                ref.series[check.series] ) {
                                ref = ref.series[check.series];

                                if( ref instanceof Array ) {
                                    for( var j = 0; j < ref.length; j++ ) {
                                        if( ref[j] === check.boot ) {
                                            bools[i] = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if( bools.indexOf(false) > -1 ) bool = false;
        }

        $('#body').attr('data-restriction-techflex', bool);

        return bool;
    };

    var addToCart = function() {};

    var calculateCost = (function() {
        var total, prefix;

        var _cablePrice = function() {
            var ppf = +$('.option[data-option-code="' + prefix + CURRENT_CABLE.cable.code.toLowerCase() + '"]').data().price;

            var length_type = CURRENT_CABLE.length.type;

            if( length_type === 'regular' ) {
                total += ppf * +CURRENT_CABLE.length.amount;

            } else if( length_type === 'patch' ) {
                total += (ppf / 4) * (Math.floor((CURRENT_CABLE.length.amount - 1) / 3) + 1);
            }

        },  _inputPrice = function() {
            var option = $('.option[data-option-code="' + prefix + CURRENT_CABLE.input.code + '"]');

            total += +option.data().price;

        },  _outputPrice = function() {
            var option = $('.option[data-option-code="' + prefix + CURRENT_CABLE.output.code + '"]');

            total += +option.data().price;

        },  _otherPrice = function() {
            if( CURRENT_CABLE.other.techflex ) {
                var length_type = CURRENT_CABLE.length.type;

                if( length_type === 'regular' ) {
                    total += TECHFLEX_COST * CURRENT_CABLE.length.amount;

                } else if( length_type === 'patch' ) {
                    total += TECHFLEX_COST * (Math.floor((CURRENT_CABLE.length.amount - 1) /12) + 1);
                }
            }

            if( CURRENT_CABLE.other.tourproof ) {
                total += 3;
            }
        };

        return function() {
            total = 0;
            prefix = CURRENT_CABLE.cableType.prefix;

            if( CURRENT_CABLE.cable.code.length &&
                CURRENT_CABLE.length.amount ) { _cablePrice(); }

            if( CURRENT_CABLE.input.code.length ) { _inputPrice(); }

            if( CURRENT_CABLE.output.code.length ) { _outputPrice(); }

            _otherPrice();

            total = total.toFixed(2);

            return total;
        };
    })();

    var storage = {
        reNumber: function() {
            var i, max, val,
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

            create: function() {
                reset();
                var next = $('.build[data-storage-status="inactive"]:first'),
                    data = new Cable();

                data.storage = next.attr('data-storage-id');

                // set active to bypass checks in click handler
                next.attr('data-storage-status', 'active');

                next.data(data).trigger('click');

                $('.builder.selected .cable', '#builders').addClass('current').siblings().removeClass('current');
            },

            empty: function() {
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

            cart: function() {
                $('[data-step-value="confirm"]').trigger('click');
            }
        },

        construct: function() {
            var _block = function(i) {
                    var data, frame, build;

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
                        })

                        .find('.identifier .id')
                            .text(i)
                                .siblings('.price')
                                .text('0.00').end().end()

                        .find('button.set').click(function(e) {
                            build.set.call(build, e);
                            return false;
                        }).end()

                        .find('button.remove').click(function(e) {
                            build.remove.call(build, e);
                            return false;
                        }).end()

                        .click(function(e) {
                            build.load.call(build, e);
                        });

                    return frame;
                },

                skeleton = $('.storage.skeleton', '#skeletons').remove().removeClass('skeleton storage'),
                parent = $('.builds', '#storage');

            for( var i = 1; i <= TOTAL_STORAGE; i++ ) {
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

        /**
         * if the user has a build with a lower version than current, remove it
         */
        legacy: function() {
            var i, n, k, d, arr = [];

            for( i = 0, n = localStorage.length; i < n; i++ ) {
                k = localStorage.key(i);

                if( k.indexOf('build_') > -1 ) {
                    d = JSON.parse(localStorage.getItem(k));

                    if( !d.version || d.version !== CURRENT_VERSION ) {
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

            checkRestrictions();

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

            $('#details > input').prop('checked', false)

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

                if( data.other.techflex.length ) {
                    $('.pointer.techflex', '#display').attr('data-techflex-color', data.other.techflex);
                }

                if( data.cable.code === 'CSB_EVIA_MNRL') {
                    $('#body').attr('data-only-patch', 'true')
                }

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
                    displayImages.resize();
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
                    (input.name ? input.name +
                        (input.color ? ' | ' + input.color :
                            input.boot ? ' | ' + input.boot : '') :
                        '')
                );
                $info.find('.output').text(
                    (output.name ? output.name +
                        (output.color ? ' | ' + output.color :
                            output.boot ? ' | ' + output.boot : '') :
                        '')
                );
                $info.find('.other').text(
                    (other.tourproof ? 'Tourproof; ' : '') +
                    (other.techflex.length ? 'Techflex; ' : '') +
                    (other.reverse_plugs ? 'Reversed;' : '')
                );

                /**
                 * hide other options row if empty; else show
                 */
                if( !$info.find('.other').text().trim().length ) {
                    $info.find('.other').hide();
                } else {
                    $info.find('.other').show();
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

                $tracker.find('.dots').addClass('done');

                if( !CURRENT_CABLE.cable.code ) {
                    complete = false;
                    $tracker.find('.dot[data-pointer-component="cable"]').removeClass('done');
                }

                if( !CURRENT_CABLE.length.visited ) {
                    $tracker.find('.dot[data-pointer-component="length"]').removeClass('done');
                }

                if( !CURRENT_CABLE.input.manufacturer || !CURRENT_CABLE.input.model ) {
                    complete = false;
                    $tracker.find('.dot[data-pointer-component="input"]').removeClass('done');
                }

                if( !CURRENT_CABLE.output.manufacturer || !CURRENT_CABLE.output.model ) {
                    complete = false;
                    $tracker.find('.dot[data-pointer-component="output"]').removeClass('done');
                }

                if( !CURRENT_CABLE.other.visited ) {
                    $tracker.find('.dot[data-pointer-component="other"]').removeClass('done');
                }

                if( complete ) {
                    $storage.addClass('complete');
                } else {
                    $storage.removeClass('complete');
                }
            },

            builder = function() {
                var data = CURRENT_CABLE, a, b, c, d;

                $('.selector, .active').prop('checked', false);

                if( data.cable.code.length ) {
                    $('.cable .active', '#builders').prop('checked', true);
                    a = $('[data-option-id="' + data.cableType.prefix + data.cable.code.toLowerCase() + '"]');
                    b = data.cable.color;

                    if( b.length ) {
                        a.find('[data-choice-value="' + b + '"]').trigger('click');
                    }

                    a.find('.selector').prop('checked', true);
                }

                if( data.input.manufacturer && data.input.model ) {
                    $('.input .active', '#builders').prop('checked', true);
                    a = data.input;
                    b = data.input.color;
                    c = data.input.boot.toLowerCase().replace(/ /g, '-');
                    d = $('[data-option-side="input"][data-option-id="' + data.cableType.prefix + (a.manufacturer + '_' + a.model).toLowerCase() + '"]');

                    if( b.length || c.length ) {
                        d.find('[data-choice-value="' + ( b || c ) + '"]').trigger('click');
                    }

                    d.find('.selector').prop('checked', true);
                }

                if( data.output.manufacturer && data.output.model ) {
                    $('.output .active', '#builders').prop('checked', true);
                    a = data.output;
                    b = data.output.color;
                    c = data.output.boot.toLowerCase().replace(/ /g, '-');
                    d = $('[data-option-side="output"][data-option-id="' + data.cableType.prefix + (a.manufacturer + '_' + a.model).toLowerCase() + '"]');

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
                    c.name = data.name;

                } else if( data.component === 'plug' ) {
                    t = data.optionSide;
                    c = CURRENT_CABLE[t];

                    c.code = data.code;
                    c.manufacturer = data.manufacturer;
                    c.model = data.model;
                    c.name = data.name;
                    c.series = data.series;

                    if( data.boots ) {
                        c.boot = data.choice;
                        c.color = '';
                    } else {
                        c.boot = '';
                        c.color = data.choice || '';
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
                if( all )
                    updateAllVisual(data);
                else
                    configuration(data);
            };

        update.dispatch = dispatch;
        update.builder = builder;
    },

    build = {
        name: null,
        initial: false,
        structure: null,
        prefix: null,

        initialize: function(type) {
            this.type = type;
            this.name = J_CABLE_TYPES[type].name;
            this.prefix = J_CABLE_TYPES[type].prefix + '_';
            this.initial = J_CABLE_TYPES[type].default || false;

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
            var structure = $(document.getElementById(this.type));

            if( this.initial ) {
                structure.addClass('selected');
                structure.find('article').eq(1).addClass('current');

                DEFAULT_CABLETYPE_PREFIX = this.prefix;
                DEFAULT_CABLETYPE_TYPE = this.type;

                CURRENT_CABLE = new Cable();
                CURRENT_CABLE.id = 1;
            }

            this.structure = structure;
            $('#builders').append(structure);

            build.length();
            build.cables();
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
                    var colorObj = {}, color, i;

                    if( obj.option_category_id ) {
                        colorObj.category_id = obj.option_category_id;
                    }

                    for( i in obj ) {
                        if( obj.hasOwnProperty(i) ) {
                            color = obj[i];

                            if( !color ) {

                            } else {
                                if( color.default ) {
                                    default_color = i;
                                }

                                colorObj[i] = {
                                    'id': color.id ? color.id : null
                                };

                                colorObj[i].status = color.status || null;
                            }
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
                        list = document.createElement('ul'),
                        title = document.createElement('li'),
                        item, o;

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

                i,
                structure, info,
                code, model, manufacturer, price, id, lengths, specs, colors,
                attributes, data, default_color,
                name_model, name_manu,

                component = 'cable',

                prefix = this.prefix,
                premium = $('div.options.premium', this.structure),
                standard = $('div.options.standard', this.structure);

            for( i in J_CABLES ) {
                if( J_CABLES.hasOwnProperty(i) ) {
                    info = J_CABLES[i];

                    // variable initializations
                    code = '';
                    price = '';
                    model = '';
                    name_model = '';
                    name_manu  = '';
                    manufacturer = '';
                    attributes = {};
                    data = {};
                    default_color = '';

                    // variable definition
                    code = i;
                    price = info.price;
                    model = info.model;
                    manufacturer = info.manufacturer;
                    name_model = info.name.model;
                    name_manu  = info.name.manufacturer;

                    price = price && typeof price === 'number' ? price.toFixed(2) : price;

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

                    // Set element Flexbox Order style
                    if( info.order ) {
                        structure.css('order', info.order);
                    } else {
                        structure.css('order', '98');
                    }

                    if( info.status === 'unavailable' ) {
                        structure.attr('data-status', 'unavailable');
                        structure.css('order', '99');
                    }

                        // general
                    data.code = code;
                    data.component = component;
                    data.model = model;
                    data.manufacturer = manufacturer;
                    data.price = price;
                    data.name = name_manu + ' ' + name_model;

                    setSpecs.call(structure);
                    build.createChoicesOverlay(component, model, structure, colors);

                    /**
                     * Fill visible data fields
                     */
                    structure.find('input.selector').attr('name', prefix + component);
                    structure.find('.name span').text(name_manu).next().text(name_model);
                    structure.find('img.component').attr('src', getBuilderImageUrl.call(this));
                    structure.find('.price').text(price);

                    // Append attributes and data to element
                    structure.attr(attributes).data(data);

                    // Append element to document
                    if( info.is_premium ) {
                        premium.append(structure);
                    } else {
                        standard.append(structure);
                    }
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
                        block, type, self;

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
                            });

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

                _next = function() {
                    var block = document.createElement('div'),
                        button = document.createElement('button');

                    button.innerHTML = 'Confirm Length';

                    block.className = 'length-confirm';
                    block.appendChild(button);

                    return block;
                },

                selector, choices, rulers, inputs, types;
                // prefix = this.prefix


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
                    _input(),
                    _next()
                );
            }

            this.structure.find('li.length .options').prepend(_measuredBy);
        },

        plugs: function() {
            var getColorData = function(obj) {
                    var choices = {}, color, value, i,
                        l = 0;

                    for( i in obj ) {
                        if( obj.hasOwnProperty(i) ) {
                            l++;
                            color = obj[i];
                            value = i;

                            if( color.default ) {
                                default_color = value;
                            }

                            choices[value] = {
                                'input_option_id': color.input_option_id,
                                'output_option_id': color.output_option_id
                            };

                            if( color.primary && color.secondary ) {
                                choices[value].primary = color.primary;
                                choices[value].secondary = color.secondary;
                            }

                            if( color.status === 'unavailable' ) {
                                choices[value].status = 'unavailable';
                            }
                        }
                    }

                    return choices;
                },

                getBootData = function(obj) {
                    var choices = {}, choice, value,
                        type = 'boot', c;

                    for( c in obj ) {
                        if( obj.hasOwnProperty(c) ) {
                            choice = obj[c];
                            value = c;

                            if( choice.default ) {
                                default_boot = value;
                            }

                            choices[value] = {
                                'input_option_id': choice.input_option_id,
                                'output_option_id': choice.output_option_id
                            };

                            if( choice.status && choice.status === 'unavailable' ) {
                                choices[value].status = 'unavailable';
                            }
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

                i, j, m,
                structure, info,
                angle, manufacturer, model, price, id, series,
                attributes, data,
                colors, default_color, boots, default_boot, code,
                input_category_id, output_category_id, side,
                name, name_model, name_manu,

                component = 'plug',
                sides = ['input', 'output'],

                prefix = this.prefix,
                right, straight,
                json_plugs = J_PLUGS[this.type],
                json_boots = J_PLUGS.boots;

            for( i = 0, m = sides.length; i < m; i++ ) {
                input_category_id = json_plugs.input_option_category_id;
                output_category_id = json_plugs.output_option_category_id;
                side = sides[i];

                right = $('.' + side + ' div.outer.right', this.structure);
                straight = $('.' + side + ' div.outer.straight', this.structure);

                for( j in json_plugs ) {
                    if( json_plugs.hasOwnProperty(j) ) {
                        if( j === 'input_option_category_id' || j === 'output_option_category_id' ) continue;

                        info = json_plugs[j];

                        code = '';
                        angle = '';
                        manufacturer = '';
                        model = '';
                        series = '';
                        price = '';
                        id = '';
                        colors = null;
                        boots = null;
                        attributes = {};
                        data = {};
                        name = '';
                        name_model = '';
                        name_manu  = '';

                        default_color = '';
                        default_boot = '';

                        structure = this.skeletons.block();

                        code = j;
                        angle = info.angle;
                        manufacturer = info.manufacturer;
                        model = info.model;
                        series = info.series;
                        price = info.price;
                        name_model = info.name.model;
                        name_manu  = info.name.manufacturer;
                        name = name_manu + ' ' + name_model;

                        id = (prefix + manufacturer + '_' + model).toLowerCase().replace(/ /g, '-');

                        attributes['data-option-id'] = id;
                        attributes['data-option-side'] = side;
                        attributes['data-option-type'] = component;

                        if( info.has_boots ) {
                            boots = getBootData(json_boots[manufacturer][series].boot);
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

                        // Set element Flexbox Order style
                        if( info.order ) {
                            structure.css('order', info.order);
                        } else {
                            structure.css('order', '98');
                        }

                        // If option is out of stock, push to the end of the list
                        if( info.status === 'unavailable' ) {
                            structure.attr('data-status', 'unavailable');
                            structure.css('order', '99');
                        }

                            // general
                        data.component = component;
                        data.model = model;
                        data.manufacturer = manufacturer;
                        data.name = name;
                        data.price = price;
                        data.code = code;
                        data.series = series;

                        setInfo.call(structure, this.type);

                        /**
                         * Fill visible data fields
                         */
                        structure.find('input.selector').attr('name', prefix + side);
                        structure.find('.name span').text(name_manu).next().text(name_model);
                        structure.find('img.component').attr('src', getBuilderImageUrl.call(this, 'component'));
                        structure.find('.price').text(price);

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
            }
        },

        other: function() {
            var _techflex = function() {
                    var data = J_OTHER.techflex.colors,
                        colors = data.color,
                        title = document.createElement('h3'),
                        description = document.createElement('p'),
                        cost = document.createElement('span'),
                        option = document.createElement('div'),
                        i, l, choice, input, span, label,
                        color, id;

                    cost.innerHTML = '+0.25/ft';
                    cost.className = 'cost';

                    description.innerHTML = 'Add an extra layer of protection to your cable.';
                    title.innerHTML = 'Techflex';
                    title.appendChild(cost);
                    title.appendChild(description);
                    option.appendChild(title);

                    for( i in data ) {
                        if( data.hasOwnProperty(i) ) {
                            color = i;
                            id = data[i].id;

                            if( data[i].status === 'unavailable' ) continue;

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
                    }

                    option.className = 'option';
                    option.setAttribute('data-option-type', 'techflex');

                    return option;
                },
                _tourproof = function() {
                    var title = document.createElement('h3'),
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
                    var title = document.createElement('h3'),
                        description = document.createElement('p'),
                        option = document.createElement('div'),
                        choice = document.createElement('div'),
                        input = document.createElement('input'),
                        label = document.createElement('label');

                    description.innerHTML = 'Reverse the orientation of a right<br />angle plug on your patch cable.';
                    title.innerHTML = 'Reverse Plug';
                    title.appendChild(description);
                    option.appendChild(title);

                    input.id = prefix + 'reverse_plugs';
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
                    var title = document.createElement('h3'),
                        options = document.createElement('div'),
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
                prefix = this.prefix;

            container.append(
                _techflex(),
                _tourproof(),
                _reversed_plugs(),
                _quantity()
            );
        },

        createChoicesOverlay: function(component, model, structure, colors, boots) {
            var o, current, div, color,
                container = structure.find('div.choices');

            model = model.toLowerCase();

            if( component === 'plug' ) {
                model = model.split('-')[0];
            }

            container.attr({
                'data-choice-model': model,
                'data-choice-component': component
            });

            if( component === 'cable' ) {
                container.attr('data-choice-component', 'color');

                for( o in colors ) {
                    if( colors.hasOwnProperty(o) ) {
                        if( o === 'category_id' ) continue;

                        color = colors[o];
                        if( !color.id ) continue;

                        div = $('<div/>')
                                .attr('data-choice-value', o)
                                .data('id', color.id);

                        if( color.status === 'unavailable' ) {
                            div.attr('data-status', 'unavailable');
                        }

                        container.append(div);
                    }
                }

            } else if( component === 'plug' ) {
                if( colors && Object.keys(colors).length ) {
                    container.attr('data-choice-component', 'color');

                    for( o in colors ) {
                        if( colors.hasOwnProperty(o) ) {
                            current = colors[o];

                            div = $('<div/>').attr('data-choice-value', o).data({
                                input_option_id: current.input_option_id,
                                output_option_id: current.output_option_id
                            });

                            // assume current must have primary and secondary because of AND statement to assign these values
                            if( current.primary ) {
                                div.attr({
                                    'data-choice-primary': current.primary,
                                    'data-choice-secondary': current.secondary
                                });
                            }

                            if( current.status === 'unavailable' ) {
                                div.attr('data-status', 'unavailable');
                            }

                            container.append(div);
                        }
                    }
                }

                if( boots && Object.keys(boots).length ) {
                    container.attr('data-choice-component', 'boot');

                    for( o in boots ) {
                        if( boots.hasOwnProperty(o) ) {
                            current = boots[o];

                            o = o.replace(/ /g, '-');

                            div = $('<div/>')
                                .attr('data-choice-value', o)
                                .data({
                                    input_option_id: current.input_option_id,
                                    output_option_id: current.output_option_id
                                });

                            if( current.status === 'unavailable' ) {
                                div.attr('data-status', 'unavailable');
                            }

                            container.append(div);
                        }
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
                                            if( c === 'category_id' || c === 'option_category_id') continue;

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
                    var outer, inner,
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
                        var side = '';
                        if( e.delegateTarget.getAttribute('data-option-component') === 'plug' ) {
                            side = '[data-option-side="' + $('li.current', '#builders').attr('data-builder-component') + '"]';
                        }
                        $('.option' + side + '[data-option-id="' + $(e.delegateTarget).attr('data-option-id') + '"] [data-choice-value="' + $(e.target).attr('data-choice-value') + '"]', '#builders').click();
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

                    var availability = self.attr('data-status') === 'unavailable' ? 'unavailable' : 'availabile';
                    option.attr('data-choice-status', availability);
                    if( self.attr('data-status') === 'unavailable' ) {
                        return false;
                    }


                    option.data().choice = new_val;

                    if( selected ) {
                        update.dispatch(option.data());
                    }

                    if( !checkRestrictions() ) {
                        $('[data-option-type="techflex"] .choice input').prop('checked', false);
                        var techflex = {};

                        techflex.type = 'techflex';
                        techflex.value = '';

                        $('.pointer.techflex', '#display').attr('data-techflex-color', '');

                        changeOtherOption.update(techflex);
                    }

                    return false;
                },

                /**
                 * Switch between option choices (plugs/cables)
                 */
                changeOption = function(e) {
                    // If user clicks "Pick" button in details panel, click representative option to reset function
                    if( $(e.delegateTarget).attr('id') === 'details' ) {
                        var side = '';
                        if( e.delegateTarget.getAttribute('data-option-component') === 'plug' ) {
                            side = '[data-option-side="' + $('li.current', '#builders').attr('data-builder-component') + '"]';
                        }
                        $('.option' + side + '[data-option-id="' + $(e.delegateTarget).attr('data-option-id') + '"] button.select', '#builders').click();
                        return false;
                    }

                    // if the option is out of stock, break
                    if( $(e.delegateTarget).attr('data-status') === 'unavailable' ) {
                        return false;
                    }

                    // declare local variables
                    var option = $(e.delegateTarget),
                        active = option.parents('li').find('input.active'),
                        input = option.children('input.selector'),
                        value = !input.prop('checked'),
                        data = option.clone(true).data();

                    // if option restricts cable length type to patch, click patch image to trigger changes
                    // TODO - move this to restrictions
                    if( option.attr('data-option-only-patch') ) {
                        $('#body').attr('data-only-patch', true);
                        $('.choice[data-length-type="patch"] img').trigger('click');
                    } else {
                        $('#body').attr('data-only-patch', false);
                    }

                    input.prop('checked', value);
                    active.prop('checked', value);

                    $('.select', '#details').attr('data-option-selected', value);

                    toggleSpecs(e);

                    if( !value ) {
                        for( var i in data ) {
                            if( data.hasOwnProperty(i) ) {
                                if( i === 'component' || i === 'optionSide' ) continue;

                                data[i] = '';
                            }
                        }
                    }

                    update.dispatch(data);

                    if( !checkRestrictions() ) {
                        $('[data-option-type="techflex"] .choice input').prop('checked', false);
                        var techflex = {};

                        techflex.type = 'techflex';
                        techflex.value = '';

                        $('.pointer.techflex', '#display').attr('data-techflex-color', '');

                        changeOtherOption.update(techflex);
                    }
                },

                changeOtherOption = {
                    techflex: function(e) {
                        e.preventDefault();

                        var input, checked, data = {}, value;

                        input = $(e.target).siblings('input');
                        checked = input.prop('checked');
                        value = !checked ? input.val() : '';

                        var bool = checkRestrictions();
                        if( !bool ) {
                            checked = true;
                            value = '';
                        }

                        input.prop('checked', !checked);

                        data.type = 'techflex';
                        data.value = value;

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
                        image, price, specs, choice, choices, manu, model,
                        spec, availability, selected;

                    image = option.find('img.component').attr('src');
                    choice = option.find('img.choice').attr('src');
                    choices = option.find('.choices').clone(true);
                    manu  = data.manufacturer;
                    model = data.model;
                    price = data.price;
                    specs = data.specs;
                    selected = option.find('.selector').prop('checked');

                    availability = option.attr('data-status') === 'unavailable' ? 'unavailable' : 'availabile';
                    details.attr('data-status', availability);

                    availability = option.attr('data-choice-status') === 'unavailable' ? 'unavailable' : 'availabile';
                    details.attr('data-choice-status', availability);

                    details.attr({
                        'data-option-id': option.attr('data-option-id'),
                        'data-option-component': data.component
                    });

                    details.find('.wrap').attr('data-measurement-toggle', 'false');

                    details.find('input[type="checkbox"]').prop('checked', true);
                    details.find('img.component').attr('src', image);
                    details.find('img.choice').attr('src', (choice ? choice : BLANK_IMAGE_URL));
                    details.find('.choices').replaceWith(choices);
                    details.find('.name span').text(manu).next().text(model);
                    details.find('.price').text(price);

                    details.find('.select').attr('data-option-selected', selected ? 'true' : 'false');

                    if( choices.children().length ) {
                        details.find('.choices').show();
                    } else {
                        details.find('.choices').hide();
                    }

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

                /**
                 * Toggle different filter options
                 */
                changeFilters = function(e) {
                    e.preventDefault();
                    var self, filters, filterContainer, isChecked, component, options, active, checked, numChecked, hasChecked,
                        visibleOptions = function() {
                            var visibles = ['visible', 'block'];

                            if( visibles.indexOf( $(this).attr('data-filter-status') ) > -1 ) return true;

                            return false;
                        },
                        filteredVisibleOptions = function() {
                            var visibles = ['visible', 'block', 'filtered'];

                            if( visibles.indexOf( $(this).attr('data-filter-status') ) > -1 ) return true;

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

                                var colors = $(this).data().colors, c;

                                for( c in colors ) {
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
                        };

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
                                .filter(filteredVisibleOptions)
                                .each(filter.color);

                        } else if( type === 'manufacturer' ) {
                            options
                                .filter(visibleOptions)
                                .filter(filter.manufacturer)
                                .attr('data-filter-status', 'hidden');
                        }
                    }

                    component.find('.outer').each(function() {
                        if( !$(this).find('.option').filter(visibleOptions).length )
                            $(this).attr('data-filter-empty', 'true');
                        else
                            $(this).attr('data-filter-empty', 'false');
                    });

                    if( !options.filter(visibleOptions).length )
                        component.find('div.options').attr('data-filter-empty', 'true');
                    else
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

                /**
                 * Open/Close filter containers
                 */
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

                    $('#details > input').prop('checked', false);

                    $(e.delegateTarget).removeClass('current');
                    target.addClass('current');

                    // start scroll at top
                    target.find('.options').slimScroll({'scrollTo': 0});

                    if( component === 'length' || component === 'other' ) {
                        CURRENT_CABLE[component].visited = true;
                        $('[data-pointer-component="' + component + '"]').addClass('done');

                        // force update to storage
                        $('.build[data-storage-status="current"] button.set', '#storage').trigger('click');
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
            details.on('click', '.wrap', toggleMeasurements);

            options.on('click', changeOption);
            options.on('click', '.choices div', changeChoice);

            options.on('click', '.specs', toggleSpecs);

            builders.find('li.other .option').on('click', 'label', changeOtherOption.dispatch);
            builders.find('li.other .option').on('keyup', 'input', changeOtherOption.quantity);

            builders.find('li.length .choice').on('click', 'img', changeLength.type);
            builders.find('li.length .input').on('keyup', 'input', changeLength.input);
            builders.find('li.length').on('slide', '.ruler', function(e, ui) {
                var length, unit, type;

                unit = $(e.target).attr('data-length-unit');
                type = $(e.target).attr('data-length-type');
                length = ui.value;

                $('.input[data-length-type="' + type + '"] input').val(length);

                changeLength.slider(length, type, unit);
            });
            builders.find('.length-confirm button').on('click', function() {
                $('.length .next').trigger('click');
            });

            if( TOUCH ) {
                options.on('touchstart', toggleSpecs);
            }
        }
    },

    cobj = function(obj) {
        console.log(JSON.stringify(obj, null, 4));
    },

    clog = function(msg) {
        console.log(msg);
    },

    buildScrolls = function() {

    };

    var showIntro = function() {
        $('#content').attr('data-active-section', 'introduction');

        $('.outer', '#introduction').on('click', function() {
            scrollToSection('production');

            $('.step-container .step:first').trigger('click');
        });
    };

    var init = function() {
        $('.builder.selected').attr('data-active-component', 'length');
        $('#content').attr('data-active-section', 'production');

        document.getElementById('body').setAttribute('data-current-length-type', DEFAULT_CABLE_LENGTH_TYPE);

        displayImages.initialize();
        changeDisplayImageURL('reset');

        buildScrolls();
        update();

        handles.declarations();

        reset(true);
        // storage.recall();

        if( isMobile.any() && isMobile.any().length ) {
            $zopim.livechat.hideAll();
        }

        // Fade out loader at a speed of 100-500ms
        setTimeout(function() {
            $('.loader').fadeOut('fast');
        }, Math.floor(Math.random() * (500 - 100 + 1)) + 100);
    };

    $(function() {
        $.getJSON( JSON_URL )
            .done(function( response ) {
                OPTIONS_JSON   = response.data;
                J_CABLE_TYPES  = OPTIONS_JSON.cableTypes;
                J_CABLES       = OPTIONS_JSON.cables;
                J_PLUGS        = OPTIONS_JSON.plugs;
                J_OTHER        = OPTIONS_JSON.other;
                J_RESTRICTIONS = OPTIONS_JSON.restrictions;

                for( var type in J_CABLE_TYPES ) {
                    if( J_CABLE_TYPES.hasOwnProperty(type) ) {
                        build.initialize(type);
                    }
                }

                init();
            })
            .fail(function( jqXHR, textStatus, errorThrown ) {
                alert("ERROR CS01: Initialization JSON file not found.");
                console.error(jqXHR);
                console.error(textStatus);
                console.error(errorThrown);
            });
    });

})(jQuery);

// FastClick.attach(document.body);
