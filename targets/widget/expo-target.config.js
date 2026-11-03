/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'TenKWidget',
  displayName: '10,000 Hours',
  bundleIdentifier: '.widget',
  deploymentTarget: '16.2',
  icon: '../../assets/icon.png',
  colors: {
    $accent: '#C6FF2B',
    $widgetBackground: '#C6FF2B',
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
