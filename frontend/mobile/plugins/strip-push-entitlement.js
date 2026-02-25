const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * Strip aps-environment entitlement so the app builds
 * with a personal (free) Apple Developer team.
 * Local notifications still work without this entitlement.
 */
module.exports = function stripPushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults["aps-environment"];
    return mod;
  });
};
