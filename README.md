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
npx prettier --write **/*.html --plugin=prettier-plugin-jinja-template
```