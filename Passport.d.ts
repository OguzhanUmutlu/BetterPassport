import {NextFunction, Request, Response} from "express";

type ScopeList = [
    "identify", "email", "connections", "guilds", "guilds.join", "gdm.join", "rpc",
    "rpc.notifications.read", "rpc.voice.read", "rpc.voice.write", "rpc.activities.write",
    "bot", "webhook.incoming", "messages.read", "applications.builds.upload", "applications.builds.read",
    "applications.commands", "applications.store.update", "applications.entitlements",
    "activities.read", "activities.write", "relationships.read"
];

type DiscordScope =
    "identify" | "email" | "connections" | "guilds" | "guilds.join" | "gdm.join" | "rpc" |
    "rpc.notifications.read" | "rpc.voice.read" | "rpc.voice.write" | "rpc.activities.write" | "bot" |
    "webhook.incoming" | "messages.read" | "applications.builds.upload" | "applications.builds.read" |
    "applications.commands" | "applications.store.update" | "applications.entitlements" | "activities.read" |
    "activities.write" | "relationships.read";

type LocalPassportOptions = {
    config?: boolean,
    configFile?: string,
    configType?: "sqlite" | "json",
    httpOnly?: boolean
};

type DiscordPassportOptions = LocalPassportOptions & {
    clientId: string,
    clientSecret: string,
    callbackURL: string,
    scopes: DiscordScope[]
};

type TokenData<A> = {
    token: string,
    data: A
};

export class Passport<A, B, C> {
    constructor(options?: C);

    private init(options?: C): Promise<this>;

    getTokens(): Record<string, TokenData<A>>;

    /*** @internal */
    save(): this;

    /*** @internal */
    getToken(token: string): TokenData<A> | null;

    /*** @internal */
    setToken(token: string, data: TokenData<A>): this;

    /*** @internal */
    removeToken(token: string): this;

    createSession(request: Request, response: Response, userId: B, redirect?: string): this;

    setTokenCookie(request: Request, res: Response, name: string, token: string, redirect?: string): this;

    removeSession(request: Request): boolean;

    getTokensByUserId(userId: B): string[];

    setUserCallback(callback: (id: B) => void): this;

    callback(request: Request, response: Response, next: NextFunction): void;

    generateToken(): string;
}

export class Local extends Passport<{ id: number }, number, LocalPassportOptions> {
}

export class Discord extends Passport<Object, string, DiscordPassportOptions> {
    protected static SCOPES: ScopeList;

    createSession(request: Request, response: Response, data: Object, redirectURL?: string): this;

    createLoginCallback(options?: { success: Function, error: Function, redirectURL?: string }): (request: Request, response: Response) => void;
}

export function generateToken(): string;