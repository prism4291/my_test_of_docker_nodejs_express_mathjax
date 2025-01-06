const express = require('express');
const app = express();
const port = 3000;
const mathjax = require('mathjax');
const sharp = require('sharp');

const renderMathToSVG = async (mathInput) => {
  try {
    const mjInstance = await mathjax.init({
      loader: { load: ['input/tex', 'output/svg'] },
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
        const svgBuffer = Buffer.from(svgString);
        const metadata = await sharp(svgBuffer).metadata();
        const pngBuffer = await sharp(svgBuffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .resize({ width: metadata.width * 10, height: metadata.height * 10 })
            .extend({
                top: 20,
                bottom: 20,
                left: 20,
                right: 20,
                background: { r: 255, g: 255, b: 255 },
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
