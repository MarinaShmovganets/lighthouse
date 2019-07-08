# UIStrings Syntax

## ICU Syntax

### Ordinals

### Selects (Gender)

### Primitive Formatting

This include number formatting like `{timeInMs, number, milliseconds}` and
string replacements like `{some_name}`.

## message.json Syntax

### Why we use message.json

It is the
[Chrome Standard](https://developer.chrome.com/extensions/i18n-messages) for
i18n messages.

### Parts of a message.json message

(From the Chrome Docs)

```json
{
  "name": {
    "message": "Message text, with optional placeholders.",
    "description": "Translator-aimed description of the message.",
    "placeholders": {
      "placeholder_name": {
        "content": "A string to be placed within the message.",
        "example": "Translator-aimed example of the placeholder string."
      },
    }
  }
}
```

## Our message system

We use UIStrings & i18n.js to extract strings from individual js files into
locale.json files. This allows us to keep strings close to the code in which
they are used so that developers can easily understand their context. It also
comes with its own syntax.

UIStrings are defined in a simple Object with properties defining the strings.

*   simple string named "title", with no description:

    ```javascript
    const UIStrings = {
      title: 'Minify CSS',
    };
    ```

*   simple string, with a description above property as a comment:

    ```javascript
    const UIStrings = {
      /** Imperative title of a Lighthouse audit that ... */
      title: 'Minify CSS',
    };
    ```

### Markdown

Strings can also contain some limited markdown, that will be rendered in the
report.

*   Code block.

    To format some text as code it should be contained in `backticks`. These
    should be used whenever code is non-translatable. Such as HTML tags or
    snippets of code. Also note that there is no escape character for using
    backticks as part of the string, so ONLY use backticks to define code
    blocks.

    Example usage:

    ```javascript
    const UIStrings = {
      title: 'Document has a `<title>` element',
    };
    ```

*   Link.

    To convert a section of text into a link to another URL, enclose the text
    itself in [brackets] and then immediately include a link after it in
    (parenthesis). Note that `[link text] (https://...)` is NOT VALID because of
    the space and will not be converted to a link.

    Example usage:

    ```javascript
    const UIStrings = {
      description: 'The value of ... [Learn More](https://google.com/)',
    };
    ```

### ICU Replacement Syntax

ICU syntax is used throughout Lighthouse strings, and they are specified
directly in UIStrings. They follow 1 of 3 flavors.

*   Direct replacement

    This is simply a direct replacement of text into a string. Often used for
    Proper Nouns, code, or other text that is dynamic and added at runtime, but
    requires no additional formatting.

    Example usage:

    ```javascript
    const UIStrings = {
        didntCollectScreenshots: `Chrome didn't .... ({errorCode})`,
    };
    ```

    ICU replacements can also use a JSDoc type syntax to specify an example for
    direct ICU replacements.

    *   To specify the description, use

        `@description <description>`

    *   To specify an example for an ICU replacement, use

        `@example {<ICU variable name>} <example for ICU replacement>`

    ```javascript
    const UIStrings = {
        /**
         * @description Error message explaining ...
         * @example {errorCode} NO_SPEEDLINE_FRAMES
         */
        didntCollectScreenshots: `Chrome didn't .... ({errorCode})`,
    };
    ```

*   Complex replacement

    When more complex numerical ICU replacement is needed the syntax is mostly
    the same as direct replacement. This is often used when replcaing times, or
    percentages.

    Note: these complex ICU formats are automatically given example values based
    on their ICU format as specified in `collect-strings.js`

    ```javascript
    const UIStrings = {
        displayValueText: 'Interactive at {timeInMs, number, seconds} s',
    };
    ```

TODO(exterkamp): explain all the comments and where they go/what they become.

TODO(exterkamp): explain why we can't use some ICU like number formatting.

### The pipeline

The translation pipeline has 2 distinct stages, the collection and translation
is done pre-compile time, and the replacement is done at runtime.

#### Translation Pipeline (pre-compile)

1.  `file_with_UIStrings.js` this is where strings start. Optimized for
    programmer ease of use and not for machine parsing. Uses ICU syntax and
    markdown control characters inline.

2.  `yarn i18n:collect-strings` collects all UIStrings, and generates the
    pre-locales. Does some parsing to make sure that common mistakes are
    avoided.

3.  `pre-locale/en-US.json` this is the well formatted _machine parsable_
    fileset that is uploaded to be translated, i.e. they use $placeholder$
    syntax instead of ICU. These will never be used by the internal i18n system,
    they are solely used to send to translators.

4.  `yarn i18n:correct-strings` collects all pre-locales (or returned .json
    files of all languages if you're a Googler importing strings) and converts
    them back to Lighthouse json format and puts them into `locales/`.

5.  `locales/{locale}.json` the Lighthouse json files. Used by the i18n.js
    system to i18n strings. Uses ICU and not $placeholder$ syntax. Optimized for
    i18n machine use.

This pipeline is best seen with its component yarn commands:

```shell
# collect UIStrings into pre-locales
$ yarn i18n:collect-strings

# make the final en-US and en-XL files
$ yarn i18n:correct-strings

# Send off to translators, and the i18n:correct-strings again
# once those .json's are done.
$ sh google_import_script_that_calls_correct_strings
```

#### String Replacement Pipeline (runtime)

`file_with_UIStrings.js -> exported to locale.json file -> read by i18n.js ->
$placeholder$'s replaced -> {ICU} syntax replaced => final string`

1.  String called in `.js` file, converted to i18n id.

2.  i18n id in lookup table along with backup message.

3.  Message is looked up via `replaceIcuMessageInstanceIds` &
    `_formatIcuMessage`.

TODO(exterkamp): Simple example

##### Simple example, no ICU:

1.  string in `file_with_UIStrings.js`

    ```javascript
    // Declare UIStrings
    const UIStrings = {
      /** Description of a Lighthouse audit that tells the user ...*/
      description: 'Minifying CSS files can reduce network payload sizes. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/minify-css).',
    };

    // i18n init
    const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

    // String called with i18n
    // Will become id like "lighthouse-core/audits/byte-efficiency/unminified-css.js | description"
    let description = str_(UIStrings.description);
    ```

2.  i18n lookup map registered the string (i18n.js)

    ```javascript
    const _icuMessageInstanceMap = new Map();

    // example value in _icuMessageInstanceMap
    'lighthouse-core/audits/byte-efficiency/unminified-css.js | description': {
      icuMessageId: 'lighthouse-core/audits/byte-efficiency/unminified-css.js | description'
      icuMessage: 'Minifying CSS files can reduce network payload sizes. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/minify-css).'
    }
    ```

3.  Lookup in `i18n.js`. `_formatIcuMessage` will attempt to lookup in this
    order:

    1.  `locales/{locale}.json` The best result, the string is found in the
        target locale, and should appear correct.

    2.  `locales/en.json` _Okay_ result. The string was not found in the target
        locale, but was in `en`, so show the English string.

    3.  The fallback message passed to `_formatIcuMessage`. This lookup is
        subtley different than the en lookup. A string that is provided in the
        UIStrings, but not en may be part of a swap-locale that is using an old
        deprecated string, so would need to be populated by UIString replacement
        here instead.

    4.  Throw `_ICUMsgNotFoundMsg` Error. This is preferrable to showing the
        user some id control lookup like
        "lighthouse-core/audits/byte-efficiency/unminified-css.js | description"

    This is also the point at which ICU is replaced by values. So this...

    ```javascript
    message = "Total size was {totalBytes, number, bytes} KB"
    sent_values = {totalBytes: 10.75}
    ```

    Becomes...

    ```javascript
    message = "Total size was 10 KB"
    ```
