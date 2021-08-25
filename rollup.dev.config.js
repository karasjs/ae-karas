import babel from '@rollup/plugin-babel';

export default [{
  input: 'es/index.js',
  output: {
    file: 'bundle/jsx/index.jsx',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    babel({
      babelHelpers: 'runtime', // 使plugin-transform-runtime生效
      exclude: 'node_modules/**'
    })
  ]
}];
