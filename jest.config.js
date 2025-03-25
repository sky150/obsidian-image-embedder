module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	testMatch: ['**/__tests__/**/*.test.ts'],
	moduleNameMapper: {
		'^obsidian$': '<rootDir>/__tests__/mocks/obsidian.ts'
	}
}; 