/** HttpOnly Cookie 名，与登录接口 Set-Cookie 一致，供服务端校验 /admin 与 API 代理透传 */
export const AUTH_COOKIE_NAME = "access_token";

/** Cookie 秒数：7 天 */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
