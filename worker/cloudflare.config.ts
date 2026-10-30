import { bindings, defineConfig, triggers } from 'cf/config';
export default defineConfig({ accountId: '603e47c2aa30fbfad821cd870f50ea21', worker: {
  name: 'ocean-free-push', entrypoint: './src/index.ts', compatibilityDate: '2026-10-30',
  env: { DB: bindings.d1({ name: 'ocean-free-push' }), VAPID_JSON: bindings.secret(), FIREBASE_READER_JSON: bindings.secret(), BENCHMARK_TOKEN: bindings.secret(),
    PUSH_ENABLED: bindings.text('false'), PREVIEWS_ENABLED: bindings.text('false'),
    RULES_ATTESTATION_READY: bindings.text('false'), ATTESTATION_SINCE: bindings.text('2026-10-30T10:24:07Z'), IDENTITY_MAP: bindings.text('{}') },
  triggers: [triggers.scheduled({schedule:'* * * * *'})],
  observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.01 } },
}});
