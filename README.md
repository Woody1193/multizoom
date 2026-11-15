# multizoom

Linux zoom utility that doesn't suck

## Development

Requires Node 22 (see `.nvmrc`), [pre-commit](https://pre-commit.com), `gjs` and `glib-compile-schemas`.

```sh
npm ci               # linters
pre-commit install   # git hooks
make test            # unit tests
pre-commit run --all-files
```

Rules for contributors (and AI agents) are in [AGENTS.md](AGENTS.md).
