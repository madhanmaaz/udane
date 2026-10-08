<p align="center">
    <img src="https://raw.githubusercontent.com/madhanmaaz/udane/master/public/images/logo.png" width="150px" alt="udane" />
</p>
<h1 align="center">
    Udane
</h1>

<p align="center">
    <a href="https://github.com/madhanmaaz/udane/blob/main/license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
    <a href="https://github.com/madhanmaaz/udane/issues"><img src="https://img.shields.io/github/issues/madhanmaaz/udane" alt="Open Issues" /></a>
    <a href="https://github.com/madhanmaaz/udane/stargazers"><img src="https://img.shields.io/github/stars/madhanmaaz/udane" alt="Stars" /></a>
</p>

<p align="center">
    Udane is a fast, lightweight development server with live reload, built on Fastify.
</p>

## Installation

```bash
npm install -g @madhanmaaz/udane
```

## Usage

```bash
udane [root] [options]
```

Start Udane from the current directory:

```bash
udane
```

Serve a specific directory:

```bash
udane ./public
```

### Commands

#### `init`

Create a default `udane.config.js` in the current directory.

```bash
udane init
```

Use `--force` to overwrite an existing configuration file:

```bash
udane init --force
```

## Options

| Option                 | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `-p, --port <number>`  | Port to listen on                                                                |
| `-H, --host <address>` | Interface to bind (`0.0.0.0` = network, `127.0.0.1` = local only)                |
| `--cors`               | Send `Access-Control-Allow-Origin: *`                                            |
| `--debounce <ms>`      | Wait time after the last file change                                             |
| `--watch <path>`       | Path to watch (repeatable)                                                       |
| `--ignore <pattern>`   | Pattern to ignore (repeatable)                                                   |
| `-f, --force`          | Overwrite an existing config file (`init` only)                                  |
| `-h, --help`           | Show this help                                                                   |
| `-v, --version`        | Show the version                                                                 |

## Examples

### Serve a directory

```bash
udane ./dist
```

### Use a custom port

```bash
udane --port 3000
```

### Allow network access

```bash
udane --host 0.0.0.0
```

### Enable CORS

```bash
udane --cors
```

### Watch specific paths

```bash
udane --watch src --watch public
```

### Ignore files

```bash
udane --ignore node_modules --ignore "*.log"
```

## Configuration

Generate a configuration file:

```bash
udane init # This creates: udane.config.js
```

The configuration file allows you to keep your development-server settings in the project instead of passing them through the CLI every time.

## License

This project is licensed under the MIT License — Copyright (c) 2026 Madhan (Madhanmaaz)

[View the full license](https://github.com/madhanmaaz/udane/blob/main/LICENSE)
