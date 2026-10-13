export const APP_NAME = "MISO";
export const APP_FULL_NAME = "MISO - Your Little Butler";
export const APP_WEBSITE = "https://miso.abirmahanta.in/";
export const APP_LINKS = {
  website: APP_WEBSITE,
  privacy: new URL("privacy-policy", APP_WEBSITE).href,
  terms: new URL("terms-of-service", APP_WEBSITE).href,
} as const;
export type AppLink = keyof typeof APP_LINKS;
