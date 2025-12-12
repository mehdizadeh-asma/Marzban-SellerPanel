export default {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coverageReporters: ["json", "text", "lcov", "clover", "html"],
  preset: "ts-jest",
  reporters: ["default"],
  rootDir: "test",
  setupFilesAfterEnv: ["<rootDir>/../jest.setup.ts"],
  verbose: true,
  testEnvironment: "node",
};
