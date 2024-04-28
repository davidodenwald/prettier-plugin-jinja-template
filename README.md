# prettier-plugin-jinja-template

Formatter plugin for jinja2 template files.

## Install

```bash
npm install --save-dev prettier prettier-plugin-jinja-template
```

Add the plugin to your `.prettierrc`:
```json
{
  "plugins": ["prettier-plugin-jinja-template"]
}
```

## Use

To format basic .html files, you'll have to override the used parser inside your `.prettierrc`:
```json
{
  "overrides": [
    {
      "files": ["*.html"],
      "options": {
        "parser": "jinja-template"
      }
    }
  ]
}
```

Run it on all html files in your project:
```bash
npx prettier --write **/*.html
```

If you don't have a prettier config you can run the plugin with this command:
```bash
npx prettier --plugin=prettier-plugin-jinja-template --parser=jinja-template --write **/*.html
```

### Ignoring Code

Using range ignores is the best way to tell prettier to igone part of files. Most of the time this is necessary for Jinja tags inside `script` or `style` tags:

```html
<!-- prettier-ignore-start -->
  <script>
    window.someData = {{ data | safe }}
  </script>
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
  <style>
    :root { --accent-color: {{ theme_accent_color }} }
  </style>
<!-- prettier-ignore-end -->
```

## Options

This Plugin provides additional options:

### Quote Attributes

Surrounds the value of html attributes with quotes. This option was introduced to support [JinjaX](https://jinjax.scaletti.dev/) syntax.

`true` - Example:
```js
<Paginator items="{products}" />
```

`false` - Example:
```js
<Paginator items={products} />
```

| Default | CLI Override            | API Override              |
| ------- | ----------------------- | ------------------------- |
| `true`  | `--no-quote-attributes` | `quoteAttributes: <bool>` |