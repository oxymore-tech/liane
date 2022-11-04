const tailwindColors = require("tailwindcss/colors");

delete tailwindColors.lightBlue;
delete tailwindColors.warmGray;
delete tailwindColors.trueGray;
delete tailwindColors.coolGray;
delete tailwindColors.blueGray;

module.exports = {
    liane: {
        pink: "#FF8484",
        orange: "#FF5B22",
        yellow: "#FFB545",
        blue: {
            '10': "#CEE4FE",
            '20': "#85BCFC",
            '30': "#0B79F9",
            '40': "#23278A"
        }
    },
    ...tailwindColors
};