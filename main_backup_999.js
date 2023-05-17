import * as THREE from "three"
import gsap from "gsap";

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BloomPass } from 'three/addons/postprocessing/BloomPass.js';

import { LuminosityShader } from 'three/addons/shaders/LuminosityShader.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { Object3D } from "three";

const selectiveVertesShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const selectiveFragmentShader = `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
    gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
}
`
const cardVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const cardFragmentShader = `
varying vec2 vUv;
uniform vec3 color;
uniform float opacity;
void main() {
  vec2 uv = vUv - 0.4;
  float r = length(uv) * 0.1;
  float a = 1.0 - smoothstep(1.0, 30.0, r);
  gl_FragColor = vec4(color, a * opacity);
}
`;
const lightTowerVertexShader = `
                
varying vec3 vUv; 

void main() {
  vUv = position; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`
const lightTowerFragmentShader = `
uniform vec3 vlak3color1;
uniform vec3 vlak3color2;
uniform float positionVlak3;


varying vec3 vUv;

void main() {     
 
    float alpha = smoothstep(0.0, 5.0, vUv.y);
    float colorMix = smoothstep(0.0, 0.1, vUv.y);
    gl_FragColor = vec4(mix(vlak3color1, vlak3color2, colorMix), alpha);
}
`
const ENTIRE_SCENE = 0, BLOOM_SCENE = 1
const bloomLayer = new THREE.Layers();
const params = {
    exposure: 1,
    bloomStrength: 5,
    bloomThreshold: 0,
    bloomRadius: 0,
    scene: 'Scene with Glow'
};
const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};

var clock = new THREE.Clock()
var winW = window.innerWidth
var winH = window.innerHeight

const divContainerId = "webgl-container"
const divContainer = document.getElementById(divContainerId)

const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: true,
    alpha:true,
    stencil: false,
    depth: false
})
renderer.setPixelRatio(window.devicePixelRatio)
renderer.autoClear = false
renderer.debug.checkShaderErrors = false
renderer.toneMappingExposure = 1;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.setClearColor(0xffffff,0)
renderer.setSize(divContainer.clientWidth, divContainer.clientHeight)
renderer.gammaInput = true
renderer.gammaOutput = true
renderer.toneMappingExposure = Math.pow( 0.9, 4.0 )
divContainer.appendChild(renderer.domElement)


const scene = new THREE.Scene()
var camera = new THREE.PerspectiveCamera(60, window.innerWidth/ window.innerHeight, 1, 10000);
camera.position.set(0, 0, 10);
camera.layers.enable(1);

const light = new THREE.DirectionalLight(0xffffff, 0.75);
light.position.setScalar(100);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

new OrbitControls(camera, divContainer)


// #region @@@@@ pass @@@@@

// const renderScene = new RenderPass( scene, camera )
// const effectFXAA = new ShaderPass( FXAAShader )
// effectFXAA.uniforms.resolution.value.set( 1 / winW, 1 / winH )
// const bloomPass = new UnrealBloomPass( new THREE.Vector2( winW, winH ), 1.5, 0.4, 0.85 )
// bloomPass.threshold = 0
// bloomPass.strength = 1.2
// bloomPass.radius = 0.55
// bloomPass.renderToScreen = true
	
// const composer = new EffectComposer( renderer )
// composer.setSize( winW, winH )
	
// composer.addPass( renderScene )
// composer.addPass( bloomPass )

const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass( new THREE.Vector2( winW, winH ), 1.5, 0.4, 0.85 );
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;

const bloomComposer = new EffectComposer( renderer );
bloomComposer.renderToScreen = false;
bloomComposer.addPass( renderScene );
bloomComposer.addPass( bloomPass );

const finalPass = new ShaderPass(
    new THREE.ShaderMaterial( {
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: selectiveVertesShader,
        fragmentShader: selectiveFragmentShader,
        defines: {}
    } ), 'baseTexture'
);
finalPass.needsSwap = true;

const finalComposer = new EffectComposer( renderer );
finalComposer.addPass( renderScene );
finalComposer.addPass( finalPass );

// #endregion @@@@@ pass @@@@@
// #region @@@@@ card object @@@@@
const cardNumber = 2 // 0 ~ 2 지정에 따라
const loader = new GLTFLoader()
const url = "../model/effect/card_A_00.glb"
const cardObj = new Object3D()
cardObj.position.set(0,0,0)
cardObj.scale.set(0,0,0)
loader.load(url,(glb) => {
    glb.scene.scale.multiplyScalar(18);
    glb.scene.children.forEach(obj => { 
        obj.scale.set(0,0,0)
        obj.children.forEach(el => {
            el.material.transparent = true
        })
    })
    glb.scene.children[cardNumber].scale.set(1,1,1)
    cardObj.add(glb.scene)

    let eff_cardHover_time = 0 //for eff_cardHover
    const eff_cardHover = () => {
        eff_cardHover_time += 0.08
        let y = (Math.cos(eff_cardHover_time) * 50) - 50
        requestAnimationFrame(eff_cardHover)
        cardObj.scale.set(1,1,1)
        cardObj.position.set(0,y/400,0)
    }
    const eff_cardOpen = delay => {
        if(!cardObj) return
        gsap.to(cardObj.scale,{
            x: 1.2, y: 1.2, z: 1.2, duration: 0.3, delay: delay/1000,
            onComplete:() => {
                gsap.to(cardObj.scale,{
                    x: 1, y: 1, z: 1, duration: 0.2,
                    onComplete:() => {eff_cardHover()}
                })
            }
        })
    }
    eff_cardOpen(10)
})
scene.add(cardObj)
// #endregion @@@@@ card object @@@@@

const geom = new THREE.BoxGeometry(1,1,1)
const mate1 = new THREE.MeshBasicMaterial({color:0xff00ff,transparent:true})
const mate2 = new THREE.MeshBasicMaterial({color:0xffff00,transparent:true})
const box1 = new THREE.Mesh(geom,mate1)
const box2 = new THREE.Mesh(geom,mate2)
box2.position.set(1,0,0)
box2.layers.set(0)
box1.layers.set(1)
scene.add(box1,box2)

const update = (time) => {
    time *= 0.001
    const delta = clock.getDelta()
    // if(mixer)  mixer.update(delta)
    // if(mixer2) mixer2.update(delta)
    // if(mixer3) mixer3.update(delta)
}
render()
function render(time){
    requestAnimationFrame(render);
  
    // renderer.clear();
    
    // camera.layers.set(1);
    // composer.render();
    
    // renderer.clearDepth();
    // camera.layers.set(0);
    // renderer.render(scene, camera);
        camera.layers.set(1);
        bloomComposer.render();
        camera.layers.set(0);
        finalComposer.render();
}

window.onresize = () => {
    winW = window.innerWidth
    winH = window.innerHeight

    camera.aspect = winW / winH
    camera.updateProjectionMatrix()
    
    renderer.setSize(winW, winH)
    composer.setSize( winW, winH );
}