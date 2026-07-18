const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const empty = path.resolve(__dirname, 'src/telemetry/emptyModule.js');

/**
 * @lmnr-ai/lmnr pulls Node OTEL/gRPC packages. Stub the ones Metro can't
 * bundle so Laminar.initialize({ forceHttp: true }) can load on web/native.
 */
const STUB_PREFIXES = [
  '@grpc/grpc-js',
  '@opentelemetry/exporter-trace-otlp-grpc',
  '@opentelemetry/otlp-grpc-exporter-base',
  '@opentelemetry/sdk-node',
  '@opentelemetry/sdk-trace-node',
  '@opentelemetry/context-async-hooks',
  'http2',
];

const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    STUB_PREFIXES.some(
      (p) => moduleName === p || moduleName.startsWith(p + '/')
    )
  ) {
    return { filePath: empty, type: 'sourceFile' };
  }
  if (defaultResolve) {
    return defaultResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
