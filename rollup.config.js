import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";
import babel, { getBabelOutputPlugin } from '@rollup/plugin-babel';


export default [
  // browser-friendly UMD build
  {
    input: "src/TangleBluetoothDevice.js",
    output: {
      name: "TangleBluetoothDevice",
      file: "dist/TangleBluetoothDevice.iife.js",
      format: "iife",
    },
    plugins: [
      resolve(), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
    ],
  },
  {
    input: "src/TangleCodeParser.js",
    output: {
      name: "TnglCodeParser",
      file: "dist/TangleCodeParser.iife.js",
      format: "iife",
    },
    plugins: [
      resolve(), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
    ],
  },
  {
    input: "src/TangleDevice.js",
    output: {
      name: "TangleDevice",
      file: "dist/TangleDevice.iife.js",
      format: "iife",
    },
    plugins: [
      resolve(), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
    ],
  },

  {
    input: "src/functions.js",
    output: {
      name: "TangleFunctions",
      file: "dist/TangleFunctions.iife.js",
      format: "iife",
    },
    plugins: [
      resolve(), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
    ],
  },
  {
    input: "src/TimeTrack.js",
    output: {
      name: "TimeTrack",
      file: "dist/TimeTrack.iife.js",
      format: "iife",
    },
    plugins: [
      resolve(), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
    ],
  },
  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: "src/main.js",
    output: [
      // { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: "esm" },

    ],
    plugins: [
      getBabelOutputPlugin({
        presets: ['@babel/preset-env']
      })
    ]
  },
  {
    input: "src/functions.js",
    output: [
      // { file: pkg.main, format: 'cjs' },
      { file: "dist/functions.esm.js", format: "esm" },
    ],
    plugins: [
      getBabelOutputPlugin({
        presets: ['@babel/preset-env']
      })
    ]
  },
];
