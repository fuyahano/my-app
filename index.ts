import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// 本番DBへの接続準備
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));

// --- ルーティング ---

// 1. トップページ（ユーザー一覧 と 教科書一覧を表示）
app.get("/", async (req, res) => {
  // 💡 データベースから「ユーザー全員」と「出品されている教科書全員」を両方取得します
  const users = await prisma.user.findMany();
  const products = await prisma.product.findMany({
    include: {
      seller: true, // 出品者の名前なども一緒に取得する
    },
    orderBy: {
      createdAt: "desc", // 新着順
    },
  });

  // 💡 ここで users と products の両方を ejs に渡すのが超重要です！
  res.render("index", { users, products });
});

// 2. ユーザー登録
app.post("/users", async (req, res) => {
  const name = req.body.name;
  if (name) {
    await prisma.user.create({
      data: {
        name,
        email: `${Date.now()}@example.com`,
        password: "hashed_password_dummy", 
      },
    });
  }
  res.redirect("/");
});

// 3. 教科書の出品
app.post("/products", async (req, res) => {
  const { title, description, price, condition, sellerId } = req.body;

  if (!title || !price || !sellerId) {
    return res.status(400).send("タイトル、価格、出品者は必須です");
  }

  try {
    await prisma.product.create({
      data: {
        title,
        description: description || "説明はありません",
        price: parseInt(price, 10),
        condition: condition || "GOOD",
        imageUrl: "https://placehold.co/600x400?text=Textbook",
        sellerId,
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error("出品エラー:", error);
    res.status(500).send("出品に失敗しました");
  }
});

app.listen(PORT, () => {
  console.log(`アプリが起動したぞ！ http://localhost:${PORT}`);
});
