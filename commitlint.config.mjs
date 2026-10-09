export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // `deps` is not a config-conventional type, and neither bot uses it here:
    // both write `chore`, since nothing they update reaches users. It
    // stays accepted so the type list matches the other yo61 repos, and an
    // ecosystem that ships could use it without a commitlint change.
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'deps',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    // No scope-enum: this repo is a single package (the plugin), so scope is decorative.
    'subject-case': [0],
  },
};
