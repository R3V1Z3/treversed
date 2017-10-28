var transforms = {
    'scale': 1, 'translateX': '0px', 'translateY': '0px',
    'perspective': '400px', 'rotateX': '0deg', 'rotateY': '0deg', 'scaleZ': '1',
    'rotateZ': '0deg', 'translateZ': '0px'
};

var $t; // will hold container where transforms are made

jQuery(document).ready(function () {

    // attach the plugin to an element
    $('#wrapper').gitdown({
        'title': 'TreversED',
        'content': 'README.md',
        'merge_gists': true,
        'callback': main
    });
    var $gd = $('#wrapper').data('gitdown');
    var eid = '#wrapper';
    var eid_inner = eid + ' .inner';

    function main() {
        $t = $('.inner').addClass('inner no-transition');
        position_sections();
        configure_sections();
        notize();
        register_events();
        render_connections();
        update_transform(transforms);

        // center on header section by clicking it
        var $c = $(eid + ' .info .toc a.current');
        $c.removeClass('current').click().addClass('current');
    }

    function update_transform(t) {

        // ensure viewport doesn't go outside bounds
        var x = parseFloat(t['translateX']);
        var y = parseFloat(t['translateY']);
        // todo: these values are affected by scale
        // account for scaling
        var scale = parseFloat(t['translateZ']) / 100;

        t['translateX'] = x + 'px';
        t['translateY'] = y + 'px';

        var str = '';
        for (key in t) {
            str += `${key}(${t[key]}) `;
        }
        $t.css('transform', str);
        return t;
    }

    // t = true when rendering transforms
    function render_values() {
        $f = $(`.info .collapsible.perspective .field.slider`);
        $f.each(function () {
            var $i = $(this).find('input');
            var name = $i.attr('name');
            var value = $i.val();
            var suffix = $i.attr('data-suffix');
            if (suffix === undefined) suffix = '';
            f += `${name}(${value}${suffix}) `;
        });
        $(eid_inner + ' .section.current').css('transform', f);
    }

    function position_sections() {

        // start by adding some padding around .inner
        var w = $('.inner').width();
        var h = $('.inner').height();

        if (!$gd.loaded) {
            $('.inner').width(w + w / 2);
            $('.inner').height(h + h / 2);
        }

        var docwidth = $('.inner').width();
        var $sections = $('.section *');
        if ($sections.length > 0) {
            // find attributes and position section
            $sections.children().each(function () {
                var comments = $(this).getComments();
                if (comments.length > 0) {
                    // comment found, extract attributes
                    var text = comments[0];
                    var s = text.substr(text.indexOf("{") + 1).split('}')[0];
                    var pairs = s.split(',');
                    for (var i = 0; i < pairs.length; i++) {
                        var key = pairs[i].split(':')[0];
                        var value = pairs[i].split(':')[1];
                        if (key === 'left') {
                            value = parseFloat(value) + w / 2;
                        } else if (key === 'top') {
                            value = parseFloat(value) + h / 2;
                        } else if (key === 'transform') {
                            // special case, we'll add a data-transform attr
                            $(this).closest('.section').css('transform', value);
                            $(this).closest('.section').attr('data-transform', value);
                        }
                        $(this).closest('.section').css(key, value);
                    }
                }
            });
        }

        // now position elements that don't have position comments
        var counter = 0;
        var left = w / 8;
        var top = h / 8;
        var padding = 20;
        var row_height = 0;
        $('.section').each(function () {
            var position = $(this).position();

            // calculate and update section height
            var height = $(this).find('.handle-heading').height();
            height += $(this).find('.content').height();
            $(this).height(height + padding);

            // row_height will be the height of the tallest section in the current row
            if (height > row_height) {
                row_height = height;
            }

            if (position.top === 0 && position.left === 0) {
                // set default values for section positions
                if (counter > 0) {
                    var prev_width = $(this).prev('.section').width() + padding;
                    // increment height if width of document is surpassed
                    if (left > docwidth - (prev_width * 2)) {
                        left = w / 8;
                        top += row_height + padding;
                        row_height = 0;
                    } else {
                        left += prev_width;
                    }
                }
                $(this).css({ top: top, left: left });
                counter += 1;
            }
        });
    }

    function configure_sections() {
        $('.section').each(function () {

            var $s = $(this);
            $s.addClass('no-transition draggable');

            // set initial position values
            var x = $s.css('left').slice(0, -2);
            var y = $s.css('top').slice(0, -2);
            $s.attr('data-x', x);
            $s.attr('data-y', y);
        });
    }

    function notize() {
        $('.section').each(function () {
            var $s = $(this);
            var name = $s.find('a.handle').attr('name');
            // check if any anchor links reference this setion and add respective classes if so
            $(".content a[href^=#]").each(function () {
                var $link = $(this);
                var href = $link.attr('href').substr(1);
                if (href === name) {
                    // this is a note, so set boolean for later
                    var classes = ' note note-' + href;
                    $s.addClass(classes);
                    // add note class to anchor link too
                    $link.addClass('n-' + href);
                    $link.addClass('n-reference');
                    $link.closest('.section').addClass('reference');
                }
            });
        });
    }

    function render_connections() {
        if ($('connection').length > 0) {
            $('.n-reference').connections('remove');
        }
        $('.section .content .n-reference').each(function () {
            var classes = $(this).attr('class');
            // get note's referent
            var to = classes.split('n-reference')[0].trim();
            to = to.substr(2);
            $(this).connections({ to: '.note-' + to });
        });
    }

    function open_export() {

        // open new window
        var xWindow = window.open('export');
        var content = '<pre>';
        var newline = '\n'; //'<br/>';

        // iterate over all sections to get content
        $('.section').each(function () {

            // get content
            content += toMarkdown($(this).html());

            //get section attributes
            var attr = '';
            var px = 'px';
            attr += 'left:' + $(this).position().left + px;
            attr += ',top:' + $(this).position().top + px;
            attr += ',width:' + $(this).width() + px;
            attr += ',height:' + $(this).height() + px;

            content += newline + newline;
            content += '&lt;!-- {' + attr + '} -->';
            content += newline + newline;
        });
        content += newline + '</pre>';
        xWindow.document.write(content.replace(/\n\n/g, '<br/>'));
    }

    function render_editor(id) {
        // remove any existing editors first
        $('.editor').remove();

        var $s = $('.section#' + id);
        var left = $s.position().left;
        var top = $s.position().top;
        var width = $s.width();
        var height = $s.height();
        var content = toMarkdown($s.find('.content').html());

        var html = '<div class="editor" data-section="' + id + '">';
        html += '<pre class="md">';
        html += content;
        html += '</pre>';
        html += '<textarea class="editor-content" />';
        html += '</div>';
        $('.inner').append(html);
        var $editor = $('.editor');
        //$editor.width( width );
        $editor.css({
            top: top, left: left + width + 50,
            width: width, height: height
        });
        $('.editor-content').val($('.md').text());

        // event handler for editor content changes
        $('.editor-content').on('keyup change', function () {
            content = $('.editor-content').val();
            var container = '.section#' + id + ' .content';
            $gd.render(content, container);
            notize();
            render_connections();
        });

        // hide the editor if anything else is clicked
        $('.inner').on('click', function (e) {
            // if (e.target !== this) return;
            if ($(e.target).closest(".section").length === 0) {
                if ($(e.target).closest(".editor").length === 0) {
                    $('.editor').remove();
                }
            }
        });

        $('.editor .md').remove();

    }

    function transform_focus(element) {
        var t = '';

        var e = document.getElementById(element);
        var x = e.offsetLeft;
        var y = e.offsetTop;
        var w = e.offsetWidth;
        var h = e.offsetHeight;

        var maxwidth = window.innerWidth;
        var maxheight = window.innerHeight;

        // center viewport on section
        var translateX = x - (maxwidth / 2) + w / 2;
        var translateY = y - (maxheight / 2) + h / 2;

        transforms['translateX'] = -translateX + 'px';
        transforms['translateY'] = -translateY + 'px';

        update_transform(transforms);
    }

    function create_section(x, y) {
        var name = 'New Section';
        name = unique_name(name);
        var html = default_section_html(name);
        $('.inner').append(html);
        $s = $('#' + $gd.clean(name));
        $s.css({ "top": y + 'px', "left": x + 'px' });
        $s.css({ "width": '200px', "height": '100px' });
        $s.attr('data-x', x).attr('data-y', y);
        $s.find('.content').click(function () {
            var content = '';
            var id = $(this).parent().attr('id');
            render_editor(id);
        });
        var s = $gd.get_sections();
        s.push(name);
        $gd.set_sections(s);
        $gd.update_toc();
        toc_click($gd.clean(name));
    }

    function unique_name(prefix) {
        var x = 1;
        do {
            var n = prefix + ' ' + x;
            // check if id already exists
            if ($('#' + $gd.clean(n)).length === 0) {
                return n;
            }
            x++;
        }
        while (x < 200);
    }

    function default_section_html(name) {
        var id = $gd.clean(name);
        var html = '<div class="section heading draggable no-transition" id="' + id + '">';
        html += '<h2 class="handle-heading">';
        html += '<a class="handle" name="' + id + '">' + name + '</a>'
        html += '</h2>';
        html += '<div class="content">';
        html += '<p>New content</p>';
        html += '</div>'; // .content
        html += '</div>'; // .section
        return html;
    }

    function toc_click(id) {
        $(eid + ` .info .toc a[href=${id}]`).click();
    }

    function activate_section(id) {
        var $s = $(eid_inner + ` .section#${id}`);
        // only act if section exists
        if ($s.length > 0) {
            // remove .current class from active section
            $('.section.current').removeClass('current');
            // remove current toc link
            $(eid + ' .info .toc a.current').removeClass('current');
            $s.addClass('current');
            $(eid + ` .info .toc a[href=#${id}]`).addClass('current');
        }
    }

    function register_events() {

        // click handler for local links, incuding toc links
        $('a[href^=#]').click(function (e) {
            var id = this.getAttribute('href').substr(1);
            activate_section(id);
            transform_focus(id);
            render_connections();
        });

        // make section current if it's clicked
        $(eid + ' .section').click(function () {
            var id = $(this).attr('id');
            activate_section(id);
        });

        // open editor on content click
        $('.content').click(function () {
            var id = $(this).parent().attr('id');
            render_editor(id);
            transform_focus(id);
            render_connections();
        });

        // Key events
        $(document).keyup(function (e) {
            if (e.which == 88) {
                // x for export
                open_export();
            }
        });

        // highlight referenced section on reference hover
        $('.n-reference').mouseenter(function () {
            var href = $(this).attr('href');
            //$(href).css( 'filter', 'invert(100%)' );
        });
        $('.n-reference').mouseleave(function () {
            var href = $(this).attr('href');
            //$(href).css( 'filter', 'invert(0%)' );
        });

        // target elements with the "draggable" class
        interact('.draggable').allowFrom('.handle-heading')
            .draggable({
                // enable inertial throwing
                inertia: false,
                // keep the element within the area of it's parent
                restrict: {
                    restriction: 'self',
                    endOnly: true,
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
                },
                // enable autoScroll
                autoScroll: true,

                // call this function on every dragmove event
                onmove: dragMoveListener,
                // call this function on every dragend event
                onend: function (event) {
                }
            });

        // target elements with the "draggable" class
        interact('.inner').draggable({
            // enable inertial throwing
            inertia: false,

            // enable autoScroll
            autoScroll: true,

            // call this function on every dragmove event
            onmove: dragMoveListener

        });

        // make sections resizable
        interact('.section').resizable({
            preserveAspectRatio: false,
            edges: { left: true, right: true, bottom: true, top: true }
        })
            .on('resizemove', function (event) {
                var target = event.target,
                    x = (parseFloat(target.getAttribute('data-x')) || 0),
                    y = (parseFloat(target.getAttribute('data-y')) || 0);

                // update the element's style
                target.style.width = event.rect.width + 'px';
                target.style.height = event.rect.height + 'px';

                // translate when resizing from top or left edges
                x += event.deltaRect.left;
                y += event.deltaRect.top;

                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);

                // check if editor is open for this section
                var id = target.getAttribute('id');
                // todo
                var $editor = $(eid + ' .editor');
                if ( $editor.length > 0 ) {
                    var editor_id = $editor.attr('data-section');
                    if ( editor_id === id ) {
                        $editor.width( event.rect.width );
                        $editor.height( event.rect.height );
                        $editor.css('left', x + event.rect.width + 50 );
                        $editor.css('top', y );
                    }
                }

                render_connections();
            });

        interact('.inner')
            .on('tap', function (event) {
                //event.preventDefault();
            })
            .on('doubletap', function (event) {
                // create new section
                event.preventDefault();
                create_section(event.pageX, event.pageY);
            })
            .on('hold', function (event) {
                // event.clientX
            });

        // mousewheel zoom handler
        $('.inner').on('wheel', function (event) {
            event.preventDefault();
            if (this !== event.target) return;
            var scale = parseFloat(transforms['translateZ']);
            if (event.originalEvent.deltaY < 0) {
                scale += 10;
            } else {
                scale -= 10;
            }
            if (scale < -500) {
                scale = -500;
            }
            var x = event.originalEvent.offsetX;
            var y = event.originalEvent.offsetY;
            $('.inner').css('transform-origin', `${x}px ${y}px`);
            transforms['translateZ'] = scale + 'px';
            update_transform(transforms);
            render_connections();
        });
    }

    // drag handler
    function dragMoveListener(event) {
        var target = event.target;
        var $target = $(target);

        // keep the dragged position in the data-x/data-y attributes
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        if ($target.hasClass('inner')) {
            var tx = parseFloat(transforms['translateX']);
            var ty = parseFloat(transforms['translateY']);
            tx += event.dx;
            ty += event.dy;
            transforms['translateX'] = tx + 'px';
            transforms['translateY'] = ty + 'px';
            update_transform(transforms);
        } else {
            $target.css('top', y + 'px');
            $target.css('left', x + 'px');

            // update the position attributes
            $target.attr('data-x', x);
            $target.attr('data-y', y);
        }
        render_connections();
    }

});
