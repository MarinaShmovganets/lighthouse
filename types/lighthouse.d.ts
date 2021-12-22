export = lighthouse;
/** @typedef {import('./gather/connections/connection.js')} Connection */
/**
 * Run Lighthouse.
 * @param {string=} url The URL to test. Optional if running in auditMode.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @param {LH.Config.Json=} configJSON Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {Connection=} userConnection
 * @return {Promise<LH.RunnerResult|undefined>}
 */
declare function lighthouse(url?: string | undefined, flags?: LH.Flags, configJSON?: LH.Config.Json, userConnection?: any): Promise<LH.RunnerResult | undefined>;
declare namespace lighthouse {
    export { generateConfig, unknown as getAuditList, traceCategories, Audit, Gatherer, NetworkRecords, Connection };
}
/**
 * Generate a Lighthouse Config.
 * @param {LH.Config.Json=} configJson Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @return {Config}
 */
declare function generateConfig(configJson?: LH.Config.Json, flags?: LH.Flags): Config;
declare var traceCategories: any;
declare var Audit: any;
declare var Gatherer: any;
declare var NetworkRecords: any;
type Connection = any;
