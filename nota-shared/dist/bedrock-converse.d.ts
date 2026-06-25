import type OpenAI from "openai";
type Msg = OpenAI.Chat.ChatCompletionMessageParam;
export declare function bedrockChat(opts: {
    system: string;
    messages: Msg[];
    temperature: number;
    max_tokens: number;
    model: string;
}): Promise<string>;
export declare function bedrockChatStream(opts: {
    system: string;
    messages: Msg[];
    temperature: number;
    max_tokens: number;
    model: string;
}): AsyncGenerator<string, void, unknown>;
export {};
//# sourceMappingURL=bedrock-converse.d.ts.map