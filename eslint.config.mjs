// ESLint flat config. Rules follow GNOME Shell's own style where it matters
// (4-space indent, single quotes, no spaces inside braces), plus correctness
// rules from @eslint/js. Run with `npm run lint`; pre-commit and CI run it too.
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

// Globals that GJS and GNOME Shell provide to extension code.
const gjsGlobals = {
    ARGV: 'readonly',
    imports: 'readonly',
    global: 'readonly',
    log: 'readonly',
    logError: 'readonly',
    print: 'readonly',
    printerr: 'readonly',
    _: 'readonly',
    C_: 'readonly',
    N_: 'readonly',
    ngettext: 'readonly',
    console: 'readonly',
    TextEncoder: 'readonly',
    TextDecoder: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
};

export default [
    {ignores: ['node_modules/', 'dist/']},

    js.configs.recommended,

    {
        plugins: {'@stylistic': stylistic},
        rules: {
            // Correctness
            'eqeqeq': ['error', 'always'],
            'no-unused-vars': ['error', {
                args: 'after-used',
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            'no-shadow': 'error',
            'no-implicit-globals': 'off',
            'prefer-const': 'error',
            'curly': ['error', 'multi-or-nest', 'consistent'],
            'no-unneeded-ternary': 'error',
            'object-shorthand': ['error', 'always'],
            'prefer-template': 'error',

            // Style (GNOME Shell conventions)
            '@stylistic/indent': ['error', 4, {SwitchCase: 0}],
            '@stylistic/quotes': ['error', 'single', {avoidEscape: true, allowTemplateLiterals: 'always'}],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'always-multiline',
                exports: 'always-multiline',
                functions: 'never',
            }],
            // No spaces just inside brackets and braces: `{a, b}`, `[1, 2]`.
            '@stylistic/list-style': ['error', {
                singleLine: {spacing: 'never'},
                overrides: {
                    '{}': {singleLine: {spacing: 'never'}},
                    '[]': {singleLine: {spacing: 'never'}},
                },
            }],
            '@stylistic/arrow-parens': ['error', 'as-needed'],
            '@stylistic/brace-style': ['error', '1tbs', {allowSingleLine: true}],
            '@stylistic/keyword-spacing': 'error',
            '@stylistic/space-before-blocks': 'error',
            '@stylistic/space-infix-ops': 'error',
            '@stylistic/comma-spacing': 'error',
            '@stylistic/key-spacing': 'error',
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/eol-last': 'error',
            '@stylistic/no-multiple-empty-lines': ['error', {max: 1}],
            '@stylistic/max-len': ['error', {
                code: 120,
                ignoreUrls: true,
                ignoreStrings: true,
                ignoreTemplateLiterals: true,
                ignoreRegExpLiterals: true,
            }],
        },
    },

    // Extension and test code: GJS scripts. GNOME 42 uses the legacy
    // `imports.*` module system, where top-level `var`s are a file's exports,
    // so these are scripts, not ES modules, and `/* exported */` comments
    // mark the names other files import.
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022, // SpiderMonkey 91 in GJS 1.72
            sourceType: 'script',
            globals: {...globals.es2021, ...gjsGlobals},
        },
    },

    // Tooling config files run under Node.
    {
        files: ['**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node,
        },
    },
];
