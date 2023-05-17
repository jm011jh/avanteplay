const {dat} = window
const {Object3D, Scene, PerspectiveCamera, WebGLRenderer, Vector2, MathUtils, DataTexture, RGBFormat, Color, WebGLRenderTarget, ReinhardToneMapping, ShaderPass, TexturePass, EffectComposer, RenderPass, GLTFLoader} = THREE
// import gsap from 'gsap'
import {UnrealBloomPass} from './AlphaUnrealBloomPass.js'
const modelPathCard = require('./assets/card_A_00.glb')
const cardOpenEffUrl = require('./assets/effect_card_start_01.glb')
const starUrl = require('./assets/obj_star_01.glb')
const cn7Url = require('./assets/effect_avante_end_02.glb')
const cubeUrl = require('./assets/effect_agency_00.glb')

const cardVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
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
`
const combineShaderFragment = `
  uniform sampler2D cameraTexture;
  uniform sampler2D tDiffuse; // Scene contents 
  uniform sampler2D bloomTexture;
  uniform vec2 u_resolutionRatio;
  uniform bool useAdditiveBlend;

  varying vec2 vUv;

  vec4 normalBlend(vec4 x, vec4 y, float opacity) {
  return y * opacity + x * (1.0 - opacity);
  }

  void main(void) {
    vec4 cameraColor = texture2D( cameraTexture, vUv);
    vec4 sceneColor = texture2D( tDiffuse, vUv);
    vec4 bloomColor = texture2D( bloomTexture, vUv);

    gl_FragColor = normalBlend(cameraColor, sceneColor, sceneColor.a);
    gl_FragColor += bloomColor;
    // gl_FragColor += bloomColor;
    // gl_FragColor = vec4(length(cameraColor.rgb), length(bloomColor.rgb), length(sceneColor.rgb), 1.); // Shows camera in red and scene in blue
  }
`
const combineShaderVertex = `
  varying vec2 vUv;
  void main() {
  	vUv = uv;
  	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

// unreal bloom configuration
const params = {exposure: 1, strength: 1.5, threshold: 0, radius: 0}
export const threejsPipelineModule = () => {
  let scene3
  let isSetup = false
  const cameraTextureCopyPosition = new Vector2(0, 0)
  let combinePass
  let bloomPass
  let cameraTexture
  let sceneTarget
  let copyPass

  let width
  let height

  // add shaders to the document
  // document.body.insertAdjacentHTML('beforeend', shaderHtml)

  const combineShaderFrag = combineShaderFragment
  const combineShaderVert = combineShaderVertex
  const combineShader = {
    uniforms: {
      cameraTexture: {value: undefined},
      tDiffuse: {value: null},
      useAdditiveBlend: {value: false},
    },
    fragmentShader: combineShaderFrag,
    vertexShader: combineShaderVert,
  }
  const xrScene = () => scene3
  const trySetup = ({canvas, canvasWidth, canvasHeight, GLctx}) => {
    if (isSetup) return
    isSetup = true
    width = canvasWidth
    height = canvasHeight

    const scene = new Scene()
    const camera = new PerspectiveCamera(60.0, canvasWidth / canvasHeight, 0.01, 1000)
    scene.add(camera)
    const renderer = new WebGLRenderer({canvas, context: GLctx, alpha: true, antialias: true})
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.debug.checkShaderErrors = false  // speeds up loading new materials
    renderer.autoClear = false
    renderer.autoClearDepth = false
    renderer.setClearColor(0xffffff, 0)
    renderer.toneMapping = THREE.ReinhardToneMapping
    renderer.toneMappingExposure = params.exposure
    renderer.setSize(canvasWidth, canvasHeight)

    sceneTarget = new WebGLRenderTarget(canvasWidth, canvasHeight, {generateMipmaps: false})

    // Copy scene into bloom
    copyPass = new TexturePass(sceneTarget.texture)
    bloomPass = new UnrealBloomPass(new Vector2(canvasWidth, canvasHeight), 1.5, 0.4, 0.85)
    bloomPass.clearColor = new Color(0xffffff)
    bloomPass.threshold = params.threshold
    bloomPass.strength = params.strength
    bloomPass.radius = params.radius
    const bloomPassSet = (str, dur) => {
      gsap.to(bloomPass, {strength: str, duration: dur})
    }
    combinePass = new ShaderPass(combineShader)
    combinePass.clear = false
    combinePass.renderToScreen = true

    const bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(copyPass)
    bloomComposer.addPass(bloomPass)
    const composer = new EffectComposer(renderer)
    composer.addPass(copyPass)
    composer.addPass(combinePass)

    scene.add(new THREE.AmbientLight(0x404040, 3))
    scene3 = {scene, camera, renderer, bloomComposer, composer}

    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    async function b() {
    const clock = new THREE.Clock()
    const loader = new GLTFLoader()
    const itemMapCardUrl = modelPathCard
      // #region 카드 소환@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
      const cardListAwait = await loader.loadAsync(itemMapCardUrl)
      const cardListGet = cardListAwait.scene
      cardListGet.position.set(0, 2, 0)
      const cardNumber = 0
      const cardList = cardListGet.clone()
      cardList.scale.multiplyScalar(18)
      cardList.children.forEach((obj) => {
        obj.scale.set(0, 0, 0)
        obj.children.forEach((el) => { el.material.transparent = true })
      })
      cardList.children[cardNumber].scale.set(1, 1, 1)
      const cardObj = new Object3D()
      cardObj.scale.set(0, 0, 0)
      cardObj.add(cardList)
      const cardObjTl = gsap.timeline()
      const effCardOpen = (delay = 0) => {
        if (!cardObj) return
        cardObjTl.fromTo(cardObj.scale, {x: 0, y: 0, z: 0},
          {x: 0.8, y: 0.8, z: 0.8, duration: 0.3, delay: delay / 1000})
        cardObjTl.to(cardObj.scale, {x: 0.5, y: 0.5, z: 0.5, duration: 0.2})
        cardObjTl.fromTo(cardObj.position, {x: 0, y: 0, z: 0},
          {x: 0, y: -0.2 ,z: 0, duration: 0.6, repeat: -1, yoyo: true, repeatDelay: 0, ease: 'linear'})
      }
      const effCardClose = () => {
          cardObjTl.clear()
          cardObjTl.to(cardObj.scale, {x: 0, y: 0, z: 0, duration: 0.2, onComplete: () => scene.remove(cardObj)})
      }
      // setTimeout(() => {
      //   effCardOpen(3000)
      //   bloomPassSet(0.7, 0)
      //   scene.add(cardObj)
      // }, 2000)
      const mapCardList = cardListGet.clone()
      mapCardList.scale.multiplyScalar(18);
      const mapCardObj = new Object3D()
      mapCardList.children.forEach((obj) => {
        obj.scale.set(0, 0, 0)
        obj.children.forEach((el) => { el.material.transparent = true })
      })
      mapCardList.children[3].scale.set(0.3, 0.3, 0.3)
      mapCardObj.add(mapCardList)
      const mapCardObjTl = gsap.timeline()
      const effCardHover = () => {
        if (!mapCardObjTl) return
        mapCardObj.scale.set(1, 1, 1)
        gsap.to(mapCardObj.rotation, { x: 0, y: -Math.PI * 2, z: 0, duration: 4, repeat: -1, ease: 'none'})
        mapCardObjTl.fromTo(mapCardObj.position, {x: 0, y: 0, z: 0}, {x: 0, y: 0.3, z: 0, duration: 0.6, repeat: -1, yoyo: true, repeatDelay: 0})
      }
      const effCardHoverEnd = () => {
        mapCardObjTl.clear()
        gsap.to(mapCardObj.scale, { x: 0, y: 0, z: 0, duration: 0.2, ease: 'none', onComplete: () => { scene.remove(mapCardObj) }})
      }
      // setTimeout(() => {
      //   scene.add(mapCardObj)
      //   effCardHover()
      //   bloomPassSet(0.5, 0)
      // },2000)
      // #endregion 카드 소환@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
      // #region 카드 이펙트 소환@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
      const cardOpenEffObj = new THREE.Object3D()
      const cardOpenEffAwait = await loader.loadAsync(cardOpenEffUrl)
      const cardOpenEff = await cardOpenEffAwait.scene
      const cardOpenMixer = new THREE.AnimationMixer(cardOpenEff)
      const cardOpenEffAction = cardOpenMixer.clipAction(cardOpenEffAwait.animations[0])
      // // 셋 인터벌 부여하기
      cardOpenEffAction.setLoop(THREE.LoopOnce);
      cardOpenEffAction.play()
      // bloomPassSet(1.5, 1)
      // setTimeout(() => { bloomPassSet(0.6, 1) }, 2000)
      //  const cardOpenEffAction_interval = setInterval(() => { cardOpenEffAction.reset().play() }, 4000)
      const cardAniDelay = 1500
      cardOpenEff.scale.set(25, 25, 1)
      cardOpenEff.position.set(0, 0, -2)
      cardOpenEff.children.forEach((el) => { if (el.isMesh) { gsap.to(el.material, {opacity: 0, duration: 0.6, delay: cardAniDelay / 1000}) } })
      cardOpenEffObj.add(cardOpenEff)
      // 헥사오브젝트 생성
      const hexagonCount = 40
      const hexagonObjs = new THREE.Object3D()
      hexagonObjs.name = 'hexagonObj'
      const hexaGeo = new THREE.CircleGeometry(1, 6)
      const hexaMat = new THREE.ShaderMaterial({vertexShader: cardVertexShader, fragmentShader: cardFragmentShader, transparent: true, uniforms: {opacity: {value: 0}, color: {value: {b: 1.0, g: 0.78, r: 0.1}}}})
      for (let i = 0; i < hexagonCount; i++) {
        const hexagonObj = new THREE.Object3D()
        const hexagonFront = new THREE.Mesh(hexaGeo.clone(), hexaMat.clone())
        const hexagonBack = new THREE.Mesh(hexaGeo.clone(), hexaMat.clone())
        const scaleA = ((Math.random() * 20) + 10) / 100
        const hexagonRandomScale = 0.0005
        const posX = Math.random() * hexagonRandomScale - hexagonRandomScale / 2
        const posY = Math.random() * hexagonRandomScale - hexagonRandomScale / 2
        const posZ = Math.random() * hexagonRandomScale - hexagonRandomScale / 2
        const multiplyScalerNumber = Math.random() * 2.0 + 1.0
        hexagonFront.scale.set(scaleA, scaleA, scaleA)
        hexagonBack.scale.set(scaleA, scaleA, scaleA)
        hexagonBack.position.x = posX
        hexagonFront.position.x = posX
        hexagonBack.position.y = posY
        hexagonFront.position.y = posY
        hexagonBack.position.z = posZ
        hexagonFront.position.z = posZ
        hexagonBack.rotation.x = Math.PI
        hexagonFront.position.normalize().multiplyScalar(multiplyScalerNumber)
        hexagonBack.position.normalize().multiplyScalar(multiplyScalerNumber)
        hexagonObj.add(hexagonFront.clone(), hexagonBack.clone())
        hexagonObjs.add(hexagonObj)
      }
      const hexagonObjRandomArr = []
      for (let i = 0; i < hexagonObjs.children.length; i++) { 
        hexagonObjRandomArr.push((Math.random() * 100 - 50).toFixed(1), (Math.random() * 80 - 40).toFixed(1), (Math.random() * 150 + 150).toFixed(1))
      }
      const effHexagons = (delay, scale) => {
      if (!hexagonObjs) return
        const delayBetween = 20
        hexagonObjs.children.forEach((el, idx) => {
          if (idx < hexagonObjs.children.length) {
            const idxDelay = (idx / 1000) * delayBetween + delay / 1000
            for (let i = 0; i < el.children.length; i++) {
              const randomX = hexagonObjRandomArr[idx * 3]
              const randomY = hexagonObjRandomArr[(idx * 3) + 1]
              const randomZ = hexagonObjRandomArr[(idx * 3) + 2]
              gsap.to(el.children[i].position, {x: randomX, y: randomY, z: randomZ, duration: 5, delay: idxDelay, ease: 'none', onComplete: () => { cardOpenEffObj.remove(hexagonObjs) }})
              gsap.to(el.children[i].material.uniforms.opacity, {value: 1, duration: 0.3, delay: idxDelay, ease: 'none'})
              gsap.to(el.children[i].scale, {x: scale, y: scale, z: 1, duration: 5})
              gsap.to(el.children[i].material.uniforms.color.value, {b: 0.4, g: 0.8470588235294118, r: 1, duration: 5, delay: idxDelay, ease: 'none'})
            }
          }
        })
      }
      effHexagons(800, 0.8)
      cardOpenEffObj.add(hexagonObjs)
      //  가로로 긴 플레어 생성
      const horizonLightMate = new THREE.ShaderMaterial({
        vertexShader: cardVertexShader, fragmentShader: cardFragmentShader, transparent: true, uniforms: {opacity: {value: 1}, color: {value: new THREE.Color('#ffc65d')}},
      })
      const openLightCircleObj = new THREE.Object3D()
      const openLightCircle = new THREE.Mesh(new THREE.CircleGeometry(0.1, 200), horizonLightMate)
      openLightCircle.scale.set(200, 1.5, 1)
      openLightCircleObj.add(openLightCircle)
      const effOpenFlare = () => {
        gsap.fromTo(openLightCircleObj.scale, {x: 0, y: 0}, {x: 2.5, y: 5, duration: 1, repeat: 1, yoyo: true, repeatDelay: 0, onComplete: () => { cardOpenEffObj.remove(openLightCircleObj) }})
      }
      cardOpenEffObj.add(openLightCircleObj)
      effOpenFlare()
      cardOpenEffObj.scale.set(0.1, 0.1, 0.1)
      cardOpenEffObj.position.set(0, 1, -3)
      // scene.add(cardOpenEffObj)
      // #endregion 카드 이펙트 소환@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
      // #region cn7 소환@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
      const starObjAwait = await loader.loadAsync(starUrl)
      const starObj = await starObjAwait.scene
      const animationDelay = 4000  //  애니메이션 딜레이
      const startCount = 20  // 별 개수
      const startSize = 1  // 별 크기
      const density = 200  // 밀집도
      const delaySpace = 100  //  오브젝트 간 애니메이션 간격
      const starObjs = new THREE.Object3D()
      const starObjChild = starObj.children[3]
      starObjChild.material.toneMapped = false
      starObjChild.material.emissive = {b: 1, g: 1, isColor: true, r: 1}
      starObjChild.material.emissiveIntensity = 10
      starObjChild.material.metalness = 1
      starObjChild.material.roughness = 1
      starObjChild.layers.enable(1)
      starObjs.position.set(0, 0, 0.005)
      starObjs.scale.set(0, 0, 0)
      for (let i = 0; i < startCount; i++) {
        const posX = (Math.random() * 10 - 5) / density
        const posY = (Math.random() * 10 - 5) / density
        starObj.position.set(posX, posY, 0)
        starObjs.add(starObj.clone())
      }

      const effStarObjs = () => {
        setTimeout(() => {
          starObjs.scale.set(100, 100, 1)
          starObjs.children.forEach((obj, idx) => {
            gsap.fromTo(obj.scale, {x: 0, y: 0, z: 0}, {x: startSize, y: startSize, z: startSize, duration: 0.2, repeat: 1, yoyo: true, delay: (idx * delaySpace) / 1000, repeatDelay: 0})
          })
        }, animationDelay)
      }
      effStarObjs()
      //  아반떼 슉슉 애니메이션
      const cn7EffAwait = await loader.loadAsync(cn7Url)
      const cn7Eff = cn7EffAwait.scene
      cn7Eff.position.set(0.02, 0, -1)
      cn7Eff.scale.set(10, 10, 1)
      cn7Eff.traverse((obj) => {
        if (obj.isMesh) {
          obj.material.transparent = true
        }
      })
      const cn7Mixer = new THREE.AnimationMixer(cn7Eff)
      const cn7MixerAction = cn7Mixer.clipAction(cn7EffAwait.animations[0])
      cn7MixerAction.setLoop(THREE.LoopOnce);
      cn7MixerAction.clampWhenFinished = true
      cn7MixerAction.setDuration(4.5)
      cn7MixerAction.play()
      bloomPassSet(1.2, 0)
      // scene.add(starObjs)
      scene.add(cn7Eff)
      // #region 정육면체 틀 소환@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
      const cubeEffAwait = await loader.loadAsync(cubeUrl)
      const cubeEff = cubeEffAwait.scene
      const cubeSize = 3
      cubeEff.traverse((obj) => {
        if (obj.isMesh) {
          obj.material.transparent = true
        }
      })
      cubeEff.position.set(0.02, 0, -1)
      cubeEff.scale.set(cubeSize, cubeSize, cubeSize)
      const cubeMixer = new THREE.AnimationMixer(cubeEff)
      const cubeMixerAction = cubeMixer.clipAction(cubeEffAwait.animations[0])
      cubeMixerAction.play()
      // scene.add(cubeEff)
      // #endregion 정육면체 틀 소환@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
      const update = (time) => {
        // time *= 0.001
        const delta = clock.getDelta()
        if (cardOpenMixer) cardOpenMixer.update(delta)
        if (cn7Mixer) cn7Mixer.update(delta)
        if (cubeMixer) cubeMixer.update(delta)
        requestAnimationFrame(update)
      }
      update()
    }
    b()
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    window.scene3 = scene3
    window.XR8.Threejs.xrScene = xrScene

    const gui = new dat.GUI({width: 250})
    gui.add(params, 'exposure', 0.1, 2).onChange((value) => {
      renderer.toneMappingExposure = value ** 4
    })
    gui.add(bloomPass, 'threshold', 0, 1)
    gui.add(bloomPass, 'strength', 0, 3)
    gui.add(bloomPass, 'radius', 0, 1)
  }

  return {
    name: 'customthreejs',
    onStart: args => trySetup(args),
    onDetach: () => {
      isSetup = false
    },
    onUpdate: ({processCpuResult}) => {
      const realitySource =
        processCpuResult.reality || processCpuResult.facecontroller

      if (!realitySource) {
        return
      }

      const {rotation, position, intrinsics} = realitySource
      const {camera} = scene3

      for (let i = 0; i < 16; i++) {
        camera.projectionMatrix.elements[i] = intrinsics[i]
      }

      // Fix for broken raycasting in r103 and higher. Related to:
      //   https://github.com/mrdoob/three.js/pull/15996
      // Note: camera.projectionMatrixInverse wasn't introduced until r96 so check before setting
      // the inverse
      if (camera.projectionMatrixInverse) {
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      }

      if (rotation) {
        camera.setRotationFromQuaternion(rotation)
      }
      if (position) {
        camera.position.set(position.x, position.y, position.z)
      }
    },
    onCanvasSizeChange: ({canvasWidth, canvasHeight, videoWidth, videoHeight}) => {
      if (!isSetup) {
        return
      }
      cameraTexture = new DataTexture(
        new Uint8Array(canvasWidth * canvasHeight * 3),
        canvasWidth,
        canvasHeight,
        RGBFormat
      )

      const {renderer} = scene3
      renderer.setSize(canvasWidth, canvasHeight)
      const pixelRatio = MathUtils.clamp(window.devicePixelRatio, 1, 2)
      renderer.pixelRatio = pixelRatio

      // Update render pass sizes
      scene3.bloomComposer.setSize(
        canvasWidth * pixelRatio,
        canvasHeight * pixelRatio
      )
      scene3.bloomComposer.passes.forEach((pass) => {
        if (pass.setSize) {
          pass.setSize(canvasWidth * pixelRatio, canvasHeight * pixelRatio)
        }
      })
      scene3.composer.setSize(
        canvasWidth * pixelRatio,
        canvasHeight * pixelRatio
      )
      scene3.composer.passes.forEach((pass) => {
        if (pass.setSize) {
          pass.setSize(canvasWidth * pixelRatio, canvasHeight * pixelRatio)
        }
      })
      if (bloomPass && combinePass && sceneTarget && copyPass) {
        combinePass.uniforms.cameraTexture = {value: cameraTexture}
        combinePass.uniforms.bloomTexture = {
          value: bloomPass.renderTargetsHorizontal[0],
        }
        sceneTarget.setSize(
          canvasWidth * pixelRatio,
          canvasHeight * pixelRatio
        )
        copyPass.uniforms.tDiffuse = {value: sceneTarget.texture}
      }
    },
    onRender: () => {
      if (cameraTexture) {
        scene3.renderer.copyFramebufferToTexture(
          cameraTextureCopyPosition,
          cameraTexture
        )
      }
      if (sceneTarget) {
        scene3.renderer.setRenderTarget(sceneTarget)
      }
      scene3.renderer.clear()
      scene3.renderer.clearDepth()
      scene3.renderer.render(scene3.scene, scene3.camera)
      scene3.renderer.setRenderTarget(null)

      scene3.bloomComposer.render()
      scene3.composer.render()
    },
    // Get a handle to the xr scene, camera, renderer, and composers
    xrScene,
  }
}
