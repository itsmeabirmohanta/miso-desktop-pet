// Configuration for signed releases (.github/workflows/release.yml only).
// It adds the signing certificate's publisher to app-update.yml, so installed
// copies reject update installers that are not signed by that publisher.
// Normal and CI test builds keep package.json's configuration unchanged.
const { build } = require("../package.json");
const [publish] = [build.publish].flat();
module.exports = {
  ...build,
  publish: [{ ...publish, publisherName: ["SignPath Foundation"] }],
};
