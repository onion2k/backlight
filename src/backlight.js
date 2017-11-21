import './backlight.css';
import * as twgl from '../node_modules/twgl.js/dist/4.x/twgl-full.js';

console.log("Mapping screen elements");

const rects = [];
const els = document.querySelectorAll('.backlight');
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

const ctx = backlightCanvas.getContext('2d');
ctx.fillStyle = 'rgba(0,0,0,0)';
ctx.strokeStyle = 'red';

function draw() {

    ctx.clearRect(0, 0, backlightCanvas.width, backlightCanvas.height);

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.beginPath();
    ctx.rect(0, 0, backlightCanvas.width, backlightCanvas.height);
    ctx.fill();

    // ctx.fillStyle = 'rgba(255,255,255,0)';
    // ctx.beginPath();
    // ctx.arc(document.body.clientWidth/2, document.body.clientHeight/2,50,0,2*Math.PI);
    // ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,1)';
    
    let pageBoundsMin = document.body.scrollTop;
    let pageBoundsMax = document.body.scrollTop + document.body.clientHeight;

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

// var fs = `
// precision mediump float;
// varying vec2 v_texcoord;
// uniform sampler2D u_tex;
// void main() {
//     gl_FragColor = texture2D(u_tex, v_texcoord);
//     gl_FragColor.rgb *= gl_FragColor.a;
// }
// `;


var fs = `

precision mediump float;

uniform float exposure;
uniform float decay;
uniform float density;
uniform float weight;
uniform vec2 lightPositionOnScreen;
uniform sampler2D tex;
varying vec2 v_texcoord;
const int NUM_SAMPLES = 100;

void main()
{
    vec2 deltaTextCoord = vec2( v_texcoord.st - lightPositionOnScreen.xy );
    vec2 textCoo = v_texcoord.st;
    deltaTextCoord *= 1.0 /  float(NUM_SAMPLES) * density;
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

}
`


let u_time = 0;
let gl = overlayCanvas.getContext("webgl", { premultipliedAlpha: false });
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
let m4 = twgl.m4;
let programInfo = twgl.createProgramInfo(gl, [vs, fs]);
let bufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);
let c = 0;

function render() {

    c += 0.01;

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_COLOR, gl.ONE_MINUS_SRC_COLOR);
    
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, {
        exposure: 1.0,
        decay: 1.0,
        density: 1.0,
        weight: 0.01,
        lightPositionOnScreen: [0.5+(Math.sin(c)*0.4),0.5+(Math.cos(c)*0.3)],
        // lightPositionOnScreen: [0.5,0.5],
        u_resolution: [800,800],
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
