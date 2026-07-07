import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  // 'standalone' bundles a self-contained server for non-Vercel Node/Docker
  // hosting (e.g. AI Studio's own container). Vercel has its own build
  // output pipeline and doesn't need or want this — it's harmless to leave
  // on, but skipping it there avoids producing a redundant standalone
  // bundle on every deploy.
  output: process.env.VERCEL ? undefined : 'standalone',
  transpilePackages: ['motion'],
  async headers() {
    // The "react" artifact workspace (components/ReactArtifact.tsx) renders
    // its live preview via @codesandbox/sandpack-react, which navigates an
    // iframe to a versioned "<version>-sandpack.codesandbox.io" subdomain,
    // talks to "prod-packager-packages.codesandbox.io" to resolve npm
    // dependencies, and posts to "codesandbox.io/api/v1/sandboxes/define"
    // for the "Open in CodeSandbox" export action. This only widens those
    // three directives to allow that traffic; every other directive is left
    // unset (fully permissive, matching current behavior) so it doesn't
    // newly restrict anything else the app already does (AI-generated HTML
    // artifacts loading arbitrary CDN scripts/fonts, blob/data URL exports).
    // "https://vercel.live" in frame-src/script-src is Vercel's own preview
    // comments/toolbar overlay, injected automatically on Vercel preview
    // deployments — without it the toolbar's iframe and script are blocked.
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "frame-src 'self' https://*.codesandbox.io https://vercel.live",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
              "connect-src 'self' https://*.codesandbox.io https://codesandbox.io",
              "form-action 'self' https://codesandbox.io",
            ].join('; '),
          },
        ],
      },
    ];
  },
  webpack: (config, {dev, isServer, webpack}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // File watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        https: false,
        http: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        zlib: false,
      };

      // Strip "node:" schemes so they can be handled by standard fallbacks on the client
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
    }
    return config;
  },
};

export default nextConfig;
