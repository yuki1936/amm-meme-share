const fs = require("fs");

const dir = "./images";
const files = fs.readdirSync(dir);

const images = files.map(file => `images/${file}`);

fs.writeFileSync("images.json", JSON.stringify(images, null, 2));

console.log("生成完成！");