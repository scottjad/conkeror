/**
 * (C) Copyright 2007-2008 Jeremy Maitin-Shepard
 * (C) Copyright 2008-2010 John J. Foerch
 *
 * Use, modification, and distribution are subject to the terms specified in the
 * COPYING file.
**/

in_module(null);

define_input_mode("quote_next", "quote_next_keymap",
    $display_name = "input:QUOTE(next)",
    $doc = "This input mode sends the next key combo to the buffer, "+
        "bypassing Conkeror's normal key handling.  The mode disengages "+
        "after one key combo.");


define_buffer_mode('quote_mode',
    $display_name = 'QUOTE',
    $enable = function (buffer) {
        buffer.override_keymaps([quote_keymap]);
    },
    $disable = function (buffer) {
        buffer.override_keymaps();
    },
    $doc = "This mode sends all key combos to the buffer, "+
        "bypassing normal key handling, until the escape "+
        "key is pressed.");


interactive("quote-mode-disable",
    "Disable quote-mode.",
    function (I) {
        quote_mode(I.buffer, false);
        I.buffer.set_input_mode();
    });


provide("quote");
