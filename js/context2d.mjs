import { Point2 } from '/js/linalg.mjs';

export class Context2D extends CanvasRenderingContext2D {
    moveTo(p) {
        this._firstPoint = p;
        this._previousPoint = p;
        super.moveTo(p.x, p.y);
    }

    beginPath() {
        this._firstPoint = undefined;
        this._previousPoint = undefined;
        super.beginPath();
    }

    closePath() {
        this._firstPoint = undefined;
        this._previousPoint = undefined;
        super.closePath();
    }

    lineTo(p) {
        if (this._firstPoint === undefined)
            return this.moveTo(p);
        if (p == this._firstPoint)
            return this.closePath();
        if (p == this._previousPoint)
            return;
        super.lineTo(p.x, p.y);
        this._previousPoint = p;
    }

    line(s) {
        this.lineTo(s.p);
        this.lineTo(s.o);
    }

    arc(p, radius, v1, v2) {
        super.arc(p.x, p.y, radius, Math.atan2(v1.y, v1.x), Math.atan2(v2.y, v2.x));
    }

    circle(p, radius) {
        this.beginPath();
        super.arc(p.x, p.y, radius, 0, 2*Math.PI);
    }

    polygon(p) {
        this._firstPoint = undefined;
        for (const edge of p.edges())
            this.line(edge);
    }

    createLinearGradient(p1, p2) {
        return super.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    }

    clearRect(p, v) {
        let x = p.x;
        let y = p.y;
        if (v.x < 0)
            x += v.x;
        if (v.y < 0)
            y += v.y;
        return super.clearRect(x, y, Math.abs(v.x), Math.abs(v.y));
    }

    rect(p, v) {
        let x = p.x;
        let y = p.y;
        if (v.x < 0)
            x += v.x;
        if (v.y < 0)
            y += v.y;
        return super.rect(x, y, Math.abs(v.x), Math.abs(v.y));
    }

    scale(v) {
        return super.scale(v.x, v.y);
    }

    drawImage(image, p, v = null) {
        let x = p.x;
        let y = p.y;
        if (v === null)
            return super.drawImage(image, x, y);
        if (v.x < 0)
            x += v.x;
        if (v.y < 0)
            y += v.y;
        return super.drawImage(image, x, y, Math.abs(v.x), Math.abs(v.y));
    }

    strokeGradient(path, colors) {
        if (path.length < 2)
            return;

        // Build a rectangle with a contour between two points
        const _buildContour = (p1, p2) => {
            const n = p1.to(p2).normal().scaled(this.lineWidth / 2);
            return [p1.minus(n), p2.minus(n), p2.plus(n), p1.plus(n)];
        };

        // Mark a point to be rounded
        const _mark = p => {
            const newP = p.copy();
            newP.arc = true;
            return newP;
        };

        // Prepare join data for a polygon
        const _join = (polygon, oldJoin, oldT, degenerate) => {
            let result;
            // If there is no old join, the polygon is returned unmodified
            if (oldJoin === null) {
                result = polygon;
            }
            else {
                // If the current polygon bends towards the “right”, the first point needs to be
                // joined, instead of the actual join
                if (oldT < 1) {
                    polygon[0] = _mark(polygon[0]);
                    result = [oldJoin, ...polygon];
                    result.right = true;
                }
                // If the current polygon bends towards the “left”, the join needs to be joined,
                // but it does not actually hold the mark; the fourth point does
                else {
                    result = [...polygon, _mark(oldJoin)];
                    result.right = false;
                }
            }
            // Keep the degenerate bit
            if (degenerate)
                result.degenerate = true;
            return result;
        }

        // The list of polygons to draw at the end
        const polygons = [];

        // The current contour being processed
        let contour;
        // If the lineCap is 'square', add a margin to the first contour.
        if (this.lineCap === 'square') {
            const v = path[1].to(path[0]);
            const scale = this.lineWidth / (2 * v.norm());
            contour = _buildContour(path[0].plus(v.scaled(scale)), path[1]);
        }
        else {
            contour = _buildContour(path[0], path[1]);
        }

        // A factor to determine where contours intersect
        let t;
        // The previous one
        let oldT;
        // The previous join point
        let oldJoin = null;
        // The next processed contour
        let nextContour;
        let oldContour;
        // The current join point
        let join = null;
        // The polygon to build
        let polygon;
        let degenerate;

        // Iterate over the points in the path
        for (let i = 1; i < path.length - 1; i++, oldContour = contour, contour = nextContour,
                                             polygons.push(_join(polygon, oldJoin, oldT, degenerate)),
                                             oldT = t, oldJoin = join) {
            // If the lineCap is 'square', add a margin to the last contour
            if (i === path.length - 2 && this.lineCap === 'square') {
                const v = path[i].to(path[i + 1]);
                const scale = this.lineWidth / (2 * v.norm());
                nextContour = _buildContour(path[i], path[i + 1].plus(v.scaled(scale)));
            }
            else {
                nextContour = _buildContour(path[i], path[i + 1]);
            }

            // First “left” vector
            const v1l = contour[3].to(contour[2]);
            // Second “left” vector
            const v2l = nextContour[3].to(nextContour[2]);
            const det1 = v1l.cross(v2l);
            if (Math.abs(det1) < 1e-5) {
                polygon = contour;
                join = null;
                t = null;
                degenerate = false;
                if (v1l.dot(v2l) < 0) {
                    polygon[2].arc = true;
                    nextContour[0].arc = true;
                }
                continue;
            }
            // Compute the “left” intersection factor
            t = contour[3].to(nextContour[3]).cross(v2l) / det1;
            // The “left” intersection point (which may be outside of each segment)
            const leftIntersection = contour[3].plus(v1l.scaled(t));

            // First “right” vector
            const v1r = contour[0].to(contour[1]);
            // Second “right” vector
            const v2r = nextContour[0].to(nextContour[1]);
            const det2 = v1r.cross(v2r);
            if (Math.abs(det2) < 1e-5) {
                polygon = contour;
                join = null;
                t = null;
                degenerate = false;
                continue;
            }
            // Compute the “right” intersection factor
            const u = contour[0].to(nextContour[0]).cross(v2r) / det2;
            // The “right” intersection point (which may be outside of each segment)
            let rightIntersection = contour[0].plus(v1r.scaled(u));
            const v = v1l.cross(nextContour[3].to(contour[3])) / det1;

            // Our polygon is degenerate if intersections fall outside of it
            degenerate = t <= 0 || u <= 0 || v >= 1 || v <= -1;

            // Determine whether the join should be bevelled
            let isBevel;
            if (this.lineJoin === 'miter') {
                // Switch to a bevelled join if the intersection is beyond the miter limit
                const norm = v1l.norm() * v2l.norm();
                isBevel = Math.sqrt(2 * norm / (norm + v1l.dot(v2l))) > this.miterLimit;
            }
            else {
                isBevel = true;
            }

            // If the “left” intersection is on both “left” segments
            if (t < 1) {
                // If the join is bevelled, compute a bevelled join point
                if (isBevel) {
                    join = contour[1].plus(nextContour[0]).scaled(.5);
                }
                // Else, use the “right” intersection (which is outside of both “right” segments)
                else {
                    join = rightIntersection;
                }
                // Create our polygon
                if (degenerate) {
                    polygon = [contour[0], contour[1], join, contour[2], contour[3]];
                    polygon[2].arc = true;
                    join.arc = true;
                }
                else {
                    polygon = [contour[0], contour[1], _mark(join), leftIntersection, contour[3]];
                }
                // Use the current “left” intersection in the next contour
                if (!degenerate)
                    nextContour[3] = leftIntersection;
            }
            // If the “right” intersection is on both “right” segments
            else {
                // If the join is bevelled, compute a bevelled join point
                if (isBevel) {
                    join = contour[2].plus(nextContour[3]).scaled(.5);
                }
                // Else, use the “left” intersection (which is outside of both “left” segments)
                else {
                    join = leftIntersection;
                }
                contour[2].arc = true;
                // Create our polygon
                if (degenerate)
                    polygon = [contour[0], contour[1], join, contour[2], contour[3]];
                else
                    polygon = [contour[0], rightIntersection, join, contour[2], contour[3]];
                // Use the current “right” intersection in the next contour
                if (!degenerate)
                    nextContour[0] = rightIntersection;
            }
        }

        polygons.push(_join(contour, oldJoin, oldT, false))

        // If the line cap is round, draw a half-disk
        if (this.lineCap === 'round') {
            const p1 = path[0];
            const n = p1.to(path[1]).normal();
            this.beginPath();
            this.fillStyle = colors[0];
            this.arc(p1, this.lineWidth / 2, n, n.neg());
            this.fill();
        }

        // Draw each polygon
        for (let i = 0; i < polygons.length; i++) {
            const length = polygons[i].length;
            let gradientStart;
            let gradientEnd;
            let scalingFactor;
            switch (length) {
                // If the polygon has 4 sides, use the path points as anchor points for the gradient
                case 4:
                    gradientStart = path[i];
                    gradientEnd = path[i+1];
                    break;
                // If the polygon has 5 sides, find a good combination of anchor points so that we
                // can preserve gradient continuity as much as possible
                case 5:
                    if (polygons[i].right === undefined) {
                        if (i === polygons.length - 1) {
                            gradientStart = path[0];
                            gradientEnd = path[1];
                        }
                        else {
                            if (polygons[i + 1].right === true) {
                                gradientStart = polygons[i][4];
                                gradientEnd = polygons[i][3];
                            }
                            else {
                                gradientStart = polygons[i][0];
                                gradientEnd = polygons[i][1];
                            }
                        }
                    }
                    else {
                        if (polygons[i].right === true) {
                            gradientStart = polygons[i][4];
                            gradientEnd = polygons[i][3];
                        }
                        else {
                            gradientStart = polygons[i][0];
                            gradientEnd = polygons[i][1];
                        }
                        if (i !== polygons.length - 1 && polygons[i + 1].right !== undefined) {
                            if (polygons[i + 1].right === true)
                                gradientEnd = polygons[i + 1][0];
                            else
                                gradientEnd = polygons[i + 1].at(-1);
                        }
                    }
                    break;
                // Same thing with a slightly harder logic for 6 sides
                case 6:
                    let v2;
                    let v3;
                    if (polygons[i].right === true) {
                        gradientStart = polygons[i][5];
                        v2 = gradientStart.to(polygons[i][0]);
                        if (i === polygons.length - 1) {
                            gradientEnd = polygons[i][4];
                            v3 = gradientStart.to(polygons[i][1]);
                        }
                    }
                    else {
                        gradientStart = polygons[i][0];
                        v2 = gradientStart.to(polygons[i][5]);
                        if (i === polygons.length - 1) {
                            gradientEnd = polygons[i][1];
                            v3 = gradientStart.to(polygons[i][4]);
                        }
                    }
                    if (i !== polygons.length - 1) {
                        if (polygons[i + 1].right === true) {
                            gradientEnd = polygons[i + 1].at(-1);
                            v3 = gradientStart.to(polygons[i + 1][0]);
                        }
                        else {
                            gradientEnd = polygons[i + 1][0];
                            v3 = gradientStart.to(polygons[i + 1].at(-1));
                        }
                    }
                    const v1 = gradientStart.to(gradientEnd);
                    const t = v1.dot(v2) / v1.dot(v1);
                    const u = v1.dot(v3) / v1.dot(v1);
                    if (u - t > .3) {
                        const oldStart = gradientStart;
                        if (t > 0 && t < 1)
                            gradientStart = oldStart.plus(v1.scaled(t));
                        if (u > 0 && u < 1)
                            gradientEnd = oldStart.plus(v1.scaled(u));
                    }
                    else {
                        const n = polygons[i][5].to(polygons[i][0]).plus(polygons[i][3].to(polygons[i][2])).normal();
                        gradientStart = polygons[i][5];
                        gradientEnd = polygons[i][5].plus(n.scaled(polygons[i][5].to(polygons[i][2]).dot(n)));
                    }
                    break;
            }
            const gradient = this.createLinearGradient(gradientStart, gradientEnd);
            gradient.addColorStop(0, colors[i]);
            gradient.addColorStop(1, colors[i + 1]);
            this.fillStyle = gradient;

            // Drawing logic. Most of the work here is to determine how to draw round line joins.
            this.beginPath();
            let first;
            if (polygons[i][0].arc !== undefined) {
                if (polygons[i][length - 1].arc !== undefined)
                    first = 1;
                else
                    first = length - 1;
            }
            else {
                first = 0;
            }
            this.moveTo(polygons[i][first]);
            let firstIteration = true;
            for (let j = (first + 1) % length; j != first; j = (j + 1) % length, firstIteration = false) {
                const p = polygons[i][j];
                if (this.lineJoin === 'round' && p.arc !== undefined) {
                    let center;
                    if (j == 0 || j == 1 || j == length - 1)
                        center = path[i];
                    else
                        center = path[i + 1];
                    let p1 = polygons[i][(j + length - 1) % length];
                    if (polygons[i].degenerate && j != 0 && j != 1 && j != length - 1) {
                        if (polygons[i + 1].right) {
                            j = (j + 1) % length;
                        }
                        else {
                            p1 = polygons[i][(j + length - 2) % length];
                        }
                    }
                    if (i > 0 && polygons[i - 1].degenerate && (j == 0 || j == length - 1)) {
                        if (polygons[i].right === false) {
                            j = (j + 1) % length;
                        }
                    }
                    const v1 = center.to(p1);
                    this.arc(center, this.lineWidth / 2, v1, center.to(polygons[i][j]));
                }
                else {
                    this.lineTo(p);
                }
                if (!firstIteration && j == first)
                    break;
            }
            this.closePath();
            this.fill();
        }

        // If the line cap is round, draw a half-disk
        if (this.lineCap === 'round') {
            const p2 = path[path.length - 1];
            const n = p2.to(path[path.length - 2]).normal();
            this.beginPath();
            this.fillStyle = colors[path.length - 1];
            this.arc(p2, this.lineWidth / 2, n, n.neg());
            this.fill();
        }
    }
}
