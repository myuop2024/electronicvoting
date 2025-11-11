import { getRequestConfig } from 'next-intl/server';

const messages = {
  en: () => import('./messages/en.json').then((mod) => mod.default)
};

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale && Object.keys(messages).includes(locale) ? locale : 'en';
  return {
    locale: resolvedLocale,
    messages: await messages[resolvedLocale]()
  };
});

export async function getMessages(locale: string = 'en') {
  const resolvedLocale = Object.keys(messages).includes(locale) ? locale : 'en';
  return messages[resolvedLocale as keyof typeof messages]();
}
