import terser from "@rollup/plugin-terser"; // 压缩代码
import dts from "rollup-plugin-dts"; // 生成 .d.ts 文件
import { nodeResolve } from '@rollup/plugin-node-resolve' // 支持第三方模块导入
import ts from 'rollup-plugin-typescript2' // 编译 ts
import babel from '@rollup/plugin-babel' // 支持 babel
import { resolve } from './utils.js'

const input = resolve('../', './src/index.ts')

const exclude = ["node_modules/**", "ui/**"]

const plugins = [
    nodeResolve({
        extensions: ['.js', '.ts']
    }),
    ts({
        exclude,
        tsconfig: resolve('../tsconfig.json')
    }),
    babel({
        exclude,
        babelHelpers: "runtime",
        extensions: ['.js', '.ts'],
    }),
]

export default [
    // 生成 .d.ts 文件
    {
        input,
        output: {
            file: resolve('../', "./dist/image-filter.d.ts"),
            format: "es",
        },
        plugins: [dts()],
    },
    // 打包正常的代码
    {
        input,
        output: [
            // cjs 格式打包
            { file: resolve('../', "./dist/image-filter.cjs.js"), format: "cjs" },
            // es 格式打包
            { file: resolve('../', "./dist/image-filter.esm.js"), format: "es" },
            // umd 格式打包
            {
                name: 'ImageFilter',
                file: resolve('../', "./dist/image-filter.umd.js"),
                format: 'umd'
            },
            // cjs 格式打包
            { file: resolve('../', "./dist/image-filter.cjs.min.js"), format: "cjs", plugins: [terser()] },
            // es 格式打包
            { file: resolve('../', "./dist/image-filter.esm.min.js"), format: "es", plugins: [terser()] },
            // umd 格式打包
            {
                name: 'ImageFilter',
                file: resolve('../', "./dist/image-filter.umd.min.js"),
                format: 'umd', plugins: [terser()]
            }
        ],
        plugins,
    },
]
