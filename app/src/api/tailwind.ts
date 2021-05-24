import { create } from "tailwind-rn";
import styles from "./styles.json";

const { tailwind, getColor } = create(styles);
const tw = tailwind;
export { tw, getColor };
