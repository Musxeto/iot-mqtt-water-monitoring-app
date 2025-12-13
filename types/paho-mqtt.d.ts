declare module 'paho-mqtt' {
  export class Client {
    constructor(host: string, port: number, clientId: string);
    
    onConnectionLost: (responseObject: { errorCode: number; errorMessage: string }) => void;
    onMessageArrived: (message: Message) => void;
    
    connect(options: ConnectOptions): void;
    disconnect(): void;
    subscribe(topic: string, options?: SubscribeOptions): void;
    unsubscribe(topic: string, options?: UnsubscribeOptions): void;
    send(message: Message): void;
    isConnected(): boolean;
  }

  export class Message {
    constructor(payload: string | ArrayBuffer);
    
    payloadString: string;
    payloadBytes: ArrayBuffer;
    destinationName: string;
    qos: number;
    retained: boolean;
    duplicate: boolean;
  }

  interface ConnectOptions {
    onSuccess?: () => void;
    onFailure?: (error: unknown) => void;
    useSSL?: boolean;
    timeout?: number;
    userName?: string;
    password?: string;
    keepAliveInterval?: number;
    cleanSession?: boolean;
    willMessage?: Message;
    invocationContext?: object;
    reconnect?: boolean;
  }

  interface SubscribeOptions {
    qos?: number;
    onSuccess?: () => void;
    onFailure?: (error: unknown) => void;
    timeout?: number;
  }

  interface UnsubscribeOptions {
    onSuccess?: () => void;
    onFailure?: (error: unknown) => void;
    timeout?: number;
  }

  export default { Client, Message };
}
