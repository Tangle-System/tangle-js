import i18next from "https://esm.sh/i18next";
// import cs from "./locales/cs/translation.json";
// import en from "./locales/en/translation.json";

i18next.init({
  lng: "en", // if you're using a language detector, do not define the lng option
  debug: true,
  resources: {
    // TODO load here the JSONS
    en: {
      // ...en,
    },
    cs: {
      // ...cs,
    },
  },
});

export const changeLanguage = i18next.changeLanguage;
export const t = i18next.t;
