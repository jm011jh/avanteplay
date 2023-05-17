// class 모드 최종본

import * as THREE from "three"
import * as TWEEN from "tween.js";
import gsap from "gsap";
import {MeshLine, MeshLineMaterial } from "three.meshline"

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
class App {
    constructor(){
        this._init()
        window.onresize = this.resize.bind(this)
        this.resize()
        requestAnimationFrame(this.render.bind(this))
    }
    _init(){
        this._clock = new THREE.Clock()

        this._setRenderer()
        this._setScene()
        this._setupLight()
        this._setupCamera()
        this._setupControls()
        this._setClickEvent()

        this._setComposer()

        //맵에띄우는 분홍카드
        // this._setupModel_map_card()
        
        //피융피융 아반떼차 등장 이펙트
        // this._setupModel_cn7_effect()
        
        //파란헥사 이펙트
        this._setupModel_card_effect()
        //카드종류별 소환
        this._setupModel_card()

        //이제는 볼 수 없는 클릭 이펙트
        // this._setupModel_shot_effect()

        //빙글빙글 정육면체 오브젝트 효과
        // this._setupModel_Cube_effect()
    }
    _setRenderer(){
        const divContainerId = "webgl-container"
        const divContainer = document.getElementById(divContainerId)
        this._divContainer = divContainer

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
        renderer.setSize(this._divContainer.clientWidth, this._divContainer.clientHeight)
        this._divContainer.appendChild(renderer.domElement)
        this._renderer = renderer
    }
    _setClickEvent(){
        this._raycaster = new THREE.Raycaster()
        this._raycaster._clickedPosition = new THREE.Vector2()
        this._raycaster._selectedMesh = null
        window.addEventListener("click", (e) => {
            this._raycaster._clickedPosition.x = (e.clientX/ window.innerWidth) * 2 - 1
            this._raycaster._clickedPosition.y = (e.clientX/ window.innerHeight) * 2 + 1
            this._raycaster.setFromCamera(this._raycaster._clickedPosition, this._camera)
            const found = this._raycaster.intersectObjects(this._scene.children)
            if(found.length > 0){
                const clickedObj = found[0].object
            }
        })
    }
    _setScene(){
        const scene = new THREE.Scene()
        this._scene = scene
    }
    _setupLight(){
        const color = 0xffffff
        const intensity = 10
        const light = new THREE.DirectionalLight(color, intensity)
        const light2 = new THREE.DirectionalLight(color, intensity)
        const light3 = new THREE.AmbientLight(color, intensity)
        light2.position.set(1, 1, 1)
        this._scene.add(light3)
    }
    _setupCamera(){
        const width = this._divContainer.clientWidth
        const height = this._divContainer.clientHeight
        const camera = new THREE.PerspectiveCamera(75,width / height,0.1,100)
        camera.position.z = 5
        this._camera = camera
    }
    _setupControls(){
      this._controls = new OrbitControls(this._camera, this._divContainer)
    }
    _setComposer(){
        const renderScene = new RenderPass( this._scene, this._camera )
        const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
        bloomPass.threshold = 0.21
        bloomPass.strength = 1.2
        bloomPass.radius = 0.55
        bloomPass.renderToScreen = true

        const composer = new EffectComposer( this._renderer )
        composer.setSize( window.innerWidth, window.innerHeight )
            
        composer.addPass( renderScene )
        composer.addPass( bloomPass )
        this._composer = composer
            
        this._renderer.gammaInput = true
        this._renderer.gammaOutput = true
        // this._renderer.toneMappingExposure = Math.pow( 0.9, 4.0 ) 
    }
    _zoomFit(object3D, camera, viewMode, bFront) {
        const box = new THREE.Box3().setFromObject(object3D)
        const sizeBox = box.getSize(new THREE.Vector3()).length()
        const centerBox = box.getCenter(new THREE.Vector3())
  
        let offsetX = 0, offsetY = 0, offsetZ = 0
        viewMode === "X" ? offsetX = 1 : (viewMode === "Y") ?
            offsetY = 1 : offsetZ = 1
  
        if(!bFront) {
            offsetX *= -1
            offsetY *= -1
            offsetZ *= -1
        }
        camera.position.set(
            centerBox.x + offsetX, centerBox.y + offsetY, centerBox.z + offsetZ
        )
        const halfSizeModel = sizeBox * 0.5
        const halfFov = THREE.MathUtils.degToRad(camera.fov * .5)
        const distance = halfSizeModel / Math.tan(halfFov)
        const direction = (new THREE.Vector3()).subVectors(
            camera.position, centerBox
        ).normalize()
        const position = direction.multiplyScalar(distance).add(centerBox)
  
        camera.position.copy(position)
        camera.near = sizeBox / 100
        camera.far = sizeBox * 100
  
        camera.updateProjectionMatrix()
  
        camera.lookAt(centerBox.x, centerBox.y, centerBox.z)
        this._controls.target.set(centerBox.x, centerBox.y, centerBox.z)
    }
    _setupModel_card(){
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
            eff_cardOpen(1000)
        })
        this._scene.add(cardObj)
    }
    _setupModel_map_card(){
        const loader = new GLTFLoader()
        const itemCardUrl ="../model/effect/card_A_00.glb"
        const mapCardObj = new Object3D()
        mapCardObj.position.set(0,0,0)
        mapCardObj.scale.set(0,0,0)
        loader.load(itemCardUrl, glb => {
            glb.scene.scale.multiplyScalar(18);
            glb.scene.children.forEach(obj => {
                obj.scale.set(0,0,0)
            })
            glb.scene.children[3].scale.set(1,1,1)
            mapCardObj.add(glb.scene)

            let eff_cardHover_time = 0
            const eff_cardHover = () => {
                  eff_cardHover_time += 0.08
                  let y = (Math.cos(eff_cardHover_time) * 50) - 50
                  requestAnimationFrame(eff_cardHover)
                  mapCardObj.scale.set(1,1,1)
                  mapCardObj.position.set(0,y/400,0)
                  mapCardObj.rotation.set(0,eff_cardHover_time/3,0)
            }
            eff_cardHover()
        })
        this._scene.add(mapCardObj)
    }
    _setupModel_card_effect(){
        const cardOpenObj = new THREE.Object3D()
        this._scene.add(cardOpenObj)
        //#region card blue circle
            this._clock = new THREE.Clock()
            const loader = new GLTFLoader()
            // const url = "../model/effect/card_effect_06.glb"
            const url = "../model/effect/effect_card_start_01.glb"
            loader.load( url,  ( gltf ) => {
                this._mixer = new THREE.AnimationMixer(gltf.scene)
                const action = this._mixer.clipAction(gltf.animations[0])
                action.setLoop( THREE.LoopOnce );
                action.play()

                const cardAniDelay = 1500
                this._cardEffect = gltf.scene
                this._cardEffect.scale.set(25,25,1)
                this._cardEffect.position.set(0,0,-2)
                this._cardEffect.children.forEach( el => { 
                    el.isMesh ? gsap.to(el.material,{ 
                        opacity:0,duration:0.6,delay:cardAniDelay/1000,
                        onComplete: () => {

                        }
                    }) : null 
                })
                cardOpenObj.add( this._cardEffect )
            }, undefined, ( error ) => {
                console.error( error );
            } );
        //#endregion card blue circle
        //#region card hexa
            const hexagonCount = 40
            const hexagonObjs = new THREE.Object3D
            hexagonObjs.name = "hexagonObj"
            const hexa_geo = new THREE.CircleGeometry(1, 6)
            const hexa_mat = new THREE.ShaderMaterial({vertexShader: cardVertexShader,fragmentShader: cardFragmentShader,transparent:true,
                uniforms: {
                    opacity:{value: 0},
                    color: { value: {b: 1.0,g: 0.78,r: 0.1} },
                },
            });
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
                hexagon_front.layers.set(1)
                hexagon_back.layers.set(1)
                hexagonObj.add(hexagon_front.clone(),hexagon_back.clone())
                hexagonObjs.add(hexagonObj)
            }
            const eff_hexagons = (delay,scale) => {
                if(!hexagonObjs) return
                    let delayBetween = 20
                    hexagonObjs.children.forEach( (el, idx) => {
                        if(idx < hexagonObjs.children.length){
                            let idxDelay = idx/1000*delayBetween + delay/1000
                            for(let i = 0; i<el.children.length; i++){
                                let randomX = Math.random()*50 - 25
                                    ,randomY = Math.random()*40 - 20
                                    ,randomZ = Math.random()*150 + 150
                                gsap.to(el.children[i].position,{
                                    x:randomX,y:randomY,z:randomZ, duration:10, delay:idxDelay, ease:"none"
                                })
                                gsap.to(el.children[i].material.uniforms.opacity,{
                                    value:1,duration:0.3,duration:0.2, delay:idxDelay,ease:"none"
                                })
                                gsap.to(el.children[i].scale,{
                                    x:scale,y:scale,z:1,duration:5
                                })
                                gsap.to(el.children[i].material.uniforms.color.value,{
                                    b: 0.4,g: 0.8470588235294118,r: 1, duration:5, delay:idxDelay, ease:"none"
                                })
                            }
                        }
                    }
                )
            }
            eff_hexagons(800,0.5)
            cardOpenObj.add(hexagonObjs)
        //#endregion card hexa
        //#region horizon light
        const horizonLightMate = new THREE.ShaderMaterial({
            vertexShader: cardVertexShader, fragmentShader: cardFragmentShader, transparent:true,
            uniforms: {
                opacity:{value: 1},
                color: { value: new THREE.Color("#ffc65d") },
            },
        })
        const openLightCircle = new THREE.Mesh(new THREE.CircleGeometry(0.03,200),horizonLightMate)
              openLightCircle.scale.set(200,1,1)
              openLightCircle.layers.set(1)
        const openLightCircleObj = new THREE.Object3D
        this._openLightCircleObj = openLightCircleObj
        this._openLightCircleObj.add(openLightCircle)
        cardOpenObj.add(openLightCircleObj)
        let degree = 2
            ,fast = 4
        const eff_openFlare = (duration) => {
            if(!this._openLightCircleObj) return
            degree = degree+(fast*20)/duration
            if(degree>fast*2) {
                console.log("done")
                cardOpenObj.remove(this._openLightCircleObj)
                return
            }
            if(degree<fast){
                this._openLightCircleObj.scale.y = degree
                this._openLightCircleObj.scale.x = degree/4
            }else{
                this._openLightCircleObj.scale.y = fast*2 - degree
                this._openLightCircleObj.scale.x = fast/4
            }
            requestAnimationFrame(eff_openFlare)
        }
        eff_openFlare(800)
        //#endregion horizon light
    }
    _setupModel_cn7_effect(){
        const loader = new GLTFLoader()
        const starUrl = "../model/effect/obj_star_01.glb"
        const animationDelay = 3500//애니메이션 딜레이
        const startCount = 20//별 개수
        const startSize = 1//별 크기
        const density = 200//밀집도
        const delaySpace = 100//오브젝트 간 애니메이션 간격
        const starObjs = new THREE.Object3D()
        loader.load(starUrl, (glb) => {
            const starObj = glb.scene
            const starObjChild = starObj.children[3]
            starObjChild.material.toneMapped = false
            starObjChild.material.emissive.r = 1
            starObjChild.material.emissive.g = 1
            starObjChild.material.emissive.b = 1
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
            this._scene.add(starObjs)

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
        })
        const carUrl = "../model/effect/effect_avante_end_00.glb"
        loader.load( carUrl,  ( glb ) => {
            const carScene = glb.scene
            carScene.traverse( obj => {
                if(obj.isMesh){
                    console.log(obj.material)
                    // obj.material.alphaMap = 1
                    obj.material.transparent = true
                }
            })
            carScene.position.set(0.02,0,-1)
            carScene.scale.set(40,40,1)
            this._mixer2 = new THREE.AnimationMixer(carScene)
            const action2 = this._mixer2.clipAction(glb.animations[0])
            action2.setLoop(THREE.LoopOnce)
            action2.clampWhenFinished = true
            action2.setDuration(4)
            action2.play()
            this._scene.add(carScene)
        }, undefined, ( error ) => {
        	console.error( error );
        });
    }
    _setupModel_shot_effect(){
        // #region create donut light
        const shootObj = new THREE.Object3D()
        this._shootObj = shootObj
        this._scene.add(this._shootObj)

        const torusGeom = new THREE.TorusGeometry(1, 0.01,10,50)
            ,torusGeom2 = new THREE.TorusGeometry(1, 0.002,10,50)
            ,torusGeom3 = new THREE.TorusGeometry(1, 0.03,10,50)
            ,torusMate = new THREE.MeshPhongMaterial({transparent:true,opacity:0})
            torusMate.emissive.r = 1
            torusMate.emissive.g = 1
            torusMate.emissive.b = 1
            torusMate.emissiveIntensity = 10
        const torus01 = new THREE.Mesh(torusGeom,torusMate)
            ,torus02 = new THREE.Mesh(torusGeom2,torusMate)
            ,torus03 = new THREE.Mesh(torusGeom3,torusMate)
            torus01.position.set(0,0,1)
            torus02.position.set(0,0,2.5)
            torus03.position.set(0,0,-1)
            torus01.layers.set(1)
            torus02.layers.set(1)
            torus03.layers.set(1)

        let torusAniTime = 0
            ,torusOpacTime = 0.9
            ,torusAniSpd = 0.02
        const torusToBig = () => {
            torusAniTime += torusAniSpd
            let cos = (((Math.cos(torusAniTime)*1 - Math.PI) + 2 + 0.14).toFixed(2) * -1) + 1
            torus01.position.set(0,0,cos*0.5 + 2)
            torus02.position.set(0,0,cos*1.2 + 1.7)
            torus03.position.set(0,0,cos*0.5)
            if(cos > 1.5){    
                cancelAnimationFrame(torusToBig)
                return
            }
            requestAnimationFrame(torusToBig)
        }
        const torusOpac = () => {
            gsap.fromTo(torus01.material, {opacity:0.8},{opacity:0,duration:torusOpacTime})
            gsap.fromTo(torus02.material, {opacity:0.3},{opacity:0,duration:torusOpacTime})
            gsap.fromTo(torus03.material, {opacity:0.8},{opacity:0,duration:torusOpacTime})
        }
        const torusObj = new THREE.Object3D()
        torusObj.add(torus01,torus02,torus03)
        this._shootObj.add(torusObj)
        // #endregion create donut light
        // #region create flash
            const flashCount = 4
            const flashCount2 = 6
            const flashGeom = new THREE.CircleGeometry(2,30,0.01,0.12)
            const flashGeom2 = new THREE.CircleGeometry(2,30,0.01,0.3)
            const flashMate = new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:0.02})
            const flashObj = new THREE.Object3D()
            flashObj.position.set(0,0,1)
            for(let i = 0; i<flashCount; i++){
                const flashMesh = new THREE.Mesh(flashGeom,flashMate)
                flashMesh.material.opacity = 0
                flashMesh.rotateZ(Math.PI*2/flashCount * i - 1.5)
                flashObj.add(flashMesh)
            }
            for(let i = 0; i<flashCount2; i++){
                const flashMesh = new THREE.Mesh(flashGeom2,flashMate)
                flashMesh.material.opacity = 0
                flashMesh.rotateZ(Math.PI*2/flashCount2 * i - 1)
                flashObj.add(flashMesh)
            }
            let flashAniCount = 0.07
            let flashAniSpd = 0.0015
            const flashAni = () => {
                flashAniCount -= flashAniSpd
                flashObj.children.forEach(el  => { el.material.opacity = flashAniCount })
                if(flashAniCount<0){
                    cancelAnimationFrame(flashAni)
                    return
                }
                requestAnimationFrame(flashAni)
            }
            this._shootObj.add(flashObj)
        // #endregion create flash
        // #region create circle flash
        const circleGeom = new THREE.CircleGeometry(2,200)
        const circleMate = new THREE.MeshBasicMaterial({ color:0xffffff,transparent:true,opacity:0,toneMapped:false,emissive:{r:0.5,g:0.5,b:0.5,},emissiveIntensity:1, })
        const circleMesh = new THREE.Mesh(circleGeom,circleMate)
        circleMesh.layers.set(1)
        circleMesh.position.set(0,0,1)
        let circleAniCount = 0.25
        let circleAniSpd = 0.02
        const circleAni = () => {
            circleAniCount -= circleAniSpd
            circleMesh.material.opacity = circleAniCount
            if(circleAniCount<0){
                cancelAnimationFrame(circleAni)
                return
            }
            requestAnimationFrame(circleAni)
        }
        this._shootObj.add(circleMesh)
        // #endregion create circle flash
        
        // #region load shot effect
        const loader = new GLTFLoader()
        const url = "../model/effect/effect_shot_01.glb"
        const effectSize = 20
        loader.load(url, (glb) => {
            this._shootObj.add(this._shotEffect)

            let shotAniCount = 1
            let shotAniSpd = 0.02
            this._shotEffect = glb.scene
            this._shotEffect.scale.set(effectSize,effectSize,effectSize)
            this._shotEffect.children[0].material.opacity = 0

            const shotAni = () => {
                shotAniCount -= shotAniSpd
                glb.scene.children[0].material.opacity = shotAniCount
                if(shotAniCount<0){
                    cancelAnimationFrame(shotAni)
                    return
                }
                requestAnimationFrame(shotAni)
            }
            setTimeout(()=>{
                shotAni()
                flashAni()
                torusOpac()
                circleAni()
                torusToBig()
            },500)
        })
        // #endregion load shot effect
    }
    _setupModel_Cube_effect(){
        const loader = new GLTFLoader()
        const cubeUrl = "../model/effect/effect_agency_00.glb"
        const cubeSize = 15
        loader.load( cubeUrl,  ( glb ) => {
            const cubeScene = glb.scene
            cubeScene.traverse( obj => {
                if(obj.isMesh){
                    obj.material.transparent = true
                }
            })
            cubeScene.position.set(0.02,0,-1)
            cubeScene.scale.set(cubeSize,cubeSize,cubeSize)
            this._mixer3 = new THREE.AnimationMixer(cubeScene)
            const action3 = this._mixer3.clipAction(glb.animations[0])
            action3.setLoop(THREE.LoopOnce)
            action3.clampWhenFinished = true
            action3.setDuration(4)
            action3.play()
            this._scene.add(cubeScene)
        }, undefined, ( error ) => {
        	console.error( error );
        });
    }
    // _openEffect(){
    //     const eff_lookAt = () => {
    //         const cameraPos = new THREE.Vector3()
    //         this._camera.getWorldPosition(cameraPos)
    //         hexagonObjs.lookAt(cameraPos)
    //         this._openLightCircleObj.lookAt(cameraPos)
    //     }
    //     const eff_bloomOff = (delay) => {
    //         new TWEEN.Tween(this._unrealBloomPass)
    //         .to({strength: 0})
    //         .delay(delay)
    //         .start()
    //     }
    // }
    resize() {
        const width = this._divContainer.clientWidth
        const height = this._divContainer.clientHeight

        this._camera.aspect = width / height
        this._camera.updateProjectionMatrix()
        
        this._renderer.setSize(width, height)
        this._composer.setSize( width, height );
    }
    render(time) {

        this._renderer.clear()

        this._camera.layers.set(1)
        this._composer.render()

        this._renderer.clearDepth()
        this._camera.layers.set(0)
        
        this._renderer.render(this._scene, this._camera)
        this.update(time)
        requestAnimationFrame(this.render.bind(this))
    }
    update(time) {
        time *= 0.001
        const delta = this._clock.getDelta()
        if(this._mixer) this._mixer.update(delta)
        if(this._mixer2) this._mixer2.update(delta)
        if(this._mixer3) this._mixer3.update(delta)
    }
}

window.onload = function (){
    new App()
}