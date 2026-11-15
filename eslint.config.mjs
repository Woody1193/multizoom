// ESLint flat config. Run with `npm run lint`; pre-commit and CI run it too.
//
// - Correctness: @eslint/js recommended plus a few stricter rules.
// - Design (SRP, DRY, KISS): size and complexity limits, SonarJS duplication
//   and complexity rules. AGENTS.md explains the principles behind them.
// - Style: GNOME Shell conventions, plus code split into blocks separated by
//   blank lines, with a blank line before every comment.
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
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

    // Design rules. Limits are deliberately tight: a function or file that
    // outgrows them is doing more than one job and should be split.
    {
        plugins: {sonarjs},
        rules: {
            // Single responsibility: small units, shallow logic.
            'max-lines': ['error', {max: 250, skipBlankLines: true, skipComments: true}],
            'max-lines-per-function': ['error', {max: 40, skipBlankLines: true, skipComments: true}],
            'max-statements': ['error', 15],
            'max-params': ['error', 4],
            'max-depth': ['error', 3],
            'max-nested-callbacks': ['error', 3],
            'max-classes-per-file': ['error', 1],
            'complexity': ['error', 8],
            'sonarjs/cognitive-complexity': ['error', 10],

            // Don't repeat yourself.
            'sonarjs/no-identical-functions': 'error',
            'sonarjs/no-duplicate-string': ['error', {threshold: 3}],
            'sonarjs/no-all-duplicated-branches': 'error',
            'sonarjs/no-identical-conditions': 'error',
            'sonarjs/no-identical-expressions': 'error',
            'sonarjs/no-collapsible-if': 'error',
            'no-duplicate-imports': 'error',

            // Name your numbers. -1, 0, 1 and 2 (halving) read as themselves.
            'no-magic-numbers': ['error', {
                ignore: [-1, 0, 1, 2],
                ignoreDefaultValues: true,
                ignoreClassFieldInitialValues: true,

                // Not enforceConst: GNOME 42 exports are top-level `var`s.
                enforceConst: false,
            }],
        },
    },

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

                    // GNOME style wraps long argument lists freely.
                    '()': 'off',
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

            // Code in blocks: blank line before comments, after blocks and
            // multi-line statements, after declarations and before return.
            '@stylistic/lines-around-comment': ['error', {
                beforeLineComment: true,
                beforeBlockComment: true,
                allowBlockStart: true,
                allowClassStart: true,
                allowObjectStart: true,
                allowArrayStart: true,
            }],
            '@stylistic/padding-line-between-statements': [
                'error',
                {blankLine: 'always', prev: 'directive', next: '*'},
                {blankLine: 'always', prev: ['block-like', 'if', 'for', 'while', 'do', 'switch', 'try'], next: '*'},
                {blankLine: 'always', prev: '*', next: ['block-like', 'if', 'for', 'while', 'do', 'switch', 'try']},
                {blankLine: 'always', prev: ['multiline-const', 'multiline-let', 'multiline-expression'], next: '*'},
                {blankLine: 'always', prev: ['const', 'let', 'var'], next: '*'},
                {blankLine: 'any', prev: ['singleline-const', 'singleline-let', 'singleline-var'], next: ['singleline-const', 'singleline-let', 'singleline-var']},
                {blankLine: 'always', prev: '*', next: 'return'},
            ],
            '@stylistic/lines-between-class-members': ['error', 'always'],
            '@stylistic/padded-blocks': ['error', 'never'],
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

    // Tests are flat scripts full of literal expectations.
    {
        files: ['tests/**/*.js'],
        rules: {
            'no-magic-numbers': 'off',
            'max-lines-per-function': 'off',
            'max-statements': 'off',
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
        rules: {
            // Config is mostly limits and repeated rule names.
            'no-magic-numbers': 'off',
            'sonarjs/no-duplicate-string': 'off',
        },
    },
];
