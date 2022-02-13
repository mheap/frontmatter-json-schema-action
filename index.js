const core = require("@actions/core");
const fs = require("fs").promises;
const fg = require("fast-glob");
const matter = require("gray-matter");

const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });

async function action() {
  let schema;
  let schemaPath;

  // Schema was provided as a path
  if ((schemaPath = core.getInput("SCHEMA_PATH"))) {
    schema = JSON.parse(await fs.readFile(schemaPath));
  }

  // Schema was provided as a string
  if (!schema) {
    schema = core.getInput("SCHEMA");
    if (!schemaPath && !schema) {
      throw new Error("Either schema or schema_path must be provided");
    }
    schema = JSON.parse(schema);
  }

  const validate = ajv.compile(schema);

  // At this point `schema` can be used
  const paths = core.getInput("PATHS", { required: true }).split(",");

  // We use fg.sync as it makes things easier to test
  // TODO: Work out how to mock a top level function
  const entries = fg.sync(paths);

  if (!entries.length) {
    throw new Error(`No files match the pattern ${paths.join(", ")}`);
  }

  let allErrors = [];
  for (const path of entries) {
    const markdown = await fs.readFile(path);
    const { data } = matter(markdown);

    const valid = validate(data);
    if (!valid) {
      allErrors = allErrors.concat(
        validate.errors.map((e) => {
          e.path = path;
          if (e.keyword == "additionalProperties") {
            e.message += ` (${e.params.additionalProperty})`;
          }
          return e;
        })
      );
    }
  }

  allErrors.forEach((e) => {
    core.error(`${e.path}: ${e.message}`, {
      file: e.path,
    });
  });

  if (allErrors.length) {
    core.setFailed();
  }
}

if (require.main === module) {
  try {
    action();
  } catch (e) {
    core.error(e);
    core.setFailed();
  }
}

module.exports = action;
