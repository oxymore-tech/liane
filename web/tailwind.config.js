const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: [
    "./src/**/*.tsx"
  ],
  darkMode: false,
  theme: {
    fontFamily: {
      "sans": ["Inter"]
    },
    colors: {
      orange: {
        light: '#FFB545',
        DEFAULT: '#FF5B22'
      },
      pink: {
        light: '#FF8484'
      },
      black: colors.black,
      white: colors.white,
      gray: colors.coolGray,
      red: colors.red,
      yellow: colors.amber,
      blue: colors.blue
    }
  },
  plugins: []
}
