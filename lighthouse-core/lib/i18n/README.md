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

`file_with_UIStrings.js -> collect-strings.js -> pre-locale/en-US.json -> json
translated and sent back as messages.json format -> correct-strings ->
locales/{locale}.json`

This is done with yarn commands:

```shell
# collect UIStrings into pre-locales
$ yarn i18n:collect-strings

# make the final en-US and en-XL files
$ yarn i18n:correct-strings

# Send off to translators, and the i18n:correct-strings again
# once those .json's are done.
```

#### String Replacement Pipeline (runtime)

`file_with_UIStrings.js -> exported to locale.json file -> read by i18n.js ->
$placeholder$'s replaced -> {ICU} syntax replaced => final string`

TODO(exterkamp): Simple example

##### Simple example, no ICU:

1.  string in `file_with_UIStrings.js`

    ```javascript
    const UIStrings = {
      /** Description of a Lighthouse audit that tells the user ...*/
      description: 'Minifying CSS files can reduce network payload sizes. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/minify-css).',
    };
    ```

2.  string when exported to pre-locale/{locale}.json file (en-US)

    ```json
    "lighthouse-core/audits/byte-efficiency/unminified-css.js | description": {
      "message": "Minifying CSS files can reduce network payload sizes. $LINK_START_0$Learn more$LINK_END_0$.",
      "description": "(Message Description goes here) Description of a Lighthouse audit that tells the user *why* they should minify (remove whitespace) the page's CSS code. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation.",
      "placeholders": {
        "LINK_START_0": {
          "content": "["
        },
        "LINK_END_0": {
          "content": "](https://developers.google.com/web/tools/lighthouse/audits/minify-css)"
        }
      }
    },
    ```

    1.  string when corrected and in locales/{locale}.json file.

        ```json
        "lighthouse-core/audits/byte-efficiency/unminified-css.js | description": {
          "message": "Minifying CSS files can reduce network payload sizes. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/minify-css)."
        },
        ```

3.  string when read by i18n.js

    ```javascript
    message = "Minifying CSS files can reduce network payload sizes. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/minify-css)."
    ```

##### Complex example, with ICU

1.  string in `file_with_UIStrings.js`

    ```javascript
    const UIStrings = {
      /** Used to summarize the total byte size ...*/
      displayValue: 'Total size was {totalBytes, number, bytes}\xa0KB',
    };
    ```

2.  string when exported to pre-locale/{locale}.json file (en-US)

    ```json
    "lighthouse-core/audits/byte-efficiency/total-byte-weight.js | displayValue": {
      "message": "Total size was $COMPLEX_ICU_0$ KB",
      "description": "Used to summarize the total byte size of the page and all its network requests. The `{totalBytes}` placeholder will be replaced with the total byte sizes, shown in kilobytes (e.g. 142 KB)",
      "placeholders": {
        "COMPLEX_ICU_0": {
          "content": "{totalBytes, number, bytes}",
          "example": "499"
        }
      }
    },
    ```

    1.  string when corrected and in locales/{locale}.json file.

        ```json
        "lighthouse-core/audits/byte-efficiency/total-byte-weight.js | displayValue": {
          "message": "Total size was {totalBytes, number, bytes} KB"
        },
        ```

3.  string when read by i18n.js

    ```javascript
    message = "Total size was {totalBytes, number, bytes} KB"
    sent_values = {totalBytes: 10}
    ```

4.  string when ICU syntax has been replaced (with the sent_values)

    ```javascript
    message = "Total size was 10 KB"
    ```
