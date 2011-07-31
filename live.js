/**
 * Live Stylesheets (https://github.com/chjj/Live-Stylesheets)
 * Live CSS Editing for Google Chrome.
 * Copyright (c) 2010-2011, Christopher Jeffrey. (MIT Licensed)
 */

(function() {
// the "toggle" key code - default is F9
var KEY_CODE = 120;

// the number of spaces in a tab
var TAB_SIZE = 8;

// whether to use spaces for tabs or not
var USE_SPACES = false;

// the amount of time to wait after a key
// stroke before updating the page's CSS
var UPDATE_TIME = 300;

// detect whether the CSS is minfied and attempt
// to unminify and pretty print it - EXPERIMENTAL
var UNMINIFY = false;

/**
 * Don't edit below here <--
 */

var TAB_CHARACTERS;
if (USE_SPACES) {
  TAB_CHARACTERS = Array(TAB_SIZE + 1).join(' ');
} else {
  TAB_CHARACTERS = '\t';
}

var window = this 
  , doc = this.document
  , root = doc.documentElement
  , slice = [].slice;

/**
 * Helpers
 */

var unminify = function(text) {
  return !/[\r\n]/.test(text) ? (text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/([^\s};])(})/g, '$1 $2')
    .replace(/(})([^\s])/g, '$1\n$2')
    .replace(/(\w)({)/g, '$1 $2')
    .replace(/({)(\w)/g, '$1 $2')
    .replace(/([;:,])([^\s])/g, '$1 $2')

    // pretty print
    .replace(/([;{])[ \t]*(\w)/g, '$1\n\t$2')
    .replace(/([\w;])[ \t]*(})/g, '$1\n$2')
  ) : text;
};

var getTextContent = function(el) {
  if (el && el.textContent != null) {
    var text = el.textContent;
    if (UNMINIFY) {
      text = unminify(text);
    }
    if (USE_SPACES) {
      text = text.replace(/\t/g, TAB_CHARACTERS);
    }
    return text;
  }
};

var keyCheck = function(func) {
  return function(ev) {
    if (ev.keyCode === KEY_CODE) {
      func();
      ev.preventDefault();
    }
  };
};

var reqCheck = function(name, func) {
  return function(req) {
    if (req[name] !== undefined) func();
  };
};

/**
 * Initialization
 */

var load = function(func) {
  var styles = {}
    , current
    , total = 0;

  /**
   * Helpers
   */

  var setCurrent = function(name, change) {
    current = name;
    if (styles[name]) {
      edit.value = getTextContent(styles[name]);
      edit.focus();
      edit.setSelectionRange(0, 0);
      if (change && select.options[name]) { // could remove this `if`
        select.options.selectedIndex = select.options[name].index;
      }
    }
  };

  var addStyle = function(name, el) {
    styles[name] = el;
    select.innerHTML +=
      '<option id="' + name + '" value="' + name + '">'
        + name + '</option>';
  };

  /**
   * Create the Chrome
   */

  // need to wrap everything in an iframe so the
  // elements are not affected by the page's stylesheet
  var frame = (function() {
    var link, el = doc.createElement('iframe');
    // "unselectable" id
    el.id = 'LIVE.STYLESHEETS';
    // append it to HTML to avoid
    // interfere with "body > :last-child"
    root.appendChild(el);
    link = el.contentDocument.createElement('link');
    link.href = chrome.extension.getURL('design/iframe.css');
    link.rel = 'stylesheet';
    el.contentDocument.head.appendChild(link);
    return el;
  })();

  // options bar that sits on top of the edit box
  var bar = (function() {
    var el = doc.createElement('div');
    frame.contentDocument.body.appendChild(el);
    return el;
  })();

  // the stylesheet edit text box
  var edit = (function() {
    var el = doc.createElement('textarea');
    el.setAttribute('spellcheck', 'false');
    if (TAB_SIZE) el.style.tabSize = TAB_SIZE;
    frame.contentDocument.body.appendChild(el);
    return el;
  })();

  // button to swap the edit box's position
  // in case it is covering part of the page
  var swap = (function() {
    var el = doc.createElement('button');
    el.textContent = 'Switch';
    bar.appendChild(el);
    el.addEventListener('click', function() {
      if (frame.style.top !== '0px') {
        frame.style.top = '0px';
        frame.style.bottom = 'auto';
      } else {
        frame.style.top = 'auto';
        frame.style.bottom = '0px';
      }
      edit.focus();
    }, false);
    return el;
  })();

  // select box for the list of stylesheets
  var select = (function() {
    var el = doc.createElement('select');
    bar.appendChild(el);
    el.addEventListener('change', function() {
      setCurrent(el.value);
    }, false);
    return el;
  })();

  // add a new stylesheet, needs cleaning
  var add = (function() {
    var el = doc.createElement('button');
    el.textContent = 'Add';
    bar.appendChild(el);
    el.addEventListener('click', function() {
      var name = 'style[' + total + ']';
      var style = doc.createElement('style');
      doc.head.appendChild(style);
      style.textContent = '/* Stylesheet: ' + total + ' */\n';
      addStyle(name, style);
      setCurrent(name, true);
      total++;
    }, false);
    return el;
  })();

  // a stylesheet with animations is really annoying to
  // edit - the animations will play every key stroke
  // this adds a "no animations" checkbox to temporarily
  // disable animations
  var check = (function() {
    var label, el = doc.createElement('input');
    el.type = 'checkbox';
    label = doc.createElement('label');
    label.textContent = 'No Animations';
    label.title = 'Animations can be very annoying when you\'re '
                  + 'editing stylesheets, click here to turn them off.';
    label.appendChild(el);
    bar.appendChild(label);
    el.addEventListener('change', function() {
      if (!root.hasAttribute('data-ls-na')) {
        root.setAttribute('data-ls-na', '');
      } else {
        root.removeAttribute('data-ls-na');
      }
    }, false);
    return el;
  })();

  /**
   * Bind Events
   */

  var update
    , scroll = 0;

  // toggle the frame in and out
  var toggle = function() {
    if (frame.style.display !== 'block') {
      frame.style.display = 'block';
      edit.focus();
    } else {
      frame.style.display = 'none';
      if (styles[current]) {
        styles[current].textContent = edit.value;
      }
    }
  };

  frame.contentDocument.addEventListener('keydown', keyCheck(toggle), false);

  // update the stylesheet every key stroke
  edit.addEventListener('keyup', function(ev) {
    if (!styles[current] 
        || ev.keyCode === KEY_CODE) return;
    if (UPDATE_TIME) {
      if (update) {
        clearTimeout(update);
        update = null;
      }
      update = setTimeout(function() {
        styles[current].textContent = edit.value;
        update = null;
      }, UPDATE_TIME);
    } else {
      styles[current].textContent = edit.value;
    }
  }, false);

  // a hacksy way to get tab working as it should
  edit.addEventListener('keydown', function(ev) {
    if (+ev.keyCode === 9) {
      var start = edit.selectionStart, cur = edit.value;
      edit.value = cur.slice(0, start) + TAB_CHARACTERS + cur.slice(start);
      start += TAB_CHARACTERS.length;
      edit.setSelectionRange(start, start);
      edit.scrollTop = scroll;
      ev.preventDefault();
      ev.stopPropagation();
    }
    scroll = edit.scrollTop;
  }, false);

  edit.addEventListener('click', function() {
    scroll = edit.scrollTop;
  }, false);

  /**
   * Load
   */

  (function(done) {
    var el = doc.querySelectorAll('link[rel="stylesheet"], style')
      , pending = el.length;

    if (!pending) {
      var style = doc.createElement('style');
      style.textContent = '/* No stylesheet found. */';
      doc.head.appendChild(style);
      el = [ style ];
      pending++;
    }

    // get the stylesheets through XHR,
    // add STYLE elements in place of LINKs
    slice.call(el).forEach(function(el) {
      var name = el.href
        , style;

      if (name) {
        name = name.replace(/^[^:\/]+:\/\/[^\/]+/, '');
      } else {
        name = el.title;
      }
      if (!name || styles[name]) {
        name = 'style[' + (total++) + ']';
      }
      name = name.slice(0, 40);

      // STYLE elements
      if (!el.href) {
        addStyle(name, el);
        return --pending || done();
      }

      style = doc.createElement('style');
      addStyle(name, style);

      chrome.extension.sendRequest({get: el.href}, function(res) {
        var err = res.err
          , css = res.text;

        if (err) {
          console.error('Request Error:', err);
          css = '/* Unable to load '
            + (el.href || '').replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;')
            + ' */';
        }

        // turn @import "foo"; into @import url("foo");
        css = css.replace(
          /(@import\s+)(["'][^'"]+["'])([^\n;]*;)/gi,
          '$1url($2)$3'
        );

        // need to fix url()'s in the stylesheet
        // by prefixing them with the LINK's @href
        css = css.replace(/url\(([^)]+)\)/gi, function(str, url) {
          // trim quotes and space
          url = url.trim().replace(/^['"]|['"]$/g, '');

          // absolute url - return as normal
          if (/^([^:\/]+:|\/\/)/.test(url)) return str;

          if (url[0] !== '/') {
            // resolve new relative path
            return 'url("'
              + el.href.replace(/\/[^\/]*$/g, '')
              + '/' + url + '")';
          } else {
            // resolve to absolute url, hosts might be different
            // make sure `el.href` is a fully resolved url first
            var cap = el.href.match(/^(?:[^:\/]+:)?\/\/[^\/]+/);
            if (cap) {
              return 'url("' + cap[0] + url + '")';
            } else {
              return str;
            }
          }
        });

        style.textContent = css;
        if (el.media) style.media = el.media;

        el.parentNode.replaceChild(style, el);
        --pending || done();
      });
    });
  })(function() {
    // ensure the first 
    // stylesheet is selected
    setCurrent(select.options[0].id);

    // execute the callback
    return func(toggle);
  });
};

/**
 * Toggle
 */

(function() {
  var _toggle;

  // lazy loading
  var toggle = function() {
    if (!_toggle) {
      load(function(func) {
        _toggle = func;
        toggle();
      });
    } else {
      _toggle();
    }
  };

  chrome.extension.onRequest.addListener(reqCheck('toggle', toggle));
  doc.addEventListener('keydown', keyCheck(toggle), false);
})();

}).call(this);