/// <reference path="./global-lh.d.ts"/>

export = lighthouse;
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
declare function lighthouse(url?: string, flags?: LH.Flags, configJSON?: LH.Config.Json, userConnection?: Connection): Promise<LH.RunnerResult | undefined>;
declare namespace lighthouse {
    export { generateConfig, getAuditList, traceCategories, Audit, Gatherer, NetworkRecords, Connection };
}
/**
 * Generate a Lighthouse Config.
 * @param {LH.Config.Json=} configJson Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @return {Config}
 */
declare function generateConfig(configJson?: LH.Config.Json, flags?: LH.Flags): LH.Config.Json;
declare function getAuditList(): string[];
declare function traceCategories(): string[];
declare var Audit: typeof LH.Audit;
declare var Gatherer: LH.Gatherer.GathererInstance;

declare class Connection {
    constructor();
    // Not implemented, will throw currently
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    wsEndpoint(): Promise<void>;

    sendCommand<C extends keyof LH.CrdpCommands>(
        method: C,
        sessionId: string | undefined,
        paramArgs: LH.CrdpCommands[C]['paramsType']
    ): Promise<LH.CrdpCommands[C]['returnType']>;
    on(eventName: 'protocolevent', cb: (arg0: LH.Protocol.RawEventMessage) => void): void;
    off(eventName: 'protocolevent', cb: (arg0: LH.Protocol.RawEventMessage) => void): void;
    protected sendRawMessage(message: string): void;
    protected handleRawMessage(message: string): void;
    emitProtocolEvent(eventMessage: LH.Protocol.RawEventMessage): void;
    protected dispose(): void;
}

type NetworkRecords_Return = Promise<Array<LH.Artifacts.NetworkRequest>>;
declare class NetworkRecords_ {
    static compute_(devtoolsLog: LH.DevtoolsLog): NetworkRecords_Return
}

declare var NetworkRecords: NetworkRecords_ & {
    request: (dependencies: LH.DevtoolsLog, context: LH.Artifacts.ComputedContext)
        => NetworkRecords_Return
}