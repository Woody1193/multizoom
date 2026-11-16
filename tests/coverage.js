'use strict';

// Fails unless the unit tests cover every line and function of every logic
// file. Usage: `gjs tests/coverage.js <coverage.lcov>`; `make test` runs it
// after the tests.
//
// Logic files are found, not listed: every .js file under the source
// directories that imports nothing from GNOME (gi, ui, misc). Those are the
// pure modules AGENTS.md requires to be unit-tested, so a new one is held
// to 100% from the start.
//
// Branches are reported but not enforced: GJS 1.72 counts the engine's own
// iterator checks behind destructuring and spread syntax as branches, which
// no test can reach.

const {Gio, GLib} = imports.gi;

const SOURCE_DIRS = ['lib', 'preferences'];
const GNOME_IMPORT = /\bimports\.(gi|ui|misc)\b/;
const FULL = 100;

const repoDir = GLib.path_get_dirname(GLib.path_get_dirname(
    GLib.canonicalize_filename(imports.system.programPath, null)));

function readText(path) {
    const [, bytes] = GLib.file_get_contents(path);

    return new TextDecoder().decode(bytes);
}

// Paths (relative to the repo) of every .js file under `dir`, recursively.
function jsFiles(dir) {
    const children = Gio.File.new_for_path(GLib.build_filenamev([repoDir, dir]))
        .enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);

    const files = [];

    for (let info = children.next_file(null); info; info = children.next_file(null)) {
        const path = `${dir}/${info.get_name()}`;

        if (info.get_file_type() === Gio.FileType.DIRECTORY)
            files.push(...jsFiles(path));
        else if (path.endsWith('.js'))
            files.push(path);
    }

    return files;
}

function logicFiles() {
    return SOURCE_DIRS.flatMap(jsFiles)
        .filter(path => !GNOME_IMPORT.test(readText(GLib.build_filenamev([repoDir, path]))))
        .sort();
}

// {path suffix → {lines, linesHit, functions, functionsHit, branches,
// branchesHit, missedLines}} from an lcov file.
function parseLcov(text) {
    const records = [];

    for (const line of text.split('\n')) {
        const [tag, value = ''] = line.split(/:(.*)/s);

        if (tag === 'SF')
            records.push({file: value, missedLines: []});
        else if (records.length > 0)
            addToRecord(records[records.length - 1], tag, value);
    }

    return records;
}

const COUNT_TAGS = ['LF', 'LH', 'FNF', 'FNH', 'BRF', 'BRH'];

// One lcov line inside a file's record: a line's hit count (DA) or a total.
function addToRecord(record, tag, value) {
    if (tag === 'DA') {
        const [lineNo, hits] = value.split(',').map(Number);

        if (hits === 0)
            record.missedLines.push(lineNo);
    } else if (COUNT_TAGS.includes(tag)) {
        record[tag] = Number(value);
    }
}

function percent(hit, found) {
    return found === 0 ? FULL : Math.floor(hit * FULL / found);
}

function report(path, record) {
    if (!record)
        return {ok: false, text: `${path}: not loaded by any test`};

    const lines = percent(record.LH, record.LF);
    const functions = percent(record.FNH, record.FNF);
    const branches = percent(record.BRH, record.BRF);
    const ok = record.LH === record.LF && record.FNH === record.FNF;
    const missed = record.missedLines.length > 0 ? `  missed lines ${record.missedLines.join(', ')}` : '';

    return {ok, text: `${path}: lines ${lines}%, functions ${functions}% (branches ${branches}%)${missed}`};
}

const [lcovPath] = ARGV;
const records = parseLcov(readText(lcovPath));
const results = logicFiles().map(path => report(path, records.find(r => r.file.endsWith(`/${path}`))));

for (const {ok, text} of results)
    print(`${ok ? '  ' : '✗ '}${text}`);

if (results.some(r => !r.ok)) {
    print('Logic files need 100% line and function coverage.');
    imports.system.exit(1);
}
