module.exports = {
  presets: ["module:metro-react-native-babel-preset"],
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