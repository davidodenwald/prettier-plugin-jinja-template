// rollup.config.js
import typescript from "@rollup/plugin-typescript";

import pkg from "./package.json" assert { type: 'json' };

export default {
	input: pkg.source,
	output: [
		{
			file: pkg.main,
			format: "cjs"
		},
		{
			file: pkg.module,
			format: "esm"
		}
	],
	plugins: [typescript()]
};
