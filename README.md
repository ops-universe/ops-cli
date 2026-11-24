# ops-cli

Developer Preview · local scaffolding and validation for Ops Universe. Node.js 22+, no dependencies. Not published to npm.

Clone an approved, reviewed revision of ops-template locally, then run from this repository:

```sh
npm ci
npm test
node src/cli.mjs init evalOps --template ../ops-template --dest ../evalOps
node src/cli.mjs validate ../evalOps
```

The initializer copies an explicitly selected local template, customizes project metadata and README, excludes Git metadata, dependency/build directories and local secrets, rejects symlinks and existing destinations, and performs no remote writes. Review generated source before committing. It does not rename every website component, install packages, create GitHub repos, publish Wikis or configure Pages yet. Validation is a structural baseline, not a security or release certification.
