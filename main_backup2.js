//레이어 구분법 입니다.
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

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader2 = `
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
        this._setupModel_box()
        this._setupModel_hexa()
        this._setupModel_openLight()
        this._setupModel_card_effect()
        this._setComposer()
        this._setClickEvent()
        this._setupControls()

        // this._setupModel_cn7_effect()
        // this._setupModel_cn7star_effect()
        // this._setTestModel()

        this._openEffect()
    }
    _setRenderer(){
        const divContainerId = "webgl-container"
        const divContainer = document.getElementById(divContainerId)
        this._divContainer = divContainer

        const renderer = new THREE.WebGLRenderer({
        	powerPreference: "high-performance",
	        antialias: false,
	        stencil: false,
	        depth: false
        })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.autoClear = false
        renderer.setSize(this._divContainer.clientWidth, this._divContainer.clientHeight)
        renderer.setClearColor(0x101000)
        renderer.toneMappingExposure = 1;
        renderer.toneMapping = THREE.ReinhardToneMapping;
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
    _setTestModel(){
        const geom = new THREE.BoxGeometry(1,1,1)
        const geom2 = new THREE.BoxGeometry(1,1,1)
        const mate = new THREE.MeshBasicMaterial({color:0xffffff})
        const mate2 = new THREE.MeshBasicMaterial({color:0xffff00})
        const box = new THREE.Mesh(geom,mate)
        const box2 = new THREE.Mesh(geom2,mate2)
        box.position.set(0,1,3)
        box2.position.set(1,1,3)
        box.layers.set(0)
        box2.layers.set(1)
        this._scene.add(box)
        this._scene.add(box2)
    }
    _setupLight(){
        const color = 0xffffff
        const intensity = 10
        const light = new THREE.DirectionalLight(color, intensity)
        const light2 = new THREE.DirectionalLight(color, intensity)
        const light3 = new THREE.AmbientLight(color, intensity)
        light.position.set(0, 0, 1)
        light2.position.set(0, 0, -5)
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

        const effectFXAA = new ShaderPass( FXAAShader )
        effectFXAA.uniforms.resolution.value.set( 1 / window.innerWidth, 1 / window.innerHeight )
        const effectCopy = new ShaderPass(CopyShader)
        effectCopy.renderToScreen = true
        this._effectCopy = effectCopy

        const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
        bloomPass.threshold = 0.21
        bloomPass.strength = 1.2
        bloomPass.radius = 0.55
        bloomPass.renderToScreen = true
            
        const composer = new EffectComposer( this._renderer )
        composer.setSize( window.innerWidth, window.innerHeight )
            
        composer.addPass( renderScene )
        composer.addPass( effectFXAA )
        // composer.addPass( effectCopy )
        composer.addPass( bloomPass )
        this._composer = composer
            
        this._renderer.gammaInput = true
        this._renderer.gammaOutput = true
        this._renderer.toneMappingExposure = Math.pow( 0.9, 4.0 ) 
    }
    _setupModel_box(){
        const loader = new GLTFLoader()
        const url = "../model/effect/card_01.glb"
        const boxObj = new Object3D()
        boxObj.position.set(0,0,0)
        boxObj.scale.set(0,0,0)
        this._boxObj = boxObj
        loader.load(url,(glb) => {
            glb.scene.scale.multiplyScalar(10);
            glb.scene.children[0].children[1].material.roughness = 0.8
            glb.scene.children[0].children[1].material.metalness = 0
            this._boxObj.add(glb.scene)
        })
        this._scene.add(boxObj)
    }
    _setupModel_card_effect(){
        this._clock = new THREE.Clock()
        const loader = new GLTFLoader()
        const url = "../model/effect/card_effect_06.glb"
        loader.load( url,  ( gltf ) => {
            this._mixer = new THREE.AnimationMixer(gltf.scene)
            const action = this._mixer.clipAction(gltf.animations[0])
            this._action = action
            action.setLoop( THREE.LoopOnce );
            action.clampWhenFinished = true;
            action.play()
            this._cardEffect = gltf.scene
            this._cardEffect.position.set(0,0,-2)
            this._cardEffect.scale.set(25,25,1)
        	this._scene.add( this._cardEffect )
        }, undefined, ( error ) => {
        	console.error( error );
        } );
    }
    _zoomFit(object3D, camera, viewMode, bFront) {
      const box = new THREE.Box3().setFromObject(object3D)
      console.log(box)
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
    _setupModel_cn7star_effect(){
        const loader = new GLTFLoader()
        const url = "../model/effect/obj_star_00.glb"
        const animationDelay = 5000//애니메이션 딜레이
        const startCount = 30//별 개수
        const density = 700//밀집도
        const delaySpace = 100//오브젝트 간 애니메이션 간격
        const starObjs = new THREE.Object3D()
        loader.load(url, (glb) => {
            const starObj = glb.scene
            const starObjChild = starObj.children[3]
            starObjChild.material.toneMapped = false
            starObjChild.material.emissive.r = 1
            starObjChild.material.emissive.g = 1
            starObjChild.material.emissive.b = 1
            starObjChild.material.emissiveIntensity = 10
            starObjChild.layers.set(1)
            starObj.scale.set(0)
            starObjs.position.set(0,0,0.005)
            for(let i = 0; i<startCount; i++){
                let posX = (Math.random() * 10 - 5)/density
                let posY = (Math.random() * 10 - 5)/density
                starObj.position.set(posX,posY,0)
                starObjs.add(starObj.clone())
            }
            this._starObjs = starObjs
            this._scene.add(this._starObjs)

            const eff_starObjs = (delay) => {
                setTimeout(()=>{
                    this._starObjs.children.forEach((obj,idx) => {
                        gsap.fromTo(obj.scale,{
                            x:0,y:0,z:0,
                        },{
                            x:0.3,y:0.3,z:0.3,duration:0.3,repeat: 1, yoyo: true, delay: idx * delaySpace/1000, repeatDelay: 0
                        })
                    })
                },animationDelay)
            }
            eff_starObjs()
        })
    }
    _setupModel_cn7_effect(){
        const loader = new GLTFLoader()
        const url = "../model/effect/cn7_effect_end_03.glb"
        loader.load( url,  ( glb ) => {
          this._cn7Effect = glb.scene
          this._cn7Effect.traverse( obj => {
            if(obj.isMesh){
                obj.layers.set(0)
                obj.material.depthTest = false
            }
          })
          this._cn7Effect.position.set(0,0,0)
          this._cn7Effect.scale.set(0.6,0.6,1)
          this._mixer = new THREE.AnimationMixer(this._cn7Effect)
          this._action = this._mixer.clipAction(glb.animations[0])
          this._action.setLoop( THREE.LoopOnce );
          this._action.clampWhenFinished = true;
          this._action.play()
          
          this._zoomFit(this._cn7Effect.children[6], this._camera, "Z", true)
            this._scene.add( this._cn7Effect )
        }, undefined, ( error ) => {
        	console.error( error );
        });
    }
    _setupModel_hexa(){
        const hexagonCount = 30
        const hexagonObjs = new THREE.Object3D
        hexagonObjs.name = "hexagonObj"
        for(let i =0; i< hexagonCount; i++){
            const hexagonObj = new THREE.Object3D
            const hexa_geo = new THREE.CircleGeometry(1, 6)
            const hexa_mat = new THREE.ShaderMaterial({
                vertexShader: vertexShader,
                fragmentShader: fragmentShader2,
                transparent:true,
                uniforms: {
                    opacity:{value: 0},
                    color: { value: {b: 1.0,g: 0.78,r: 0.1} },
                },
            });
            const hexagon_front = new THREE.Mesh(hexa_geo,hexa_mat)
            const hexagon_back = new THREE.Mesh(hexa_geo,hexa_mat)
            let scale_a = ((Math.random() * 20) + 10)/100
            let pos_x = Math.random() * 0.0005 - 0.00025
            let pos_y = Math.random() * 0.0005 - 0.00025
            let pos_z = Math.random() * 0.0005 - 0.00025
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
        this._hexagonObjs = hexagonObjs
        this._scene.add(hexagonObjs)
    }
    _setupModel_openLight(){
        const geom = new THREE.CircleGeometry(0.03,200)
        const mate = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader2,
            transparent:true,
            uniforms: {
                opacity:{value: 1},
                color: { value: new THREE.Color("#ffc65d") },
            },
        })
        const openLightCircle = new THREE.Mesh(geom,mate)
              openLightCircle.scale.set(200,1,1)
              openLightCircle.layers.set(1)
        const openLightCircleObj = new THREE.Object3D
              openLightCircleObj.add(openLightCircle)
        this._scene.add(openLightCircleObj)
        this._openLightCircleObj = openLightCircleObj
    }
    _openEffect(){
        let degree = 2
        let fast = 4
        /**
         * set the direction hexa objects and open light circle to camera position
         */
        const eff_lookAt = () => {
            const cameraPos = new THREE.Vector3()
            this._camera.getWorldPosition(cameraPos)
            this._hexagonObjs.lookAt(cameraPos)
            this._openLightCircleObj.lookAt(cameraPos)
        }
        /**
         * @param {number} duration animation duration
         */
        const eff_openFlare = (duration) => {
          if(!this._openLightCircleObj) return
            degree = degree+(fast*20)/duration
            if(degree>fast*2) {
                this._scene.remove(this._openLightCircleObj)
                cancelAnimationFrame(eff_openFlare)
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
        /**
         * animation for hexa polygons(this._hexagonObjs.children)
         * @param {number} delay delay time for appear hexa polygons
         * @param {number} scale scale of hexa polygons
         */
        const eff_hexagons = (delay,scale) => {
          if(!this._hexagonObjs) return
            let delayBetween = 20
            this._hexagonObjs.children.forEach( (el, idx) => {
                if(idx < this._hexagonObjs.children.length){
                    for(let i = 0; i<el.children.length; i++){
                        let randomX = Math.random()*30 - 15
                        let randomY = Math.random()*20 - 10
                        let randomZ = Math.random()*2000 + 100
                        new TWEEN.Tween(el.children[i].position)
                        .to({x:randomX,y:randomY,z:randomZ},1500)
                        .delay(idx*delayBetween + delay)
                        .easing(TWEEN.Easing.Cubic.In)
                        .start()
        
                        new TWEEN.Tween(el.children[i].material.uniforms.opacity)
                        .to({value:0.9},300)
                        .easing(TWEEN.Easing.Cubic.Out)
                        .delay(idx*delayBetween + delay)
                        .start()
        
                        new TWEEN.Tween(el.children[i].scale)
                        .to({x:scale,y:scale,z:scale,},2000)
                        .delay(idx*delayBetween + delay)
                        .start()
        
                        new TWEEN.Tween(el.children[i].material.uniforms.color.value)
                        .to({b: 0.4,g: 0.8470588235294118,r: 1},1000)
                        .delay(idx*delayBetween + delay)
                        .start()
                    }
                }
            })
        }
        /**
         * clear the hexa polygons after animation end
         * @param {number} delay delay time for clear  hexa polygons
         */
        const eff_blueCircle = (delay) => {
          if(!this._hexagonObjs) return
            setTimeout(()=>{
                this._hexagonObjs.children.forEach((el)=>{
                    for(let i = 0; i<el.children.length; i++){
                        new TWEEN.Tween(el.children[i].material.uniforms.color.value)
                        .to({b: 1,g: 1,r: 1},10)
                        .start()
                        new TWEEN.Tween(el.children[i].material.uniforms.opacity)
                        .delay(500)
                        .to({value:0},10)
                        .start()
                        .onComplete(() => { this._scene.remove(this._hexagonObj), this._scene.remove(this._cardEffect) })
                    }
                })
            },delay)
        }
        let eff_cardHover_time = 0//for eff_cardHover
        /**
         * make the card(item) looks hover 둥실둥실
         * @returns 
         */
        const eff_cardHover = () => {
          if(!this._boxObj) return
            eff_cardHover_time += 0.05
            let y = (Math.cos(eff_cardHover_time) * 30) - 30
            requestAnimationFrame(eff_cardHover)
            this._boxObj.scale.set(1,1,1)
            this._boxObj.position.set(0,y/400,0)
        }
        const eff_cardOpen = (delay) => {
          if(!this._boxObj) return
            new TWEEN.Tween(this._boxObj)
            .to({opacity:1},1000)
            .delay(delay/2)
            .start()
            new TWEEN.Tween(this._boxObj.scale)
            .to({x:1.2,y:1.2,z:1.2},200)
            .delay(delay + 200)
            .start()
            .onComplete(()=>{
                new TWEEN.Tween(this._boxObj.scale)
                .to({x:1,y:1,z:1},400)
                .start()
                .onComplete(()=>{
                    eff_cardHover()
                })
            })
        }
        /**
         * no more use
         * @param {number} delay 
         */
        const eff_bloomOff = (delay) => {
            new TWEEN.Tween(this._unrealBloomPass)
            .to({strength: 0})
            .delay(delay)
            .start()
        }
        eff_openFlare(800)
        eff_hexagons(800,1)
        eff_blueCircle(2000)
        eff_cardOpen(1000)
    }
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
        TWEEN.update();
        this.update(time)
        requestAnimationFrame(this.render.bind(this))
    }
    update(time) {
        time *= 0.001
        const delta = this._clock.getDelta()
        if(this._mixer) this._mixer.update(delta)
    }
}

window.onload = function (){
    new App()
}