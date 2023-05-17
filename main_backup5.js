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
    // 믹서 = new THREE.AnimationMixer(glb.scene)
    // 액션 = 믹서.clipAction(glb.animations[0])
    // 액션.setLoop( THREE.LoopOnce ); 루프 없애기
    // 액션.clampWhenFinished = true; 애니메이션 종료시 그대로 멈춰라
    // 액션.setDuration(4) 애니메이션 시간 조절
    //bloomPassSet() 블룸효과 껐다켜기함수

async function b(){
    // #region basic setting@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    var clock = new THREE.Clock()
    var winW = window.innerWidth
    var winH = window.innerHeight
    
    const divContainerId = "webgl-container"
    const divContainer = document.getElementById(divContainerId)
    const renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance", antialias: true, alpha:true, stencil: false, depth: false })
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
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth/ window.innerHeight, 1, 10000);
    camera.position.set(0, 0, 10);

    
    const light = new THREE.DirectionalLight(0xffffff, 0.75);
    light.position.setScalar(100);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    
    new OrbitControls(camera, divContainer)
    // #endregion basic setting@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // #region @@@@@ pass @@@@@
    const renderScene = new RenderPass( scene, camera )
    const effectFXAA = new ShaderPass( FXAAShader )
    effectFXAA.uniforms.resolution.value.set( 1 / winW, 1 / winH )
    const bloomPass = new UnrealBloomPass( new THREE.Vector2( winW, winH ), 1.5, 0.4, 0.85 )
    bloomPass.threshold = 0
    bloomPass.strength = 0.6
    bloomPass.radius = 0.55
    bloomPass.renderToScreen = true
        
    const composer = new EffectComposer( renderer )
    composer.setSize( winW, winH )
        
    composer.addPass( renderScene )
    composer.addPass( bloomPass )
    
    /**
     * 
     * @param {number} strength 밝기
     * @param {number} duration 걸리는 시간
     */
    const bloomPassSet = (strength,duration) => {
        gsap.to(bloomPass,{
            strength:strength,
            duration:duration
        })
    }
    // #endregion @@@@@ pass @@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // #region @@@@@ card object @@@@@
        // 3장의 카드별@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        const loader = new GLTFLoader()

        const itemMapCardUrl = "../model/effect/card_A_00.glb"
        const cardListAwait = await loader.loadAsync(itemMapCardUrl);
        const cardListGet = cardListAwait.scene
        const cardNumber = 0// 0 ~ 2 지정에 따라 카드가 바뀜.

        const cardList = cardListGet.clone()
        cardList.scale.multiplyScalar(18);
        cardList.children.forEach(obj => { 
            obj.scale.set(0,0,0)
            obj.children.forEach(el => {el.material.transparent = true})
        })
        cardList.children[cardNumber].scale.set(1,1,1)
        const cardObj = new Object3D()
        cardObj.scale.set(0,0,0)
        cardObj.add(cardList)

        const cardObjTl = gsap.timeline()
        const eff_cardOpen = (delay = 0) => {
            if(!cardObj) return
            cardObjTl.fromTo(cardObj.scale,{x:0,y:0,z:0}, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, delay: delay/1000 })
            cardObjTl.to(cardObj.scale, { x: 1, y: 1, z: 1, duration: 0.2 })
            cardObjTl.fromTo(cardObj.position, {x:0,y:0,z:0}, 
                {x:0,y:0.5,z:0, duration:0.6,repeat: -1, yoyo: true, repeatDelay: 0,ease:"linear"})
        }
        const eff_cardClose = () => {
            cardObjTl.clear()
            cardObjTl.to(cardObj.scale,{
                x: 0, y: 0, z: 0, duration: 0.2,
                onComplete: () => { scene.remove(cardObj) }
            })
        }
        eff_cardOpen(1000)
        // scene.add(cardObj)
        // 맵에 띄우는 분홍카드@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        const mapCardList = cardListGet.clone()
        mapCardList.scale.multiplyScalar(18);
        const mapCardObj = new Object3D()
        mapCardList.children.forEach(obj => { 
            obj.scale.set(0,0,0)
            obj.children.forEach(el => {el.material.transparent = true})
        })
        mapCardList.children[3].scale.set(1,1,1)
        mapCardObj.add(mapCardList)

        const mapCardObjTl = gsap.timeline()
        const eff_cardHover = () => {
            if(!mapCardObjTl) return
            mapCardObj.scale.set(1,1,1)
        gsap.to(mapCardObj.rotation, { x: 0, y: -Math.PI*2, z: 0, duration: 3, repeat:-1, ease: "none" })
        mapCardObjTl.fromTo(mapCardObj.position, {x:0,y:0,z:0}, 
            {x: 0, y: 0.5, z :0, duration: 0.6, repeat: -1, yoyo: true, repeatDelay: 0})
        }
        const eff_cardHover_end = () => {
            mapCardObjTl.clear()
            gsap.to(mapCardObj.scale, { x: 0, y:0, z: 0, duration: 0.2, ease: "none",
            onComplete: () => { scene.remove(mapCardObj) }
        })
        }
        eff_cardHover()
        // scene.add(mapCardObj)
    // #endregion @@@@@ card object @@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // #region @@@@@ card effect @@@@@
        //하얀색 원이 펼쳐지는 이펙트 생성
        const cardOpenEffObj = new THREE.Object3D()
        const cardOpenEffUrl = "../model/effect/effect_card_start_01.glb"
        const cardOpenEffAwait = await loader.loadAsync(cardOpenEffUrl)
        const cardOpenEff = await cardOpenEffAwait.scene
        const cardOpenMixer = new THREE.AnimationMixer(cardOpenEff)
        const cardOpenEff_action = cardOpenMixer.clipAction(cardOpenEffAwait.animations[0])


        // 셋 인터벌 부여하기
        cardOpenEff_action.setLoop( THREE.LoopOnce );
        cardOpenEff_action.play()
        // bloomPassSet(1.5, 1)
        // setTimeout(()=>{
        //     bloomPassSet(0.6, 1)
        // },2000)
        const  cardOpenEff_action_interval = setInterval(()=>{
            cardOpenEff_action.reset().play()
        },4000)


        const cardAniDelay = 1500
        cardOpenEff.scale.set(25,25,1)
        cardOpenEff.position.set(0,0,-2)
        cardOpenEff.children.forEach( el => { 
            el.isMesh ? gsap.to(el.material,{ 
                opacity:0,duration:0.6,delay:cardAniDelay/1000,
                onComplete: () => {

                }
            }) : null 
        })
        cardOpenEffObj.add(cardOpenEff)

        // 헥사오브젝트 생성
        const hexagonCount = 40
        const hexagonObjs = new THREE.Object3D
        hexagonObjs.name = "hexagonObj"
        const hexa_geo = new THREE.CircleGeometry(1, 6)
        const hexa_mat = new THREE.ShaderMaterial({vertexShader: cardVertexShader,fragmentShader: cardFragmentShader,transparent:true, uniforms: { opacity:{value: 0}, color: { value: {b: 1.0,g: 0.78,r: 0.1} }, },});
        for(let i =0; i< hexagonCount; i++){
            const hexagonObj = new THREE.Object3D
            const hexagon_front = new THREE.Mesh(hexa_geo.clone(),hexa_mat.clone())
            const hexagon_back = new THREE.Mesh(hexa_geo.clone(),hexa_mat.clone())
            let scale_a = ((Math.random() * 20) + 10)/100
            let hexagonRandomScale = 0.0005
            let pos_x = Math.random() * hexagonRandomScale - hexagonRandomScale/2
            let pos_y = Math.random() * hexagonRandomScale - hexagonRandomScale/2
            let pos_z = Math.random() * hexagonRandomScale - hexagonRandomScale/2
            let multiplyScalerNumber = Math.random() * 2.0 + 1.0
            hexagon_front.scale.set(scale_a,scale_a,scale_a)
            hexagon_back.scale.set(scale_a,scale_a,scale_a)
            hexagon_back.position.x,hexagon_front.position.x = pos_x
            hexagon_back.position.y,hexagon_front.position.y = pos_y
            hexagon_back.position.z,hexagon_front.position.z = pos_z
            hexagon_back.rotation.x = Math.PI
            hexagon_front.position.normalize().multiplyScalar(multiplyScalerNumber)
            hexagon_back.position.normalize().multiplyScalar(multiplyScalerNumber)
            hexagonObj.add(hexagon_front.clone(),hexagon_back.clone())
            hexagonObjs.add(hexagonObj)
        }
        const hexagonObjRandomArr = [] //파란 헥사 오브젝트들의 랜덤 좌표를 미리 구함
        for(let i = 0; i<hexagonObjs.children.length;i++){ hexagonObjRandomArr.push((Math.random()*100 - 50).toFixed(1),(Math.random()*80 - 40).toFixed(1),(Math.random()*75 + 75).toFixed(1))}
        const eff_hexagons = (delay,scale) => {
        if(!hexagonObjs) return
            let delayBetween = 20
            hexagonObjs.children.forEach( (el, idx) => {
                if(idx < hexagonObjs.children.length){
                    let idxDelay = idx/1000*delayBetween + delay/1000
                    for(let i = 0; i<el.children.length; i++){

                        let randomX = hexagonObjRandomArr[idx*3], randomY = hexagonObjRandomArr[(idx*3)+1] ,randomZ = hexagonObjRandomArr[(idx*3)+2]
                        gsap.to(el.children[i].position,{
                            x:randomX,y:randomY,z:randomZ, duration:5, delay:idxDelay, ease:"none",
                            onComplete: () => { cardOpenEffObj.remove(hexagonObjs) }
                        })
                        gsap.to(el.children[i].material.uniforms.opacity,{ value:1,duration:0.3,duration:0.2, delay:idxDelay,ease:"none" })
                        gsap.to(el.children[i].scale,{ x:scale,y:scale,z:1,duration:5 })
                        gsap.to(el.children[i].material.uniforms.color.value,{ b: 0.4,g: 0.8470588235294118,r: 1, duration:5, delay:idxDelay, ease:"none" })
                    }
                }
            }
        )
        }
        eff_hexagons(800,0.8)
        cardOpenEffObj.add(hexagonObjs)

        //가로로 긴 플레어 생성
        const horizonLightMate = new THREE.ShaderMaterial({
        vertexShader: cardVertexShader, fragmentShader: cardFragmentShader, transparent:true,
        uniforms: { opacity:{value: 1},color: { value: new THREE.Color("#ffc65d") },},
        })
        const openLightCircleObj = new THREE.Object3D
        const openLightCircle = new THREE.Mesh(new THREE.CircleGeometry(0.03,200),horizonLightMate)
        openLightCircle.scale.set(200,1.5,1)
        openLightCircleObj.add(openLightCircle)
        const eff_openFlare = () => {
        gsap.fromTo(openLightCircleObj.scale, {x:0,y:0},{x:1,y:2.5,duration:0.5,repeat: 1, yoyo: true, repeatDelay: 0,onComplete: () => {cardOpenEffObj.remove(openLightCircleObj)}} )
        }
        cardOpenEffObj.add(openLightCircleObj)
        eff_openFlare()
        // scene.add(cardOpenEffObj)
    // #endregion @@@@@ card effect @@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // #region @@@@@ cn7 effect @@@@@
        //별들을 소환하는 구간
        const starUrl = "../model/effect/obj_star_01.glb"
        const starObjAwait = await loader.loadAsync(starUrl)
        const starObj = await starObjAwait.scene
        const animationDelay = 4000//애니메이션 딜레이
        const startCount = 20//별 개수
        const startSize = 1//별 크기
        const density = 200//밀집도
        const delaySpace = 100//오브젝트 간 애니메이션 간격
        const starObjs = new THREE.Object3D()
        const starObjChild = starObj.children[3]
        starObjChild.material.toneMapped = false
        starObjChild.material.emissive = {b:1,g:1,isColor:true,r:1}
        starObjChild.material.emissiveIntensity = 10
        starObjChild.material.metalness = 1
        starObjChild.material.roughness = 1
        starObjChild.layers.enable(1)
        starObjs.position.set(0,0,0.005)
        starObjs.scale.set(0,0,0)
        for(let i = 0; i<startCount; i++){
            let posX = (Math.random() * 10 - 5)/density
            let posY = (Math.random() * 10 - 5)/density
            starObj.position.set(posX,posY,0)
            starObjs.add(starObj.clone())
        }
        
        const eff_starObjs = () => {
            setTimeout(()=>{
                starObjs.scale.set(100,100,1)
                starObjs.children.forEach((obj,idx) => {
                    gsap.fromTo(obj.scale,{x:0,y:0,z:0,},{x:startSize,y:startSize,z:startSize,
                        duration:0.2,repeat: 1, yoyo: true, delay: idx * delaySpace/1000, repeatDelay: 0
                    })
                })
            },animationDelay)
        }
        eff_starObjs()
        //아반떼 슉슉 애니메이션
        const cn7Url = "../model/effect/effect_avante_end_00.glb"
        const cn7EffAwait = await loader.loadAsync(cn7Url)
        const cn7Eff = cn7EffAwait.scene
        cn7Eff.position.set(0.02,0,-1)
        cn7Eff.scale.set(40,40,1)
        cn7Eff.traverse( obj => {
            if(obj.isMesh){ obj.material.transparent = true }
        })
        const cn7Mixer = new THREE.AnimationMixer(cn7Eff)
        const cn7Mixer_action = cn7Mixer.clipAction(cn7EffAwait.animations[0])
        cn7Mixer_action.setLoop( THREE.LoopOnce );
        cn7Mixer_action.clampWhenFinished = true
        cn7Mixer_action.setDuration(4.5)
        cn7Mixer_action.play()
        bloomPassSet(1,0)
        scene.add(starObjs)
        scene.add(cn7Eff)
    // #endregion @@@@@ cn7 effect @@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // #region @@@@@ cube effect @@@@@
    const cubeUrl = "../model/effect/effect_agency_00.glb"
    const cubeEffAwait = await loader.loadAsync(cubeUrl)
    const cubeEff = cubeEffAwait.scene
    const cubeSize = 15
    cubeEff.traverse( obj => {
        if(obj.isMesh){
            obj.material.transparent = true
        }
    })
    cubeEff.position.set(0.02,0,-1)
    cubeEff.scale.set(cubeSize,cubeSize,cubeSize)
    const cubeMixer = new THREE.AnimationMixer(cubeEff)
    const cubeMixer_action = cubeMixer.clipAction(cubeEffAwait.animations[0])
    cubeMixer_action.play()

    // scene.add(cubeEff)
    // #endregion @@@@@ cube effect @@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    const update = (time) => {
        time *= 0.001
        const delta = clock.getDelta()
        if(cardOpenMixer) cardOpenMixer.update(delta)
        if(cn7Mixer) cn7Mixer.update(delta)
        if(cubeMixer) cubeMixer.update(delta)
    }
    render()
    function render(time){
        requestAnimationFrame(render);
      
        renderer.clear();
        renderer.clearDepth();

        renderer.render(scene, camera);
        composer.render();

        update(time)
    }
    // function render(time){
    //     requestAnimationFrame(render);
      
    //     renderer.clear();
        
    //     camera.layers.set(1);
    //     composer.render();
        
    //     renderer.clearDepth();
    //     camera.layers.set(0);
    //     update(time)
    //     renderer.render(scene, camera);
    // }
    window.onresize = () => {
        winW = window.innerWidth
        winH = window.innerHeight
    
        camera.aspect = winW / winH
        camera.updateProjectionMatrix()
        
        renderer.setSize(winW, winH)
        composer.setSize( winW, winH );
    }
} 
b();