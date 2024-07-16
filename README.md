# prettier-plugin-jinja-json-template

Formatter plugin for jinja2 json template files.

Jinja2 + json would be another one an approach

## Install

```bash
npm install --save-dev prettier prettier-plugin-jinja-template
```

Add the plugin to your `.prettierrc`:
```json
{
  "plugins": ["prettier-plugin-jinja-json-template"]
}
```

## Use

To format basic .json files, you'll have to override the used parser inside your `.prettierrc`:
```json
{
  "overrides": [
    {
      "files": ["*.json"],
      "options": {
        "parser": "jinja-json-template"
      }
    }
  ]
}
```

Run it on all json files in your project:
```bash
npx prettier --write **/*.json
```

If you don't have a prettier config you can run the plugin with this command:
```bash
npx prettier --plugin=prettier-plugin-jinja-json-template --parser=jinja-template --write **/*.json
```


## Options

This Plugin provides additional options:

