const mockedEnv = require("mocked-env");
const fs = require("fs").promises;
const fg = require("fast-glob");
const core = require("@actions/core");
const run = require(".");

let restore;
let restoreTest;
beforeEach(() => {
  restore = mockedEnv({
    GITHUB_WORKFLOW: "Frontmatter Validation",
    GITHUB_ACTION: "Frontmatter Validation Action",
    GITHUB_ACTOR: "mheap",
    GITHUB_WORKSPACE: "/tmp",
    GITHUB_SHA: "253187c4c33beddeb518eb331e4efaf41b2f4feb",
    GITHUB_REPOSITORY: "mheap/test-repo",
    GITHUB_EVENT_NAME: "",
    GITHUB_EVENT_PATH: "",
  });
  restoreTest = null;
});

afterEach(() => {
  restore();
  restoreTest && restoreTest();
  jest.restoreAllMocks();
});

test("throws when no schema is provided", () => {
  return expect(run).rejects.toThrow(
    "Either schema or schema_path must be provided"
  );
});

test("throws when the provided schema is not JSON", () => {
  restoreTest = mockedEnv({
    INPUT_SCHEMA: "not a json document",
  });
  return expect(run).rejects.toThrow(
    "Unexpected token o in JSON at position 1"
  );
});

test("throws when the provided schema_path is not JSON", () => {
  restoreTest = mockedEnv({
    INPUT_SCHEMA_PATH: "/path/to/schema",
  });

  mockContent("file based not json");

  return expect(run).rejects.toThrow(
    "Unexpected token i in JSON at position 1"
  );
});

test("throws when INPUT_PATHS is not provided", () => {
  restoreTest = mockedEnv({
    INPUT_SCHEMA: JSON.stringify({}),
  });
  return expect(run).rejects.toThrow("Input required and not supplied: PATHS");
});

test("throws when there are no matching files", () => {
  restoreTest = mockedEnv({
    INPUT_SCHEMA: JSON.stringify({}),
    INPUT_PATHS: "*.md",
  });

  jest.spyOn(fg, "sync").mockImplementationOnce(() => []);
  return expect(run).rejects.toThrow("No files match the pattern *.md");
});

test("add annotations and fails when a document does not validate", async () => {
  restoreTest = mockedEnv({
    INPUT_SCHEMA: JSON.stringify({
      type: "object",
      properties: {
        title: {
          type: "string",
        },
        description: {
          type: "string",
        },
        wrong: {
          type: "string",
        },
      },
      required: ["title"],
      additionalProperties: false,
    }),
    INPUT_PATHS: "*.md",
  });

  jest.spyOn(fg, "sync").mockImplementationOnce(() => ["demo.md", "second.md"]);

  mockContent(`---
description: Hello
wrong:
  - data type
---
Hello file
`);

  mockContent(`---
title: Second
additional: Error
another: Error
---
Second file
`);

  const error = jest.spyOn(core, "error").mockImplementation(() => jest.fn());
  const setFailed = jest
    .spyOn(core, "setFailed")
    .mockImplementation(() => jest.fn());

  const r = await run();

  expect(error).toBeCalledTimes(4);

  expect(error).toBeCalledWith("demo.md: must be string (wrong)", {
    file: "demo.md",
  });
  
  expect(error).toBeCalledWith("demo.md: must have required property 'title'", {
    file: "demo.md",
  });

  expect(error).toBeCalledWith(
    "second.md: must NOT have additional properties (additional)",
    { file: "second.md" }
  );

  expect(error).toBeCalledWith(
    "second.md: must NOT have additional properties (another)",
    { file: "second.md" }
  );

  expect(setFailed).toBeCalled();

  return r;
});

test("does not add annotations or fail when all documents are valid", async () => {
  restoreTest = mockedEnv({
    INPUT_SCHEMA: JSON.stringify({
      type: "object",
      properties: {
        title: {
          type: "string",
        },
      },
      required: ["title"],
      additionalProperties: false,
    }),
    INPUT_PATHS: "*.md",
  });

  jest.spyOn(fg, "sync").mockImplementationOnce(() => ["demo.md", "second.md"]);

  mockContent(`---
title: First
---
First file
`);

  mockContent(`---
title: Second
---
Second file
`);

  const error = jest.spyOn(core, "error").mockImplementation(() => jest.fn());
  const setFailed = jest
    .spyOn(core, "setFailed")
    .mockImplementation(() => jest.fn());

  const r = await run();
  expect(error).not.toBeCalled();
  expect(setFailed).not.toBeCalled();

  return r;
});

function mockContent(content) {
  jest
    .spyOn(fs, "readFile")
    .mockImplementationOnce(() => Promise.resolve(Buffer.from(content)));
}
