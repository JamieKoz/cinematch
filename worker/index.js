var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var OPENAI_PATH = "/api/openai/chat/completions";
var TMDB_PREFIX = "/api/tmdb";
function json(data, status) {
    if (status === void 0) { status = 200; }
    return Response.json(data, { status: status });
}
function openAiBaseUrl(env) {
    var _a;
    var raw = ((_a = env.OPENAI_BASE_URL) !== null && _a !== void 0 ? _a : "https://api.openai.com/v1").replace(/\/$/, "");
    return raw;
}
export default {
    fetch: function (request, env) {
        return __awaiter(this, void 0, void 0, function () {
            var url, openaiModels, key, upstreamUrl, contentType, upstream, headers, resCt, token, rest, target;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        url = new URL(request.url);
                        if (url.pathname === "/api/config" && request.method === "GET") {
                            openaiModels = ((_a = env.AI_MODELS) !== null && _a !== void 0 ? _a : "gpt-4.1-mini")
                                .split(",")
                                .map(function (m) { return m.trim(); })
                                .filter(Boolean);
                            return [2 /*return*/, json({
                                    ai: Boolean(env.OPENAI_API_KEY),
                                    tmdb: Boolean(env.TMDB_READ_ACCESS_TOKEN),
                                    openaiModels: openaiModels
                                })];
                        }
                        if (!(url.pathname === OPENAI_PATH && request.method === "POST")) return [3 /*break*/, 2];
                        key = env.OPENAI_API_KEY;
                        if (!key)
                            return [2 /*return*/, json({ error: "OpenAI is not configured" }, 503)];
                        upstreamUrl = "".concat(openAiBaseUrl(env), "/chat/completions");
                        contentType = (_b = request.headers.get("content-type")) !== null && _b !== void 0 ? _b : "application/json";
                        return [4 /*yield*/, fetch(upstreamUrl, {
                                method: "POST",
                                headers: {
                                    Authorization: "Bearer ".concat(key),
                                    "Content-Type": contentType
                                },
                                body: request.body
                            })];
                    case 1:
                        upstream = _c.sent();
                        headers = new Headers();
                        resCt = upstream.headers.get("content-type");
                        if (resCt)
                            headers.set("content-type", resCt);
                        return [2 /*return*/, new Response(upstream.body, { status: upstream.status, headers: headers })];
                    case 2:
                        if (url.pathname.startsWith("".concat(TMDB_PREFIX, "/")) && request.method === "GET") {
                            token = env.TMDB_READ_ACCESS_TOKEN;
                            if (!token)
                                return [2 /*return*/, json({ error: "TMDB is not configured" }, 503)];
                            rest = url.pathname.slice(TMDB_PREFIX.length);
                            target = new URL("https://api.themoviedb.org".concat(rest).concat(url.search));
                            return [2 /*return*/, fetch(target, {
                                    headers: {
                                        Authorization: "Bearer ".concat(token),
                                        accept: "application/json"
                                    }
                                })];
                        }
                        if (url.pathname.startsWith("/api/")) {
                            return [2 /*return*/, new Response(null, { status: 404 })];
                        }
                        return [2 /*return*/, new Response(null, { status: 404 })];
                }
            });
        });
    }
};
