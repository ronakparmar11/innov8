import nextConfig from "eslint-config-next"

// Flat config for Next.js + TypeScript (ESLint v9)
// Using upstream Next.js defaults (core-web-vitals, TypeScript, import/jsx-a11y, React hooks)
export default [
	...nextConfig,
	{
		rules: {
			// Allow controlled state sync patterns inside effects and samples
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/purity": "off",
		},
	},
]
