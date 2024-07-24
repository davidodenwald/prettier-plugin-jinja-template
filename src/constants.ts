export const Placeholder = {
	jinja: {
		startToken: "`~",
		endToken: "~`",
	},
	json: {
		startToken: "__~",
		endToken: "~__",
	},
} as const;

export const NOT_FOUND = -1 as const;
