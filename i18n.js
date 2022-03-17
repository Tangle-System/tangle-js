// In apps without i18next included use // import I18 from "https://esm.sh/i18next";
import I18 from "i18next";
import cs from "./locales/cs/translation.json";
import en from "./locales/en/translation.json";

const i18 = I18.createInstance();
i18.init({
  lng: "en",
  debug: true,
  resources: {
    en: {
      ...en,
    },
    cs: {
      ...cs,
    },
  },
});

export const changeLanguage = i18.changeLanguage;
export const t = i18.t;
