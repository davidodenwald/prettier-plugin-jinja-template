# prettier-plugin-jinja-template

Formatter plugin for jinja2 template files.

## Install

```bash
npm install --save-dev prettier prettier-plugin-jinja-template
```

## Use

To use it with basic .html files, you'll have to override the used parser inside your prettier config:

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
