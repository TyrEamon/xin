import { defineNuxtPlugin } from "#app";
import Varlet from "@varlet/ui";
import "@varlet/ui/es/style";
import "@varlet/icons/dist/css/varlet-icons.css";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Varlet);
});

