import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

// 💡 ES Module対応：__dirname の代わりに path.resolve() を使用
const uploadDir = path.resolve("public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 💡 multerの設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, uniqueSuffix);
  },
});
const upload = multer({ storage: storage });

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));

// 💡 静的ファイルの配信設定（ここも path.resolve を使用）
app.use("/public", express.static(path.resolve("public")));

// --- ルーティング ---

app.get("/", async (req, res) => {
  const users = await prisma.user.findMany();
  const products = await prisma.product.findMany({
    include: { seller: true },
    orderBy: { createdAt: "desc" },
  });
  res.render("index", { users, products });
});

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

app.post("/products", upload.single("image"), async (req, res) => {
  const { title, description, price, condition, sellerId } = req.body;

  if (!title || !price || !sellerId) {
    return res.status(400).send("タイトル、価格、出品者は必須です");
  }

  let imageUrl = "https://placehold.co/600x400?text=No+Image";
  if (req.file) {
    imageUrl = `/public/uploads/${req.file.filename}`;
  }

  try {
    await prisma.product.create({
      data: {
        title,
        description: description || "説明はありません",
        price: parseInt(price, 10),
        condition: condition || "GOOD",
        imageUrl: imageUrl,
        sellerId,
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error("出品エラー:", error);
    res.status(500).send("出品に失敗しました");
  }
});

app.post("/products/:id/buy", async (req, res) => {
  const productId = req.params.id;
  const { buyerId } = req.body;

  if (!buyerId) {
    return res.status(400).send("購入者を選択してください");
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        isSoldOut: true,
        buyerId: buyerId,
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error("購入エラー:", error);
    res.status(500).send("購入処理に失敗しました");
  }
});

app.listen(PORT, () => {
  console.log(`アプリが起動したぞ！ http://localhost:${PORT}`);
});