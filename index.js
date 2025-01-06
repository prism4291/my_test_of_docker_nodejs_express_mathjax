const express = require('express');
const app = express();
const port = 3000;
const mathjax = require('mathjax');
const sharp = require('sharp');

const renderMathToSVG = async (mathInput) => {
  try {
    const mjInstance = await mathjax.init({
      loader: { load: ['input/tex', 'output/svg'] },
      svg: {
        scale: 1,                  // サイズ倍率
        displayAlign: 'center',    // 中央揃え
        displayIndent: '2em',      // インデントの指定 (余白)
      }
    });
    const svg = mjInstance.tex2svg(mathInput, { display: true });
    const svgString = mjInstance.startup.adaptor.innerHTML(svg);
    return svgString;
  } catch (error) {
    console.error("MathJax error:", error);
    throw new Error("Failed to render MathJax.");
  }
};

const convertSVGToPNG = async (svgString) => {
    try {
        // SVGのビュー情報を取得
        const matchViewBox = svgString.match(/viewBox="([\d.]+\s[\d.]+\s[\d.]+\s[\d.]+)"/);
        let width, height;
        
        if (matchViewBox) {
            const [x, y, w, h] = matchViewBox[1].split(' ').map(Number);
            width = w;
            height = h;
        } else {
            // デフォルトのメタデータ取得
            const metadata = await sharp(Buffer.from(svgString)).metadata();
            width = metadata.width;
            height = metadata.height;
        }

        if (!width || !height) {
            throw new Error('SVGのサイズ情報が見つかりませんでした。');
        }

        const scaleFactor = 8;
        const padding = 10;
        const scaledWidth = width * scaleFactor;
        const scaledHeight = height * scaleFactor;

        const pngBuffer = await sharp(Buffer.from(svgString))
            .resize({
                width: scaledWidth,
                height: scaledHeight,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255}
            })
            .extend({
                top: Math.round(padding),
                bottom: Math.round(padding),
                left: Math.round(padding),
                right: Math.round(padding),
                background: { r: 32, g: 32, b: 32}
            })
            .png()
            .toBuffer();

        return pngBuffer;
    } catch (error) {
        console.error("Sharp error:", error);
        throw new Error("Failed to convert SVG to PNG.");
    }
};

app.get('/', (req, res) => {
    res.send('Hello from Express in Docker!');
});

app.get('/mathjax', async (req, res) => {
    const mathInput = req.query.math;
    const mathWidth = req.query.w || 640;

    if (!mathInput || mathInput.trim() === "") {
        return res.status(400).send("Missing or empty 'math' parameter.");
    }

    try {
        const svgString = await renderMathToSVG(mathInput);
        const pngBuffer = await convertSVGToPNG(svgString);
        res.set('Content-Type', 'image/png');
        res.send(pngBuffer);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
