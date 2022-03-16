import i18next from "https://esm.sh/i18next";
window.i18next = i18next;

i18next.init({
  lng: "en", // if you're using a language detector, do not define the lng option
  debug: true,
  resources: {
    en: {
      translation: {},
    },
    cs: {
      translation: {},
    },
  },
});

export const t = i18next.t;
