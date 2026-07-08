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

// 💡 アップロードされた画像を保存するフォルダ（public/uploads）を自動で作る
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 💡 multerの設定：保存先とファイル名のルールを決める
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 被らないように「時間 + 元の拡張子」で名前をつける
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, uniqueSuffix);
  },
});
const upload = multer({ storage: storage });

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));

// 💡 サーバー内の「public」フォルダを、ブラウザから画像URLとしてアクセスできるようにする設定
app.use("/public", express.static(path.join(__dirname, "public")));

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

// 💡 出品ルート：upload.single("image") で画像を1枚受け取る
app.post("/products", upload.single("image"), async (req, res) => {
  const { title, description, price, condition, sellerId } = req.body;

  if (!title || !price || !sellerId) {
    return res.status(400).send("タイトル、価格、出品者は必須です");
  }

  // 💡 画像がアップロードされていればそのURL、なければダミー画像にする
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
        imageUrl: imageUrl, // 💡 ここに画像のパスを保存！
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