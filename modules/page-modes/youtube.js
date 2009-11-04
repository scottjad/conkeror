/**
 * (C) Copyright 2008 Jeremy Maitin-Shepard
 * (C) Copyright 2009 John J. Foerch
 *
 * Use, modification, and distribution are subject to the terms specified in the
 * COPYING file.
**/

require("content-buffer.js");
require("media.js");

let media_youtube_content_key_regexp = /"t": "([^"]+)"/;
let media_youtube_content_title_regexp = /<meta name="title" content="([^"]+)">/;

define_variable('youtube_formats', ['hd', 'hq', 'standard'],
    "A list of quality levels for the youtube video scraper to try. "+
    "Each quality level is denoted as a string.  The valid qualities "+
    "are 'hd' (high def), 'hq' (high quality), and 'standard'.  The "+
    "order of the tokens in this list will be reflected in the order "+
    "of the completions list, if it is necessary to prompt from among "+
    "the available qualities.");

function media_scrape_youtube_document_text (source_frame, code, text, results) {
    var title_match = media_youtube_content_title_regexp.exec(text);
    var title = null;
    if (!title_match)
        return;
    var res = media_youtube_content_key_regexp.exec(text);
    if (!res)
        return;
    youtube_formats.map(function (quality) {
        var fmt = '';
        if (quality == 'hd') {
            if (!(/'IS_HD_AVAILABLE': true/.test(text)))
                return;
            fmt = '&fmt=22';
        } else if (quality == 'hq') {
            fmt = '&fmt=18';
        }
        results.push(load_spec({
            uri: 'http://youtube.com/get_video?video_id='+
                 code + '&t=' + res[1] + fmt,
            suggest_filename_from_uri: false,
            title: decodeURIComponent(title_match[1]),
            filename_extension: "flv",
            source_frame: buffer.top_frame,
            mime_type: "video/x-flv",
            description: quality
        }));
    });
}

function media_scrape_youtube (buffer, results) {
    try {
        var uri = buffer.current_uri.spec;
        var result = media_youtube_uri_test_regexp.exec(uri);
        if (!result)
            return;
        let text = buffer.document.documentElement.innerHTML;
        let code = result[1];
        media_scrape_youtube_document_text(buffer.top_frame, code, text, results);
    } catch (e if !(e instanceof interactive_error)) {}
}

define_page_mode("youtube_mode",
    $display_name = "YouTube",
    $enable = function (buffer) {
        buffer.page.local.media_scrapers = [media_scrape_youtube];
        media_setup_local_object_classes(buffer);
    });

function media_scrape_embedded_youtube(buffer, results) {
    const embedded_youtube_regexp = /^http:\/\/[a-zA-Z0-9\-.]+\.youtube\.com\/v\/(.*)$/;

    for (let frame in frame_iterator(buffer.top_frame, buffer.focused_frame)) {
        // Look for embedded YouTube videos
        let obj_els = frame.document.getElementsByTagName("object");
        for (let i = 0; i < obj_els.length; ++i) {
            let obj_el = obj_els[i];
            let param_els = obj_el.getElementsByTagName("param");
            inner:
            for (let j = 0; j < param_els.length; ++j) {
                let param_el = param_els[j];
                let match;
                if (param_el.getAttribute("name").toLowerCase() == "movie" &&
                    (match = embedded_youtube_regexp.exec(param_el.getAttribute("value"))) != null) {

                    try {
                        let code = match[1];
                        let lspec = load_spec({uri: "http://youtube.com/watch?v=" + code});
                        var result =
                            yield buffer.window.minibuffer.wait_for(
                                "Requesting " + lspec.uri + "...",
                                send_http_request(lspec));
                        let text = result.responseText;
                        if (text != null && text.length > 0)
                            media_scrape_youtube_document_text(frame, code, text, results);
                    } catch (e if (e instanceof abort)) {
                        // Still allow other media scrapers to try even if the user aborted an http request,
                        // but don't continue looking for embedded youtube videos.
                        return;
                    } catch (e) {
                        // Some other error here means there was some problem with the request.
                        // We'll just ignore it.
                    }
                    break inner;
                }
            }
        }
    }
}


// Use the embedded youtube scraper by default
media_scrapers.unshift(media_scrape_embedded_youtube);

let media_youtube_uri_test_regexp = build_url_regex($domain = /(?:[a-z]+\.)?youtube/,
                                                    $path = /watch\?v=([A-Za-z0-9\-_]+)/);
auto_mode_list.push([media_youtube_uri_test_regexp, youtube_mode]);
