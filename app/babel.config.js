module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    [
      "module:react-native-dotenv",
      {
        envName: "APP_ENV",
        moduleName: "@env",
        path: ".env",
        safe: false,
        verbose: false
      }
    ],
    [
      "module-resolver",
      {
        alias: {
          "native-modules": "./native-modules",
          "@/assets": "./assets",
          "@/components": "./src/components",
          "@/api": "./src/api",
          "@/screens": "./src/screens",
          "@/theme": "./src/theme",
          "@/util": "./src/util"
        }
      }
    ],
    "react-native-reanimated/plugin"
  ]
};
