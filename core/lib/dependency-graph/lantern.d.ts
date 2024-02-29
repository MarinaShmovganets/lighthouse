/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../../types/lh.js'

export type HeaderEntry = {
    name: string;
    value: string;
};
export type ParsedURL = {
    /**
     * Equivalent to a `new URL(url).protocol` BUT w/o the trailing colon (:)
     */
    scheme: string;
    /**
     * Equivalent to a `new URL(url).hostname`
     */
    host: string;
    securityOrigin: string;
};
export type LightriderStatistics = {
    /**
     * The difference in networkEndTime between the observed Lighthouse networkEndTime and Lightrider's derived networkEndTime.
     */
    endTimeDeltaMs: number;
    /**
     * The time spent making a TCP connection (connect + SSL). Note: this is poorly named.
     */
    TCPMs: number;
    /**
     * The time spent requesting a resource from a remote server, we use this to approx RTT. Note: this is poorly names, it really should be "server response time".
     */
    requestMs: number;
    /**
     * Time to receive the entire response payload starting the clock on receiving the first fragment (first non-header byte).
     */
    responseMs: number;
};
export class NetworkRequest {
    /**
     * Convert the requestId to backend-version by removing the `:redirect` portion
     *
     * @param {string} requestId
     * @return {string}
     */
    static getRequestIdForBackend(requestId: string): string;
    /**
     * Based on DevTools NetworkManager.
     * @see https://github.com/ChromeDevTools/devtools-frontend/blob/3415ee28e86a3f4bcc2e15b652d22069938df3a6/front_end/sdk/NetworkManager.js#L285-L297
     * @param {LH.Crdp.Network.Headers} headersDict
     * @return {Array<HeaderEntry>}
     */
    static _headersDictToHeadersArray(headersDict: LH.Crdp.Network.Headers): Array<HeaderEntry>;
    static get TYPES(): LH.Util.SelfMap<LH.Crdp.Network.ResourceType>;
    /**
     * @param {{protocol: string, parsedURL: ParsedURL}} record
     * @return {boolean}
     */
    static isNonNetworkRequest(record: {
        protocol: string;
        parsedURL: ParsedURL;
    }): boolean;
    /**
     * @return {boolean}
     */
    isNonNetworkRequest(): boolean;
    /**
     * Technically there's not alignment on URLs that create "secure connections" vs "secure contexts"
     * https://github.com/GoogleChrome/lighthouse/pull/11766#discussion_r582340683
     * But for our purposes, we don't need to worry too much.
     * @param {Lantern.NetworkRequest} record
     * @return {boolean}
     */
    static isSecureRequest(record: NetworkRequest): boolean;
    /**
     * Returns whether the network request was an HSTS redirect request.
     * @param {Lantern.NetworkRequest} record
     * @return {boolean}
     */
    static isHstsRequest(record: NetworkRequest): boolean;
    /**
     * Returns whether the network request was sent encoded.
     * @param {Lantern.NetworkRequest} record
     * @return {boolean}
     */
    static isContentEncoded(record: NetworkRequest): boolean;
    /**
     * Resource size is almost always the right one to be using because of the below:
     *     `transferSize = resourceSize + headers.length`.
     * HOWEVER, there are some cases where an image is compressed again over the network and transfer size
     * is smaller (see https://github.com/GoogleChrome/lighthouse/pull/4968).
     * Use the min of the two numbers to be safe.
     * `tranferSize` of cached records is 0
     * @param {Lantern.NetworkRequest} networkRecord
     * @return {number}
     */
    static getResourceSizeOnNetwork(networkRecord: NetworkRequest): number;
    requestId: string;
    connectionId: string;
    connectionReused: boolean;
    url: string;
    protocol: string;
    isSecure: boolean;
    isValid: boolean;
    parsedURL: ParsedURL;
    documentURL: string;
    /** When the renderer process initially discovers a network request, in milliseconds. */
    rendererStartTime: number;
    /**
     * When the network service is about to handle a request, ie. just before going to the
     * HTTP cache or going to the network for DNS/connection setup, in milliseconds.
     */
    networkRequestTime: number;
    /** When the last byte of the response headers is received, in milliseconds. */
    responseHeadersEndTime: number;
    /** When the last byte of the response body is received, in milliseconds. */
    networkEndTime: number;
    transferSize: number;
    responseHeadersTransferSize: number;
    resourceSize: number;
    fromDiskCache: boolean;
    fromMemoryCache: boolean;
    fromPrefetchCache: boolean;
    /** @type {LightriderStatistics|undefined} Extra timing information available only when run in Lightrider. */
    lrStatistics: LightriderStatistics | undefined;
    finished: boolean;
    requestMethod: string;
    statusCode: number;
    /** @type {Lantern.NetworkRequest|undefined} The network request that redirected to this one */
    redirectSource: NetworkRequest | undefined;
    /** @type {Lantern.NetworkRequest|undefined} The network request that this one redirected to */
    redirectDestination: NetworkRequest | undefined;
    /** @type {Lantern.NetworkRequest[]|undefined} The chain of network requests that redirected to this one */
    redirects: NetworkRequest[] | undefined;
    failed: boolean;
    localizedFailDescription: string;
    /** @type {LH.Crdp.Network.Initiator} */
    initiator: LH.Crdp.Network.Initiator;
    /** @type {LH.Crdp.Network.ResourceTiming|undefined} */
    timing: LH.Crdp.Network.ResourceTiming | undefined;
    /** @type {LH.Crdp.Network.ResourceType|undefined} */
    resourceType: LH.Crdp.Network.ResourceType | undefined;
    mimeType: string;
    /** @type {LH.Crdp.Network.ResourcePriority} */
    priority: LH.Crdp.Network.ResourcePriority;
    /** @type {Lantern.NetworkRequest|undefined} */
    initiatorRequest: NetworkRequest | undefined;
    /** @type {HeaderEntry[]} */
    responseHeaders: HeaderEntry[];
    /** @type {string} */
    responseHeadersText: string;
    fetchedViaServiceWorker: boolean;
    /** @type {string|undefined} */
    frameId: string | undefined;
    /** @type {string|undefined} */
    sessionId: string | undefined;
    /** @type {LH.Protocol.TargetType|undefined} */
    sessionTargetType: LH.Protocol.TargetType | undefined;
    isLinkPreload: boolean;
    /**
     * @return {boolean}
     */
    hasErrorStatusCode(): boolean;
    /**
     * @param {Lantern.NetworkRequest} initiatorRequest
     */
    setInitiatorRequest(initiatorRequest: NetworkRequest): void;
    /**
     * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
     */
    onRequestWillBeSent(data: LH.Crdp.Network.RequestWillBeSentEvent): void;
    onRequestServedFromCache(): void;
    /**
     * @param {LH.Crdp.Network.ResponseReceivedEvent} data
     */
    onResponseReceived(data: LH.Crdp.Network.ResponseReceivedEvent): void;
    /**
     * @param {LH.Crdp.Network.ResponseReceivedExtraInfoEvent} data
     */
    onResponseReceivedExtraInfo(data: LH.Crdp.Network.ResponseReceivedExtraInfoEvent): void;
    /**
     * @param {LH.Crdp.Network.DataReceivedEvent} data
     */
    onDataReceived(data: LH.Crdp.Network.DataReceivedEvent): void;
    /**
     * @param {LH.Crdp.Network.LoadingFinishedEvent} data
     */
    onLoadingFinished(data: LH.Crdp.Network.LoadingFinishedEvent): void;
    /**
     * @param {LH.Crdp.Network.LoadingFailedEvent} data
     */
    onLoadingFailed(data: LH.Crdp.Network.LoadingFailedEvent): void;
    /**
     * @param {LH.Crdp.Network.ResourceChangedPriorityEvent} data
     */
    onResourceChangedPriority(data: LH.Crdp.Network.ResourceChangedPriorityEvent): void;
    /**
     * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
     */
    onRedirectResponse(data: LH.Crdp.Network.RequestWillBeSentEvent): void;
    /**
     * @param {string|undefined} sessionId
     */
    setSession(sessionId: string | undefined): void;
    get isOutOfProcessIframe(): boolean;
    /**
     * @param {LH.Crdp.Network.Response} response
     * @param {number} timestamp in seconds
     * @param {LH.Crdp.Network.ResponseReceivedEvent['type']=} resourceType
     */
    _onResponse(response: LH.Crdp.Network.Response, timestamp: number, resourceType?: LH.Crdp.Network.ResponseReceivedEvent['type'] | undefined): void;
    /**
     * Resolve differences between conflicting timing signals. Based on the property setters in DevTools.
     * @see https://github.com/ChromeDevTools/devtools-frontend/blob/56a99365197b85c24b732ac92b0ac70feed80179/front_end/sdk/NetworkRequest.js#L485-L502
     * @param {LH.Crdp.Network.ResourceTiming} timing
     */
    _recomputeTimesWithResourceTiming(timing: LH.Crdp.Network.ResourceTiming): void;
    /**
     * Update responseHeadersEndTime to the networkEndTime if networkEndTime is earlier.
     * A response can't be received after the entire request finished.
     */
    _updateResponseHeadersEndTimeIfNecessary(): void;
    /**
     * LR loses transfer size information, but passes it in the 'X-TotalFetchedSize' header.
     * 'X-TotalFetchedSize' is the canonical transfer size in LR. Nothing should supersede it.
     *
     * The total length of the encoded data is spread out among multiple events. The sum of the
     * values in onResponseReceived and all the onDataReceived events typically equals the value
     * seen on the onLoadingFinished event. In <1% of cases we see the values differ. As we process
     * onResponseReceived and onDataReceived we accumulate the total encodedDataLength. When we
     * process onLoadingFinished, we override the accumulated total. We do this so that if the
     * request is aborted or fails, we still get a value via the accumulation.
     *
     * In Lightrider, due to instrumentation limitations, our values for encodedDataLength are bogus
     * and not valid. However the resource's true encodedDataLength/transferSize is shared via a
     * special response header, X-TotalFetchedSize. In this situation, we read this value from
     * responseReceived, use it for the transferSize and ignore the encodedDataLength values in
     * both dataReceived and loadingFinished.
     */
    _updateTransferSizeForLightrider(): void;
    /**
     * LR loses protocol information.
     */
    _updateProtocolForLightrider(): void;
    /**
     * TODO(compat): remove M116.
     * `timing.receiveHeadersStart` was added recently, and will be in M116. Until then,
     * set it to receiveHeadersEnd, which is close enough, to allow consumers of NetworkRequest
     * to use the new field without accounting for this backcompat.
     */
    _backfillReceiveHeaderStartTiming(): void;
    /**
     * LR gets additional, accurate timing information from its underlying fetch infrastructure.  This
     * is passed in via X-Headers similar to 'X-TotalFetchedSize'.
     */
    _updateTimingsForLightrider(): void;
}
export namespace NetworkRequest {
    export { HEADER_TCP };
    export { HEADER_SSL };
    export { HEADER_REQ };
    export { HEADER_RES };
    export { HEADER_TOTAL };
    export { HEADER_FETCHED_SIZE };
    export { HEADER_PROTOCOL_IS_H2 };
}

declare const HEADER_TCP: "X-TCPMs";
declare const HEADER_SSL: "X-SSLMs";
declare const HEADER_REQ: "X-RequestMs";
declare const HEADER_RES: "X-ResponseMs";
declare const HEADER_TOTAL: "X-TotalMs";
declare const HEADER_FETCHED_SIZE: "X-TotalFetchedSize";
declare const HEADER_PROTOCOL_IS_H2: "X-ProtocolIsH2";
export {};
