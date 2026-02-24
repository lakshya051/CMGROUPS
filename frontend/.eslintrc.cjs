module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true,
        node: true
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    ignorePatterns: [
        'dist/',
        'node_modules/',
        'build.log',
        'build_log*.txt'
    ],
    rules: {}
};
