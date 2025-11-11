import withNextIntl from 'next-intl/plugin';

const withIntl = withNextIntl('./src/i18n/request.ts');

export default withIntl({
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.mapbox.com https://events.mapbox.com; frame-ancestors 'none';"
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        }
      ]
    }
  ]
});
