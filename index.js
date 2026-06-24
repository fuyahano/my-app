import http from "node:http";

// ポート番号の設定（Renderなどの本番環境では環境変数 PORT が使われる）
const PORT = process.env.PORT || 8888;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // 日本語が文字化けしないよう charset=utf-8 を指定するのじゃ
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (url.pathname === "/") {
    console.log("GET /");
    res.writeHead(200);
    res.end("こんにちは！");
  } else if (url.pathname === "/ask") {
    console.log("GET /ask");
    const q = url.searchParams.get("q") ?? "";
    res.writeHead(200);
    res.end(`お主の質問は '${q}' かの？`);
  } else {
    res.writeHead(404);
    res.end("ページが見つかりませぬ");
  }
});

server.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});
