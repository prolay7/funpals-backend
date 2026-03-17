import { StreamClient } from "@stream-io/node-sdk";
import { StreamUtilities } from "./stream.utils";
export class StreamCallClient {
    public static instance:StreamClient;
    public  static getInstance(): StreamClient {
        if(!StreamCallClient.instance) {
            const apiKey = StreamUtilities.getStreamApiKey();
            const apiSecret = StreamUtilities.getStreamApiSecret();
            StreamCallClient.instance = new StreamClient(apiKey, apiSecret);
        }
        return StreamCallClient.instance;
    }
}