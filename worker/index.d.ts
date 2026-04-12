export interface Env {
    OPENAI_API_KEY?: string;
    OPENAI_BASE_URL?: string;
    AI_MODELS?: string;
    TMDB_READ_ACCESS_TOKEN?: string;
}
declare const _default: {
    fetch(request: Request<unknown, IncomingRequestCfProperties<unknown>>, env: Env): Promise<Response>;
};
export default _default;
