/** Optional isolated output avoids Windows file locks while a local preview is running. */
const config = { distDir: process.env.HANDSIN_ISOLATED_BUILD === '1' ? '.care-build' : '.next' };
export default config;
