// Live Stylesheet Editing
// (c) Copyright 2010-2011, Christopher Jeffrey (//github.com/chjj)
// See LICENSE for more info.
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

// ========= DONT EDIT BELOW HERE ========= //
var TAB_CHARACTERS;
if (USE_SPACES) {
  TAB_CHARACTERS = Array(TAB_SIZE + 1).join(' ');
} else {
  TAB_CHARACTERS = '\t';
}

var doc = this.document, root = doc.documentElement;

var _unminify = function(text) {
  //return (/}[^\s]/.test(text)) ? (text
  return (!/[\r\n]/.test(text)) ? (text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/([^\s};])(})/g, '$1 $2')
    .replace(/(})([^\s])/g, '$1\n$2')
    .replace(/(\w)({)/g, '$1 $2')
    .replace(/({)(\w)/g, '$1 $2')
    .replace(/([;:,])([^\s])/g, '$1 $2')
    
    // pretty print
    .replace(/([;{])[\x20\t]*(\w)/g, '$1\n\t$2')
    .replace(/([\w;])[\x20\t]*(})/g, '$1\n$2')
  ) : text;
};

var getTextContent = function(el) {
  if (el && el.textContent) {
    var text = el.textContent;
    if (UNMINIFY) {
      text = _unminify(text);
    }
    if (USE_SPACES) {
      text = text.replace(/\t/g, TAB_CHARACTERS);
    }
    return text;
  }
};

var keyCheck = function(func) {
  return function(e) { 
    if (e.keyCode === KEY_CODE) {
      func();
      e.preventDefault();
    }
  }
};

var reqCheck = function(name, func) {
  return function(req) { if (name in req) func(); }
};

var load = function(func) {
  var styles = {}, current;
  
  // ========= CREATE THE CHROME ========= //
  
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
    }, false);
    return el;
  })();
  
  // select box for the list of stylesheets
  var select = (function() {
    var el = doc.createElement('select');
    bar.appendChild(el);
    el.addEventListener('change', function() {
      current = el.value;
      if (styles[current]) {
        edit.value = getTextContent(styles[current]);
      }
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
  
  // =========== LOAD STYLESHEETS ============ //
  (function load(done) {  
    var elements = Array.prototype.slice.call(doc.querySelectorAll(
      'link[rel="stylesheet"], style'
    )), cur = elements.length;
    
    // get the stylesheets through XHR, add STYLE elements in place of LINKs
    elements.forEach(function(style, i) {
      var name = (style.href 
        ? ((style.title && !styles[style.title])
          ? style.title 
          : style.href) 
        : 'style[' + i + ']'
      ).slice(0, 40);
      if (!current) current = name;
      if (style.href) {
        chrome.extension.sendRequest({get: style.href}, function(res) {
          var err = res.err, css = res.text;
          if (err) {
            console.log('ERROR:', err);
            css = '/* Unable to load ' 
              + (style.href || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              + ' */';
          }
          // need to fix relative url()'s in the stylesheet 
          // by prefixing them with the link's @href
          css = (css
            .replace(/(@import\s+)(["'].+?["'])([^;]*;)/gi, '$1url($2)$3')
            .replace(/url\(([^)]+)\)/gi, function($0, $1) {
              
              // trim quotes and space
              $1 = $1.replace(/^['"]\s*|\s*['"]$/g, ''); 
              
              // absolute uri - return as normal
              if (/^(\/|\w+?:)/.test($1)) return $0; 
              
              // does it have a trailing slash?
              return /\/$/.test(style.href)
                ? 'url("' + style.href + $1 + '")'
                : 'url("' + style.href.replace(/[^\/]+$/, '') + $1 + '")';
            })
          ); 
          styles[name] = doc.createElement('style');
          if (style.media) { 
            styles[name].media = style.media;
          }
          styles[name].textContent = css;
          style.parentNode.replaceChild(styles[name], style);
          if (name === current) {
            edit.value = getTextContent(styles[name]);
          }
          --cur || done();
        });
      } else {
        styles[name] = style;
        if (name === current) {
          edit.value = getTextContent(style);
        }
        --cur || done();
      }
      select.innerHTML += '<option value="' + name + '">' + name + '</option>';
    });
  })(function() {
    // ========= BIND EVENTS ========= //
    var update, scroll = 0;
    
    // toggle the frame in and out
    var _toggle = function() {
      if (frame.style.display !== 'block') {
        frame.style.display = 'block';
      } else {
        frame.style.display = 'none';
        if (styles[current]) {
          styles[current].textContent = edit.value;
        }
      }
    };
    
    frame.contentDocument.addEventListener('keydown', keyCheck(_toggle), false);
    
    // update the stylesheet every key stroke
    edit.addEventListener('keyup', function(ev) {
      if (!styles[current] || ev.keyCode === KEY_CODE) return;
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
      } else {
        scroll = edit.scrollTop;
      }
    }, false);
    
    edit.addEventListener('click', function() {
      scroll = edit.scrollTop;
    }, false);
    
    // execute the callback
    return func(_toggle);
  });
};

// toggle the frame whenever the F9 key 
// is pressed or whenever the icon is clicked
(function() {
  var _toggle;
  
  // we need this for lazy loading
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