# UIStrings Syntax

## ICU Syntax

More about [complex ICU](http://userguide.icu-project.org/formatparse/messages) formatting.

### Ordinals (Numeric Selects)

An ordinal ICU message is used when the message contains "plurals", wherein a sub-message would need to be selected from a list of messages depending on the value of `itemCount` (in this example).  They are a flavor of "Selects" that have a unique syntax.

```javascript
displayValue: `{itemCount, plural,
  =1 {1 link found}
  other {# links found}
  }`,
```

### Primitive Formatting

This include number formatting like `{timeInMs, number, milliseconds}` and string replacements like `{some_name}`.

Note: In the context of Lighthouse we make the distinction between these kinds of ICU formatting.  

* `{timeInMs, number, milliseconds}` is called "Complex ICU" since the replacement is for complex numbers and uses the custom formatters in Lighthouse. The supported complex ICU formats are: milliseconds, seconds, bytes, percent, and extendedPercent.

* `{some_name}` is called "Direct ICU" since the replacement is a direct substitution of ICU with a variable and uses no custom formatting.

### Selects

A select ICU message is used when the message should select a sub-message based on the value of a variable `pronoun` in this case. This is often used for gender based selections, but can be used for any enum.  Lighthouse does not use selects very often.

```javascript
displayValue: `{pronoun, select,
  male {He programmed the link.}
  female {She programmed the link.}
  other {They programmed the link}
  }`,
```

## message.json Syntax (CTC)

### Why we use message.json

We needed a JS-friendly format supported by Google's Translation Console (TC). The [Chrome extension & Chrome app i18n format](https://developer.chrome.com/extensions/i18n-messages) checks those boxes. 

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

### Why do we call it CTC?

CTC is a name that is distinct and identifies this as the Chrome translation format.  "message.json" is ambiguous in our opinion and so throughout the docs we will refer to files that follow the "message.json" format as being "CTC" files.

## Our message system (LHL)

TODO(exterkamp): explain all the comments and where they go/what they become.

TODO(exterkamp): explain why we can't use some ICU like number formatting.

TODO(exterkamp): example of plural and ordinal.

We use UIStrings & i18n.js to extract strings from individual js files into locale.json files. This allows us to keep strings close to the code in which they are used so that developers can easily understand their context. It also comes with its own syntax.

UIStrings are defined in an Object with the strings as its properties. JSDoc is used to provide additional information about each string.

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

Some strings, like audit descriptions, can also contain a subset of markdown. See [`audit.d.ts`](https://github.com/GoogleChrome/lighthouse/blob/5e52dcca72b35943d14cc7c27613517c425250b9/types/audit.d.ts) for which properties support markdown rendering and will be rendered in the report.

*   Inline code block.

    To format some text as code it should be contained in `backticks`. Any text within the backticks will not be translated. This should be used whenever code is non-translatable. Such as HTML tags or snippets of code. Also note that there is no escape character for using backticks as part of the string, so ONLY use backticks to define code blocks.

    Example usage:

    ```javascript
    const UIStrings = {
      title: 'Document has a `<title>` element',
    };
    ```

*   Link.

    To convert a section of text into a link to another URL, enclose the text itself in [brackets] and then immediately include a link after it in (parentheses). Note that `[link text] (https://...)` is NOT VALID because of the space and will not be converted to a link.

    Example usage:

    ```javascript
    const UIStrings = {
      description: 'The value of ... [Learn More](https://google.com/)',
    };
    ```

### ICU Replacement Syntax

ICU syntax is used throughout Lighthouse strings, and they are specified directly in UIStrings. They follow 1 of 2 flavors.

*   Direct replacement

    This is simply a direct replacement of text into a string. Often used for proper nouns, code, or other text that is dynamic and added at runtime, but requires no additional formatting.

    ICU replacements must use a JSDoc type syntax to specify an example for direct ICU replacements.

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

    When more complex numerical ICU replacement is needed the syntax is mostly the same as direct replacement. This is often used when replcaing times, or percentages.

    Note: these complex ICU formats are automatically given example values based on their ICU format as specified in `collect-strings.js`.  Therefore a normal description string can be used.

    ```javascript
    const UIStrings = {
        /** Description of display value. */
        displayValueText: 'Interactive at {timeInMs, number, seconds} s',
    };
    ```

### Why do we call it LHL?

LHL is a name that is distinct and identifies this as the LightHouse Locale format. Since both LHL and CTC use `.json` files it is ambiguous, so LHL is the given name for UIString and locale/ formatted json files that are used by the underlying Lighthouse i18n engine.

### The pipeline

The translation pipeline has 2 distinct stages, the collection and translation is done at build time, and the replacement is done at runtime.

#### Translation Pipeline (build time)

To a typical developer the pipeline looks like this:

* LH contributor makes any changes to strings. They run yarn i18n, They can now use the en-XL locale to verify things work as intended.

* Googler is ready to kick off the TC pipeline again. They run yarn i18n and then on the google-side: import-source-from-github.sh, submit CL. Wait ~two weeks...
  
  * They run export-tc-dump-to-github.sh, and opens a LH PR.


Paul Irish's ASCII explanation:

```
 Source files:                                         Locale files:
+---------------------------+                         +----------------------------------------------
|                           ++                        | lighthouse-core/lib/i18n/locales/en-US.json |
| const UIStrings = { ... };|-+                 +---> | lighthouse-core/lib/i18n/locales/en-XL.json |
|                           |-|                 |     +----------------------------------------------+
+-----------------------------|                 |     |                                             ||
 +----------------------------|                 |     | lighthouse-core/lib/i18n/locales/*.json     |-<+
  +---------------------------+                 |     |                                             || |
                           |                    |     +----------------------------------------------| |
                           |                    |      +---------------------------------------------+ |
              $ yarn i18n  +--------------------+                                                      |
                           |                                                                           |
                           v                          ▐                       ▐    +---------------+   |
              +------------+------+                   ▐   Google TC Pipeline  ▐ +->|  *.ctc.json   |---+
              |  en-US.ctc.json   |  +--------------> ▐      (~2 weeks)       ▐    +---------------+
              +-------------------+  $ g3/import….sh  ▐                       ▐ $ g3/export….sh
```

LH Contirbutor commands:

```shell
# collect UIStrings and bake the en-US & en-XL locales
$ yarn i18n

# Test to see that the new translations are valid and apply to all strings
$ node lighthouse-cli https://example.com/ --view --locale=en-XL
```

i18n'ing Googler commands:

```shell
# collect UIStrings and bake the en-US & en-XL locales
# (to make sure everything is up to date)
$ yarn i18n

# Extract the CTC format files to translation console
$ sh google_export_script.sh

# Wait ~2 weeks for translations

# Import the CTC format files to locales/ and bake them
$ sh google_import_script.sh
```

Note: Why do `en-US` and `en-XL` get baked early?  We write all our strings in `en-US` by default, so they do not need to be translated, so it can be immediately baked without going to the translators.  Similarly, `en-XL` is a debugging language, it is an automated version of `en-US` that simply adds markers to `en` strings in order to make it obvious that something has or hasn't been translated.  So neither of these files need to go to translators to be used, and both can be used at develop-time to help developer i18n workflow.


#### String Replacement Pipeline (runtime)

1.  String called in `.js` file, converted to i18n id.

2.  i18n id in lookup table along with backup message.

3.  Message is looked up via `replaceIcuMessageInstanceIds` &
    `getFormatted`.

##### Example:

1.  string in `file_with_UIStrings.js`

    ```javascript
    // Declare UIStrings
    const UIStrings = {
      /** Description of a Lighthouse audit that tells the user ...*/
      message: 'Minifying CSS files can reduce network payload sizes. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/minify-css).',
    };

    // Init the strings in this file with the i18n system.
    const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

    // String called with i18n
    // Will become id like "lighthouse-core/audits/byte-efficiency/unminified-css.js | message"
    let message = str_(UIStrings.message);
    ```

2.  i18n lookup map registered the string (i18n.js)

    ```javascript
    const _icuMessageInstanceMap = new Map();

    // example value in _icuMessageInstanceMap
    'lighthouse-core/audits/byte-efficiency/unminified-css.js | message': {
      icuMessageId: 'lighthouse-core/audits/byte-efficiency/unminified-css.js | message'
      icuMessage: 'Minifying CSS files can reduce network payload sizes. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/minify-css).'
    }
    ```

3.  Lookup in `i18n.js`. `replaceIcuMessageInstanceIds` and `getFormatted` will attempt to lookup in this order:

    1.  `locales/{locale}.json` The best result, the string is found in the target locale, and should appear correct.

    2.  `locales/en.json` _Okay_ result. The string was not found in the target locale, but was in `en`, so show the English string.

    3.  The fallback message passed to `_formatIcuMessage`. This lookup is subtley different than the en lookup. A string that is provided in the UIStrings, but not en may be part of a swap-locale that is using an old deprecated string, so would need to be populated by UIString replacement here instead.

    4.  Throw `_ICUMsgNotFoundMsg` Error. This is preferrable to showing the user some id control lookup like "lighthouse-core/audits/byte-efficiency/unminified-css.js | description"

    This is also the point at which ICU is replaced by values. So this...

    ```javascript
    message = "Total size was {totalBytes, number, bytes} KB"
    sent_values = {totalBytes: 10240}
    ```

    Becomes...

    ```javascript
    message = "Total size was 10 KB"
    ```
