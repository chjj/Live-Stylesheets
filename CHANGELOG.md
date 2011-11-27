# Live Stylesheets - Changelog

## v0.19

- Added "Prettify" button
- Remove auto-prettify option

## v0.18

- Added "Add" button.
- Fixed frame on pages with no styles.
- Changed focusing behavior.
- Fixed @imported url's from different domains.

## v0.17

- Fixed minor things.

## v0.16

### Cleaned up a lot of code. Technical stuff:

The UI's CSS is now stored externally - should improve performance.
The stylesheet loading function now uses a parallel asynchronous loop.

### Live stylesheets now loads lazily.

This means the elements wont be pre-loaded on every page. This should
generally improve performance when browsing with live stylesheets enabled,
however toggling the live stylesheets frame for the first time on a page may
seem a fraction of a second slower.

### Added options:

- KEY_CODE: The keyCode for the toggle key. Default is 120 (F9).
- TAB_SIZE: The number of spaces a tab should be. Default is 8.
- USE_SPACES: Use spaces in place of tabs. Default is false.
- UPDATE_TIME: The amount of time to wait after a key stroke before
               updating the CSS. Default is 300 (ms).
- UNMINIFY: Detect whether the stylesheet is minfied. Attempt
            to unminify and pretty print it. Default is false. (EXPERIMENTAL)

You can set these at the top of the `live.js` file. Although I may add a more
formal options page eventually, I like to keep things simple.

## v0.15

- Fixed a problem with @imported stylesheets.

## v0.1x

- ...

(c) Copyright 2010-2011, Christopher Jeffrey (http://dilated.cc/)
