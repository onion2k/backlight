import './backlight.css';
import * as twgl from '../node_modules/twgl.js/dist/4.x/twgl-full.js';

console.log("Mapping screen elements");

const rects = [];
const els = document.querySelectorAll('div');
let tex;

els.forEach((el) => {

    let bounds = el.getBoundingClientRect();
    rects.push({
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
    });

});

console.log("Converting to texture");

const backlightCanvas = document.createElement('canvas');
backlightCanvas.width = document.body.clientWidth;
backlightCanvas.height = document.body.clientHeight;
// backlightCanvas.style.position = 'fixed';
// backlightCanvas.style.top = '0';
// backlightCanvas.style.left = '0';
// document.body.appendChild(backlightCanvas);

const ctx = backlightCanvas.getContext('2d');
ctx.fillStyle = 'rgba(0,0,0,0)';
ctx.strokeStyle = 'red';

function draw() {

    let pageBoundsMin = document.body.scrollTop;
    let pageBoundsMax = document.body.scrollTop + document.body.clientHeight;

    mouse[1] = (document.body.scrollTop / (document.body.offsetHeight-document.body.clientHeight));

    ctx.clearRect(0, 0, backlightCanvas.width, backlightCanvas.height);

    //background
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.beginPath();
    ctx.rect(0, 0, backlightCanvas.width, backlightCanvas.height);
    ctx.fill();

    // light
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.arc(document.body.clientWidth/2, (mouse[1])*document.body.clientHeight,50,0,2*Math.PI);
    ctx.fill();

    //boxes
    ctx.fillStyle = 'rgba(64,64,64,1)';
    rects.forEach((r) => {
        if (r.y+r.height > pageBoundsMin && r.y < pageBoundsMax) {
            ctx.beginPath();
            ctx.rect(r.x, r.y-document.body.scrollTop, r.width, r.height);
            ctx.fill();
        }
    });


    tex = twgl.createTexture(gl, {
        src: ctx.canvas,
        crossOrigin: "",
    });

}

console.log("Passing to shader");

const overlayCanvas = document.createElement('canvas');
overlayCanvas.style.position = 'fixed';
overlayCanvas.style.top = '0';
overlayCanvas.style.left = '0';
overlayCanvas.width = document.body.clientWidth;
overlayCanvas.height = document.body.clientHeight;
overlayCanvas.style['pointer-events'] = 'none';
overlayCanvas.style['mix-blend-mode'] = 'normal';
document.body.appendChild(overlayCanvas);

var vs = `
attribute vec4 position;
varying vec2 v_texcoord;
uniform mat4 u_matrix;
void main() {
    gl_Position = u_matrix * position;
    v_texcoord = position.xy * .5 + .5;
}
`;

var fs = `
precision mediump float;

uniform float exposure;
uniform float decay;
uniform float density;
uniform float weight;
uniform vec2 lightPositionOnScreen;
uniform sampler2D tex;
varying vec2 v_texcoord;
const int NUM_SAMPLES = 60;

void main()
{
    vec2 deltaTextCoord = vec2( v_texcoord.st - lightPositionOnScreen.xy );
    vec2 textCoo = v_texcoord.st;
    deltaTextCoord *= 1.0 / float(NUM_SAMPLES) * density;
    float illuminationDecay = 1.0;

    for(int i=0; i < NUM_SAMPLES ; i++)
    {
        textCoo -= deltaTextCoord;
        vec4 sample = texture2D(tex, textCoo);
        sample *= illuminationDecay * weight;
        gl_FragColor += sample;
        illuminationDecay *= decay;
    }

    gl_FragColor *= exposure;
    gl_FragColor.a = gl_FragColor.r;

}
`

let u_time = 0;
let gl = overlayCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
let m4 = twgl.m4;
let programInfo = twgl.createProgramInfo(gl, [vs, fs]);
let bufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);
let c = 0;
let mouse = [0.5,0.5];

function render() {

    c += 0.01;

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    gl.useProgram(programInfo.program);
    
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, {
        exposure: 1.0,
        decay: 1.0,
        density: 1.05,
        weight: 0.019,
        lightPositionOnScreen: [mouse[0], 1-mouse[1]],
        u_resolution: [500,500],
        u_time: u_time += 0.025,
        u_tex: tex,
        u_matrix: m4.identity(),
    });
    twgl.drawBufferInfo(gl, bufferInfo);

    requestAnimationFrame(render);

}

document.addEventListener('scroll', draw);
draw();
render();
