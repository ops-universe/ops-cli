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

Branding: registered project names automatically select their own palette. Unregistered names receive a unique palette ID marked `pending-registration`; register their actual light/dark tokens in ops-ui and synchronize the template before release. The preview fallback is not an approved project identity. Use a template revision containing the palette registry.

## Preview and generated branding

Append `--dry-run` to init for a read-only manifest of files, planned changes and branding status. The actual init generates deterministic SVG favicon and wordmark plus project-specific HTML title, description and Open Graph title/description for supported website templates. Unknown projects use provisional Universe colors and remain pending registration. No canonical URL or social image URL is guessed. Review the manifest and generated assets before publishing.

## Integration verification

`node src/cli.mjs audit ../evalOps` reports six evidence-based scaffolding checks and fails if any are blocked. `node scripts/e2e.mjs ../ops-template` generates a disposable evalOps, checks metadata, runs root tests and builds the website with a project Pages base. CI uses an immutable reviewed template commit. Website dependency installation still uses npm install until its lockfile is committed; this is not release certification. Only run integration checks against trusted templates because they execute npm scripts.
