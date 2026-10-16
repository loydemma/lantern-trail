/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'lantern-trail',
      // Production resources are retained on `sst remove`; dev stages are torn down.
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: { aws: { region: 'us-east-1' } },
    }
  },
  async run() {
    // Static site: S3 + CloudFront. No secrets or server code.
    new sst.aws.StaticSite('LanternTrail', {
      build: { command: 'npm run build', output: 'dist' },
    })
  },
})
