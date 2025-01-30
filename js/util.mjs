import { Context2D } from '/js/context2d.mjs';
import { Point2 } from '/js/linalg.mjs';


const contexts = [];
let globalAlpha = 1;
let lineWidth = 20;
let miterLimit = 4;

const JOINS = ['miter', 'bevel', 'round'];
const CYAN = ['#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff'];
const COLORS = ['red', 'green', 'blue', 'cyan', 'yellow', 'magenta', 'red', 'green', 'blue', 'cyan'];


export function setGlobalAlpha(value) {
    globalAlpha = value;
    contexts.forEach(redraw);
}


export function setLineWidth(value) {
    lineWidth = value;
    contexts.forEach(redraw);
}


export function setMiterLimit(value) {
    miterLimit = value;
    contexts.forEach(redraw);
}


function visualizeOne(ctx, points, offset) {
    let valid = 0;
    for (let k of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = 1;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = JOINS[i];
            ctx.strokeGradient(points.map(({ x, y }) => new Point2(x + 250 * i + offset, y * k + 100 * (k + 3))), CYAN);
            ctx.strokeStyle = '#dd0000';
            ctx.globalAlpha = .55;
            ctx.beginPath();
            for (const point of points) {
                ctx.lineTo(new Point2(point.x + 250 * i + offset, point.y * k + 100 * (k + 3)));
            }
            ctx.stroke();

            const data = ctx.getImageData(250 * i + offset, 200 * (k + 1), 250, 200).data;
            let found = 0;
            let opaque = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (r > 200 && g < 10 && b < 10 && a > 50 || r < 10 && g > 240 && b > 240 && a > 50)
                    found++;
                if (a > 50)
                    opaque++;
            }
            ctx.font = '16px sans-serif';
            const pct = (100 - 100 * found / opaque).toFixed(1);
            if (pct < 99) {
                ctx.fillStyle = 'red';
                ctx.fillText(`✗ ${pct} %`, 250 * i + offset + 10, 200 * (k + 1) + 20);
            }
            else {
                valid++;
                ctx.fillStyle = 'green';
                ctx.fillText(`✓ ${pct} %`, 250 * i + offset + 10, 200 * (k + 1) + 20);
            }

            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#000000';
            ctx.beginPath();
            for (const point of points) {
                ctx.lineTo(new Point2(point.x + 250 * i + offset, point.y * k + 100 * (k + 5)));
            }
            ctx.stroke();

            ctx.globalAlpha = globalAlpha;

            ctx.strokeGradient(points.map(({ x, y }) => new Point2(x + 250 * i + offset, y * k + 100 * (k + 5))), COLORS);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#00ff00';
            ctx.beginPath();
            for (const point of points) {
                ctx.lineTo(new Point2(point.x + 250 * i + offset, point.y * k + 100 * (k + 3)));
            }
            ctx.stroke();
        }
    }
    return valid;
}


function redraw({ ctx, points, section, description }) {
    ctx.clearRect(0, 0, 1600, 800);
    ctx.miterLimit = miterLimit;
    const valid = visualizeOne(ctx, points, 0) + visualizeOne(ctx, points.toReversed(), 750);
    section.h3.textContent = `${description} (${valid} / 12)`;
    if (valid === 12) {
        section.className = 'valid';
    }
    else {
        section.className = 'invalid';
    }
}


export function visualize(description, points) {
    const section = document.createElement('section');
    const h3 = document.createElement('h3');
    section.appendChild(h3);
    section.h3 = h3;
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 800;
    section.appendChild(canvas);
    document.body.appendChild(section);
    const ctx = canvas.getContext('2d');
    Object.setPrototypeOf(ctx, Context2D.prototype);
    const context = { ctx: ctx, points: points, section: section, description: description };
    contexts.push(context);
    redraw(context);
}
