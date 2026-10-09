# Contributing to MISO

Use Node.js 22.12 or newer and install dependencies with `npm ci`.

Edit application code in `src`, artwork in `src/assets`, and tests in `tests`. Generated `dist`, `release`, and `artifacts` folders are not committed. See [the artwork guide](src/assets/README.md) for replacement names and supported formats.

Before opening a pull request, run:

```sh
npm run format:check
npm run check
```

For renderer, OAuth, storage, or IPC changes, also run `npm run smoke` in a desktop session. For Windows packaging changes, run `npm run dist` and `npm run smoke:packaged`.

Tests must use synthetic accounts and mocked providers, not personal calendar data or live credentials. Never attach unredacted logs, screenshots, tokens, OAuth credential files, or OS user-data folders. Live Google acceptance checks belong in a dedicated test account.

Explain the problem, resulting behavior, and checks performed in the pull request. Report security issues privately; see [SECURITY.md](SECURITY.md).
