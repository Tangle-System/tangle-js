// In apps without i18next included use // import I18 from "https://esm.sh/i18next";
import I18 from "i18next";
import cs from "./locales/cs/translation.json";
import en from "./locales/en/translation.json";

const i18 = I18.createInstance();

i18.init(
  {
    lng: "en",
    debug: true,

    // supportedLngs: ["cs", "en", "cs-CZ", "en-US"],
    // fallbackLng: "en",

    resources: {
      cs: { translation: cs },
      "cs-CZ": { translation: cs },
      en: { translation: en },
      "en-US": { translation: en },
    },
    keySeparator: "__",
    contextSeparator: "__",
  },
  (err, t) => {
    // TEST
    // console.log("tanglejs translation", "Zpět", t("Zpět"));
    // console.log("tanglejs translation", "Zkusit znovu", t("Zkusit znovu"));
  },
);

export const changeLanguage = i18.changeLanguage;
export const t = i18.t;
// window.i18js = i18;
