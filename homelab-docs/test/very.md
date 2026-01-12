<!--
Comprehensive Markdown/GitHub-Flavored-Markdown (GFM) test document.
Covers headings, lists, blockquotes, code, tables, links, images, HTML, etc.
-->

# H1 Heading

Some introductory text with **bold**, *italic*, and ***bold italic***.
Also ~~strikethrough~~ and **_mixed emphasis_**.

Line breaks test (hard vs soft):

This is a line with a soft break  
This is a line after two spaces at the end of the previous line.

Escaped characters: \*not italic\*, \_not italic\_, \# not a heading, \`not code\`.

---

## H2 Heading

Paragraph with inline `code` and a long URL: <https://example.com/path?query=1&another=value>.

Autolink email: <test@example.com>

A reference-style link to [Google][google-link] and [this document’s heading](#h1-heading).

[google-link]: https://www.google.com "Google Search"

---

### H3 Heading

#### H4 Heading

##### H5 Heading

###### H6 Heading

Alternate heading styles:

Heading Level 1
===============

Heading Level 2
---------------

---

## Lists

### Unordered lists

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
    - Deeply nested item 2.2.1
- Item 3

* Another bullet item
* Second bullet item
  * Nested bullet

+ Plus-style bullet
+ Another plus bullet

### Ordered lists

1. First item
2. Second item
3. Third item

Mixed numbering (should still render as 1,2,3):

1. First item
1. Second item
1. Third item

Deeply nested mixed list:

1. Parent 1
   - Child A
   - Child B
     1. Sub-child 1
     2. Sub-child 2
2. Parent 2

### Task lists (GFM)

- [ ] Unchecked task
- [x] Checked task
- [ ] Task with **bold text**
  - [x] Nested completed task
  - [ ] Nested pending task

---

## Blockquotes

> This is a simple blockquote.
> It spans multiple lines and contains **bold** and *italic*.

> Nested blockquote level 1
>> Nested blockquote level 2
>>> Nested blockquote level 3

> Blockquote with a list:
> - Item inside quote
> - Another item
>   - Nested item
>
> And a final line of the quote.

---

## Code

Inline code: `console.log("Hello, world");`

### Fenced code block (no language)

```

This is a code block.
It should preserve    spacing and
tabs	and other	whitespace.

````

### Fenced code block with language (e.g. JavaScript)

```js
// JavaScript example
function add(a, b) {
  return a + b;
}

console.log(add(2, 3)); // 5
````

### Fenced code with backticks inside

```bash
# Show using backticks inside a fenced block
echo "To use inline code, write: \`code\`"
```

### Alternative fenced code (tildes)

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("Markdown"))
```

### Indented code block (4 spaces)

```
This is an indented code block.
It should render as code as well.
print("Indented code block")
```

---

## Tables (GFM)

Simple table:

| Column 1 | Column 2 |
| -------- | -------- |
| Row 1    | Data A   |
| Row 2    | Data B   |

Alignment test:

| Left Align  | Center Align | Right Align |
| :---------- | :----------: | ----------: |
| a           |       b      |           c |
| hello       |     world    |         123 |
| longer text |   centered   |        3.14 |

Table with inline formatting:

| Feature  | Description         | Example             |
| -------- | ------------------- | ------------------- |
| **Bold** | Strong emphasis     | **bold text**       |
| *Italic* | Emphasis            | *italic text*       |
| `Code`   | Inline code         | `print("hi")`       |
| Link     | Clickable hyperlink | [link](#tables-gfm) |

Escaping pipes in tables:

| Text         | With Pipe |
| ------------ | --------- |
| Literal `\|` | A | B     |

---

## Links & Images

Standard inline link: [Example](https://example.com)

Reference-style link again: [Google][google-link]

Image with alt text and title:

![Example image](https://via.placeholder.com/150 "Placeholder Image")

Reference-style image:

![Ref Image][ref-image]

[ref-image]: https://via.placeholder.com/100 "Ref Placeholder"

---

## Footnotes (GFM)

Here is a sentence with a footnote.[^1]
Another footnote in the same line.[^second]

[^1]: This is the first footnote.

[^second]: This is the second footnote with **bold** and a link to [Example](https://example.com).

---

## Definition Lists (some Markdown flavors)

Term 1
: Definition for term 1.

Term 2
: First definition for term 2.
: Second definition for term 2.

---

## Horizontal Rules

Three dashes:

---

Three asterisks:

---

Three underscores:

---

---

## Emojis & Entities

Emoji shortcodes (GFM): :smile: :rocket: :+1:

Unicode emojis: 😄 🚀 👍

HTML entities: © & < > "

---

## Inline HTML

Basic HTML:

<div>
  <p>This is a <strong>HTML block</strong> inside the Markdown.</p>
  <p>It includes <em>emphasis</em> and <code>inline code</code>.</p>
</div>

HTML line break test:
First line<br>Second line

Keyboard input: <kbd>Ctrl</kbd> + <kbd>C</kbd>, <kbd>Ctrl</kbd> + <kbd>V</kbd>

Superscript and subscript (via HTML):

H<sub>2</sub>O and E = mc<sup>2</sup>

HTML comment (should be hidden in rendered output):

<!-- This is an HTML comment that should not be visible when rendered. -->

---

## Details / Summary (HTML, often supported)

<details>
  <summary>Click to expand details</summary>

This is the hidden content inside the `<details>` tag.

* You can put lists
* **Bold text**
* `Inline code`

</details>

---

## Math-like Content (for engines that support it)

Inline LaTeX-style: $E = mc^2$, $\alpha + \beta = \gamma$.

Block math (fenced):

```math
\int_{0}^{\infty} e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}
```

Or TeX-style block if supported:

$$
a^2 + b^2 = c^2
$$

---

## Complex Nesting

> Blockquote with list and code:
>
> 1. First item
>
> 2. Second item
>
>    * Nested bullet
>    * Another bullet
>
>    ```js
>    // Code inside a quote and list
>    const value = 42;
>    console.log(value);
>    ```
>
> 3. Third item

List with different content types:

1. Paragraph with **bold text**.

2. Paragraph with an image: ![Tiny](https://via.placeholder.com/50)

3. Paragraph with a table:

   | A | B |
   | - | - |
   | 1 | 2 |
   | 3 | 4 |

4. Paragraph with inline HTML: <span style="font-weight:bold;">Bold via HTML</span>

---

## Escaping & Edge Cases

Literal backticks: ``Here are some `inline` backticks``

Literal asterisks: ***should not be bold or hr***

Literal heading markers:

# Not a heading
## Also not a heading

Mixed markdown and HTML:

<p>This is a paragraph in HTML containing *Markdown* which may or may not be parsed.</p>

---

End of **Comprehensive Markdown Test Document**.

```

