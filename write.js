// EdgeOne Pages Function —— 智能表格写入转发（解决浏览器 CORS 直连被拦截的问题）
//
// 作用：浏览器直连 qyapi.weixin.qq.com 会因 CORS 预检失败被拦截。本函数部署在服务端，
//       补上 CORS 响应头后把请求原样转发给微信 Webhook；Webhook key 留在服务端，
//       前端页面只调用本函数地址，不再暴露 key。
//
// 部署步骤：
//   1. 把本文件放到一个 git 仓库根目录的  functions/api/write.js
//      （目录名必须是 functions，文件名 write.js 对应路由 /api/write）
//   2. 到腾讯云 EdgeOne Pages 控制台「新建项目」并关联该仓库，框架选「无/其他」，
//      构建命令留空，输出目录留空，直接部署。
//   3. 部署完成后会得到形如  https://<你的项目>.edgeonepages.com  的域名，
//      函数地址即  https://<你的项目>.edgeonepages.com/api/write
//   4. （可选，更安全）在 EdgeOne Pages 项目「环境变量」里加  WECOM_WEBHOOK = 完整 webhook 地址，
//      不配则用下方 DEFAULT_WEBHOOK 常量兜底。
//   5. 把上面得到的函数地址填到 HTML 源码顶部的  SMART_RELAY_URL  常量里即可。
//
// 调用方式（页面已适配）：POST  application/json  体为  {"add_records":[{...}, ...]}

const DEFAULT_WEBHOOK =
  "https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/webhook?key=m22GdPbFaTbfL9WVksv0RHvaIkf4JYA5etDTAN8FVPGL6FhBGSrpTuUGi6ILJqRQ92Sn19ET8xMOZ5CpenxfFejbnKkyFPXWCbFXBIPFKIb";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // 预检请求：直接回 204 + CORS 头，浏览器才会放行后续 POST
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
    }

    const webhook = (env && env.WECOM_WEBHOOK) || DEFAULT_WEBHOOK;

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return new Response(JSON.stringify({ errcode: -1, errmsg: "读取请求体失败" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    try {
      const upstream = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });
      const respText = await upstream.text();
      return new Response(respText, {
        status: upstream.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ errcode: -1, errmsg: "转发到企业微信失败: " + (e && e.message ? e.message : e) }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  },
};
