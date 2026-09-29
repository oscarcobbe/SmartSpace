/**
 * Types for @m-lab/ndt7, which ships none. Only the parts the Wi-Fi check
 * calls, written from the package's own source (src/ndt7.js, v0.1.5).
 */
declare module "@m-lab/ndt7" {
  /** What the ndt7 server reports: Linux TCP_INFO, times in microseconds. */
  export interface Ndt7ServerMeasurement {
    TCPInfo?: {
      RTT?: number;
      RTTVar?: number;
      MinRTT?: number;
      BytesReceived?: number;
      BytesAcked?: number;
      ElapsedTime?: number;
    };
  }

  export interface Ndt7ClientMeasurement {
    ElapsedTime: number;
    NumBytes: number;
    MeanClientMbps: number;
  }

  export type Ndt7Measurement =
    | { Source: "client"; Data: Ndt7ClientMeasurement }
    | { Source: "server"; Data: Ndt7ServerMeasurement };

  export interface Ndt7Complete {
    LastClientMeasurement?: Ndt7ClientMeasurement;
    LastServerMeasurement?: Ndt7ServerMeasurement;
  }

  export interface Ndt7Server {
    machine?: string;
    location?: { city?: string; country?: string };
  }

  export interface Ndt7Config {
    userAcceptedDataPolicy?: boolean;
    downloadworkerfile?: string;
    uploadworkerfile?: string;
    metadata?: Record<string, string>;
    server?: string;
    protocol?: "ws" | "wss";
    loadbalancer?: string;
  }

  export interface Ndt7Callbacks {
    error?: (err: unknown) => void;
    serverDiscovery?: (d: { loadbalancer: URL }) => void;
    serverChosen?: (server: Ndt7Server) => void;
    downloadStart?: (d: unknown) => void;
    downloadMeasurement?: (m: Ndt7Measurement) => void;
    downloadComplete?: (m: Ndt7Complete) => void;
    uploadStart?: (d: unknown) => void;
    uploadMeasurement?: (m: Ndt7Measurement) => void;
    uploadComplete?: (m: Ndt7Complete) => void;
  }

  const ndt7: {
    /** Zero on success. */
    test(config: Ndt7Config, callbacks: Ndt7Callbacks): Promise<number>;
  };
  export default ndt7;
}
