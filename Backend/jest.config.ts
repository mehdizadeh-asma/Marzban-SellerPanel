export default {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coverageReporters: ["json", "text", "lcov", "clover", "html"],
  preset: "ts-jest",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/../tsconfig.jest.json",
      },
    ],
  },
  reporters: ["default"],
  rootDir: "test",
  setupFilesAfterEnv: ["<rootDir>/../jest.setup.ts"],
  verbose: true,
  testEnvironment: "node",
};
