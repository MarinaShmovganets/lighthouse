/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../../types/lh.js'

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
export class NetworkRequest<T=any> {
    /** The canonical network record. */
    record?: T;

    static get TYPES(): LH.Util.SelfMap<LH.Crdp.Network.ResourceType>;

    isNonNetworkRequest(): boolean;
    requestId: string;
    connectionId: string;
    connectionReused: boolean;
    url: string;
    protocol: string;
    parsedURL: ParsedURL;
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
    fromDiskCache: boolean;
    fromMemoryCache: boolean;
    // TODO(15841): remove from lantern.
    /** Extra timing information available only when run in Lightrider. */
    lrStatistics: LightriderStatistics | undefined;
    finished: boolean;
    statusCode: number;
    /** The network request that this one redirected to */
    redirectDestination: NetworkRequest<T> | undefined;
    failed: boolean;
    initiator: LH.Crdp.Network.Initiator;
    timing: LH.Crdp.Network.ResourceTiming | undefined;
    resourceType: LH.Crdp.Network.ResourceType | undefined;
    priority: LH.Crdp.Network.ResourcePriority;
}

export {};
