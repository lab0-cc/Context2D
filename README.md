# [Try here](https://context2d.lab0.cc)

# Introduction

This repository is a playground for experiments around JavaScript canvases. This is not intended as a general-purpose library; the features implemented here are those required by the [0WM project](https://0wm.lab0.cc).

Currently, this project modifies canvases in two ways:

* By changing most function arguments so that they use point and vector objects rather than their coordinates;
* By implementing gradient shadings along paths.

## Usage

The library exhibits a JavaScript module, `context2d.mjs`, defining an extension of the `CanvasRenderingContext2D` class. So as to not pollute namespaces, using the library requires monkey-patching a context’s prototype like so: `Object.setPrototypeOf(ctx, Context2D.prototype)`.

# Gradient shadings

The main purpose of this library is to provide a way to draw paths with gradient shadings along them. The initial intent was to draw paths whose opacity faded away, but the library grew more and more generic.

## Usage

Drawing a shaded path path, made of a list of points, with the colors colors at each point, can be done this way: `ctx.strokeGradient(path, colors)`. `strokeGradient` respects the `lineCap`, `lineJoin`, `lineWidth` and `miterLimit` context properties.

## How does it work?

The shading algorthm tries as much as possible to render a continuous background along the path. To this end, each path segment is colored with a gradient that ensures, if possible (sufficiently small line width wrt. segment length, and sufficiently large angles), continuity of color at the interface between two segments. In some cases, this can lead to a visually unattractive rendering, but we favor respect for continuity in our implementation.

## Limitations

When a continuous segment interface is impossible to guarantee, the algorithm switches to a degraded mode. In this mode, overlapping segments are generated.

Beyond that, the drawing algorithm may differ from the one JavaScript canvases use, in some cases where a naïve approach would lead to an incorrect geometry (e.g. when a path length is smaller than the line width and the path has an acute angle).

Finally, stitch lines may appear as an artifact of our algorithm. For now, no effort is made to attenuate them.