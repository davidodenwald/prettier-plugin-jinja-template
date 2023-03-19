const { defaults } = require("jest-config");

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = () => ({
	preset: "ts-jest",
	moduleFileExtensions: [...defaults.moduleFileExtensions, "html"],
	collectCoverage: true,
});
