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
    (parenthesis). Note that "[link text](https://...)" is NOT VALID because of
    the space and will not be converted to a link.

    Example usage:

    ```javascript
    const UIStrings = {
      description: 'The value of ... [Learn More](https://google.com/)',
    };
    ```

TODO(exterkamp): explain all the comments and where they go/what they become.

TODO(exterkamp): explain why we can't use some ICU like number formatting.

### The pipeline

file_with_UIStrings.js -> exported to locale.json file -> read by i18n.js ->
$placeholder$'s replaced -> {ICU} syntax replaced => final string

TODO(exterkamp): Simple example

Complex example:

1.  string in `file_with_UIStrings.js`

    ```javascript
    /** (Message Description goes here) Description of a Lighthouse audit that tells the user *why* they should minify (remove whitespace) the page's CSS code. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
    description: {
      message: 'Minifying CSS files can reduce network payload sizes. {LINK_START}Learn More!!!{LINK_START}. This audit took {MILLISECONDS} ms.',
      placeholders: {
        LINK_START: '[',
        LINK_START: '](https://developers.google.com/web/tools/lighthouse/audits/minify-css)',
        /** 520 (Placeholder examples go here) */
        MILLISECONDS: '{timeInMs, number, milliseconds}',
      },
    },
    ```

2.  string when exported to locale.json file (en-US)

    ```json
    "lighthouse-core/audits/byte-efficiency/unminified-css.js | description": {
      "message": "Minifying CSS files can reduce network payload sizes. $LINK_START$Learn More!!!$LINK_START$. This audit took $MILLISECONDS$ ms.",
      "description": "(Message Description goes here) Description of a Lighthouse audit that tells the user *why* they should minify (remove whitespace) the page's CSS code. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation.",
      "placeholders": {
        "LINK_START": {
          "content": "["
        },
        "LINK_START": {
          "content": "](https://developers.google.com/web/tools/lighthouse/audits/minify-css)"
        },
        "MILLISECONDS": {
          "content": "{timeInMs, number, milliseconds}",
          "example": "520 (Placeholder examples go here)"
        }
      }
    },
    ```

    1.  string when exported back from translators locale.json file (everything
        but en-US)

        ```json
        "lighthouse-core/audits/byte-efficiency/unminified-css.js | description": {
          "message": "La réduction des fichiers CSS peut réduire la taille des charges utiles de réseau. $LINK_START$En savoir plus$LINK_START$. Cet audit a pris $MILLISECONDS ms",
          "placeholders": {
            "LINK_START": {
              "content": "["
            },
            "LINK_START": {
              "content": "](https://developers.google.com/web/tools/lighthouse/audits/minify-css)"
            },
            "MILLISECONDS": {
              "content": "{timeInMs, number, milliseconds}",
            }
          }
        },
        ```

3.  string when read by i18n.js (initially)

    ```javascript
    message = "Minifying CSS files can reduce network payload sizes. $LINK_START$Learn More!!!$LINK_END$. This audit took $MILLISECONDS$ ms."
    sent_values = {timeInMs: 10}
    ```

4.  string when placeholders replaced (with the static content)

    ```javascript
    message = "Minifying CSS files can reduce network payload sizes. [Learn More!!!](https://developers.google.com/web/tools/lighthouse/audits/minify-css). This audit took {timeInMs, number, milliseconds} ms."
    sent_values = {timeInMs: 10}
    ```

5.  string when ICU syntax has been replaced (with the sent_values)

    ```javascript
    message = "Minifying CSS files can reduce network payload sizes. [Learn More!!!](https://developers.google.com/web/tools/lighthouse/audits/minify-css). This audit took 10 ms."
    ```
