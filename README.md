# Frontmatter JSON Schema Validator

Validate YAML frontmatter against a JSON schema

## Usage

```yaml
name: Frontmatter JSON Schema Validator
on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  frontmatter-json-schema-validator:
    name: Frontmatter JSON Schema Validator
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Frontmatter JSON Schema Validator
        uses: mheap/frontmatter-json-schema-action@main
        with:
          paths: "*.md"
          schema: '{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"}},"required":["title"],"additionalProperties":false}'
```

## Available Configuration

### Inputs

| Name          | Description                                                                                                                 | Required | Default |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `paths`       | The paths to read frontmatter from (e.g. `**/*.md`. See https://github.com/mrmlnc/fast-glob#pattern-syntax for full syntax) | true     |
| `schema`      | The JSON schema to use when validating                                                                                      | false    |
| `schema_path` | The path to a JSON schema to use when validation. This will override `schema`                                               | false    |
