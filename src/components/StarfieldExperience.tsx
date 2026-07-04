import {
  OrbitControls,
  useTexture,
} from '@react-three/drei'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  Color,
  Group,
  MathUtils,
  SRGBColorSpace,
  Vector3,
  type Camera,
} from 'three'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import {
  computeHorizonObjects,
  computeHorizonStars,
  createHorizonProjector,
  type HorizonProjector,
  type HorizonObject,
  type HorizonStar,
} from '../lib/astro'
import {
  DEEP_SKY_OBJECTS,
  type DeepSkyObject,
} from '../data/deepSkyObjects'
import type { CelestialCatalog } from '../lib/celestialCatalog'
import {
  EARTH_RADIUS,
  latLonToVector3,
  vector3ToLatLon,
} from '../lib/geo'
import type {
  ActiveLocation,
  ExperienceStage,
  LocationTarget,
} from '../types'

type StarfieldExperienceProps = {
  catalog: CelestialCatalog | null
  highlightedStarId: string | null
  stage: ExperienceStage
  target: LocationTarget
  skySignal: number
  utcDate: Date
  onStageChange: (stage: ExperienceStage) => void
  onTargetChange: (target: LocationTarget) => void
}

const CAMERA_HOME = new Vector3(0, 1.55, 5.15)
const SKY_CHART_RADIUS = 3.05
const SKY_CHART_CAMERA = new Vector3(0, 0, 7)
const STAR_WHITE = new Color('#f8fbff')

type HorizonDeepSkyObject = HorizonObject<DeepSkyObject>
type OrientedHorizonDeepSkyObject = HorizonDeepSkyObject & {
  skyNorthAngleDeg: number
}
type PlanispherePoint = Pick<HorizonStar, 'altitude' | 'azimuth'>

const STAR_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aIntensity;

  varying vec3 vColor;
  varying float vIntensity;

  void main() {
    vColor = color;
    vIntensity = aIntensity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vIntensity;

  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(point) * 2.0;
    float core = smoothstep(0.34, 0.0, distanceFromCenter);
    float halo = smoothstep(1.0, 0.0, distanceFromCenter);
    float alpha = (core * 1.0 + halo * 0.45) * vIntensity;

    if (alpha < 0.015) {
      discard;
    }

    vec3 glow = vColor * (0.78 + core * 0.9 + halo * 0.34);

    gl_FragColor = vec4(glow, alpha);
  }
`

const DEEP_SKY_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const DEEP_SKY_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform vec3 uAccent;
  uniform vec3 uTint;
  uniform float uAlphaHigh;
  uniform float uAlphaLow;
  uniform float uColorMaskBoost;
  uniform float uContrast;
  uniform float uEdgePower;
  uniform float uHazeStrength;
  uniform float uIntensity;
  uniform float uOpacity;
  uniform float uTintMix;

  varying vec2 vUv;

  void main() {
    vec2 point = (vUv - vec2(0.5)) * 2.0;
    float radius = length(point);
    vec4 sampleColor = texture2D(uTexture, vUv);

    vec3 gray = vec3(dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114)));
    vec3 corrected = clamp((sampleColor.rgb - vec3(0.5)) * uContrast + vec3(0.5), 0.0, 1.0);
    float brightness = max(max(corrected.r, corrected.g), corrected.b);
    float luminance = dot(corrected, vec3(0.299, 0.587, 0.114));
    float colorfulness = length(sampleColor.rgb - gray);
    float maskSignal = brightness + colorfulness * uColorMaskBoost;
    float imageAlpha = smoothstep(uAlphaLow, uAlphaHigh, maskSignal);
    float edgeMask = pow(smoothstep(1.0, 0.0, radius), uEdgePower);
    float hazeAlpha = smoothstep(uAlphaLow * 0.45, uAlphaHigh, luminance) * uHazeStrength * edgeMask;
    float alpha = max(imageAlpha * edgeMask, hazeAlpha) * uIntensity * uOpacity;

    if (radius > 1.0 || alpha < 0.004) {
      discard;
    }

    float accentBlend = smoothstep(0.12, 0.62, colorfulness) * 0.35;
    vec3 tinted = mix(corrected * uTint, corrected * uAccent, accentBlend);
    vec3 glow = mix(corrected, tinted, uTintMix);
    glow *= 0.8 + smoothstep(0.5, 1.0, brightness) * 0.5 + colorfulness * 0.12;

    gl_FragColor = vec4(glow, alpha);
  }
`

export function StarfieldExperience({
  catalog,
  highlightedStarId,
  stage,
  target,
  skySignal,
  utcDate,
  onStageChange,
  onTargetChange,
}: StarfieldExperienceProps) {
  return (
    <Canvas
      camera={{ position: CAMERA_HOME.toArray(), fov: 48, near: 0.01, far: 80 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#02050c']} />
      <fog attach="fog" args={['#02050c', 11, 38]} />
      <ambientLight intensity={0.58} />
      <directionalLight color="#f7fbff" intensity={3.4} position={[4, 2, 4]} />
      <directionalLight color="#5fb0ff" intensity={1.2} position={[-3, 1, -4]} />
      <SceneContent
        catalog={catalog}
        highlightedStarId={highlightedStarId}
        onStageChange={onStageChange}
        onTargetChange={onTargetChange}
        skySignal={skySignal}
        stage={stage}
        target={target}
        utcDate={utcDate}
      />
    </Canvas>
  )
}

type SceneContentProps = StarfieldExperienceProps

function SceneContent({
  catalog,
  highlightedStarId,
  stage,
  target,
  skySignal,
  utcDate,
  onStageChange,
  onTargetChange,
}: SceneContentProps) {
  const { camera, gl } = useThree()
  const earthGroupRef = useRef<Group | null>(null)
  const lastSkySignalRef = useRef(0)
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(
    null,
  )

  const showLocalSky = useCallback(
    (nextTarget: LocationTarget, rotationY: number) => {
      if (stage !== 'EARTH') {
        return
      }

      const active: ActiveLocation = { ...nextTarget, rotationY }

      setActiveLocation(active)
      onTargetChange(nextTarget)
      applyPlanisphereCamera(camera)
      onStageChange('SKY')
    },
    [camera, onStageChange, onTargetChange, stage],
  )

  const handleGlobePick = useCallback(
    (pickedTarget: LocationTarget) => {
      const rotationY = earthGroupRef.current?.rotation.y ?? 0
      showLocalSky(pickedTarget, rotationY)
    },
    [showLocalSky],
  )

  useEffect(() => {
    if (skySignal === lastSkySignalRef.current) {
      return
    }

    lastSkySignalRef.current = skySignal

    if (skySignal > 0) {
      showLocalSky(target, earthGroupRef.current?.rotation.y ?? 0)
    }
  }, [showLocalSky, skySignal, target])

  useEffect(() => {
    if (stage !== 'EARTH') {
      return
    }

    setActiveLocation(null)
    camera.position.copy(CAMERA_HOME)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
  }, [camera, stage])

  useEffect(() => {
    gl.domElement.style.cursor = 'default'
  }, [gl])

  return (
    <>
      {stage === 'EARTH' ? <StaticStarShell stage={stage} /> : null}
      <Earth
        activeLocation={activeLocation}
        groupRef={earthGroupRef}
        onPick={handleGlobePick}
        stage={stage}
      />
      {activeLocation && stage === 'SKY' && catalog ? (
        <LocalSky
          activeLocation={activeLocation}
          catalog={catalog}
          highlightedStarId={highlightedStarId}
          utcDate={utcDate}
        />
      ) : null}
      <OrbitControls
        autoRotate={stage === 'EARTH'}
        autoRotateSpeed={0.28}
        enableDamping
        enablePan={false}
        enableZoom={stage === 'EARTH'}
        enabled={stage === 'EARTH'}
        maxDistance={7}
        minDistance={2.7}
      />
    </>
  )
}

type EarthProps = {
  activeLocation: ActiveLocation | null
  groupRef: RefObject<Group | null>
  onPick: (target: LocationTarget) => void
  stage: ExperienceStage
}

function Earth({ activeLocation, groupRef, onPick, stage }: EarthProps) {
  const earthTexture = useTexture('/vendor/nasa/earth_noClouds.0330.jpg')
  const markerPosition = useMemo(() => {
    if (!activeLocation) {
      return null
    }

    return latLonToVector3(activeLocation.lat, activeLocation.lon, 1.035)
  }, [activeLocation])

  useFrame((_, delta) => {
    if (stage === 'EARTH' && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
    }
  })

  useEffect(() => {
    earthTexture.colorSpace = SRGBColorSpace
    earthTexture.anisotropy = 8
    earthTexture.needsUpdate = true
  }, [earthTexture])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()

    if (!groupRef.current || stage !== 'EARTH') {
      return
    }

    const localPoint = event.point.clone()
    groupRef.current.worldToLocal(localPoint)
    const { lat, lon } = vector3ToLatLon(localPoint)

    onPick({
      name: 'Globe selection',
      lat,
      lon,
      note: 'Picked directly on the rotating Earth',
    })
  }

  return (
    <group ref={groupRef} visible={stage !== 'SKY'}>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshStandardMaterial
          color="#f6fbff"
          emissive="#051422"
          emissiveIntensity={0.18}
          map={earthTexture}
          metalness={0.02}
          roughness={0.82}
        />
      </mesh>
      <mesh scale={1.065}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#62c8ff"
          opacity={0.14}
          side={BackSide}
          transparent
        />
      </mesh>
      <mesh scale={1.135}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#5aa7ff"
          opacity={0.045}
          side={BackSide}
          transparent
        />
      </mesh>
      {markerPosition ? (
        <group position={markerPosition}>
          <mesh>
            <sphereGeometry args={[0.025, 24, 24]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color="#ffffff"
              toneMapped={false}
            />
          </mesh>
          <mesh scale={1.9}>
            <sphereGeometry args={[0.025, 24, 24]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color="#78d9ff"
              opacity={0.35}
              transparent
            />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

type StaticStarShellProps = {
  stage: ExperienceStage
}

function StaticStarShell({ stage }: StaticStarShellProps) {
  const positions = useMemo(() => {
    const random = mulberry32(42)
    const data = new Float32Array(1800 * 3)

    for (let i = 0; i < 1800; i += 1) {
      const radius = 28 + random() * 18
      const theta = random() * Math.PI * 2
      const z = random() * 2 - 1
      const radial = Math.sqrt(1 - z * z)

      data[i * 3] = radius * radial * Math.cos(theta)
      data[i * 3 + 1] = radius * z
      data[i * 3 + 2] = radius * radial * Math.sin(theta)
    }

    return data
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#d7e6ff"
        depthWrite={false}
        opacity={stage === 'SKY' ? 0.28 : 0.52}
        size={stage === 'SKY' ? 0.026 : 0.018}
        sizeAttenuation
        transparent
      />
    </points>
  )
}

type LocalSkyProps = {
  activeLocation: ActiveLocation
  catalog: CelestialCatalog
  highlightedStarId: string | null
  utcDate: Date
}

function LocalSky({
  activeLocation,
  catalog,
  highlightedStarId,
  utcDate,
}: LocalSkyProps) {
  const stars = useMemo(
    () =>
      computeHorizonStars(activeLocation, utcDate, catalog.stars).filter(
        (star) => star.visible,
      ),
    [activeLocation, catalog.stars, utcDate],
  )
  const deepSkyObjects = useMemo(
    () => computeVisibleDeepSkyObjects(activeLocation, utcDate),
    [activeLocation, utcDate],
  )

  return (
    <group>
      <PlanisphereDeepSkyLayer objects={deepSkyObjects} />
      <PlanisphereStarField
        highlightedStarId={highlightedStarId}
        stars={stars}
      />
    </group>
  )
}

type PlanisphereDeepSkyLayerProps = {
  objects: OrientedHorizonDeepSkyObject[]
}

function PlanisphereDeepSkyLayer({ objects }: PlanisphereDeepSkyLayerProps) {
  return (
    <group>
      {objects.map((object) => (
        <DeepSkyGlow key={object.id} object={object} />
      ))}
    </group>
  )
}

type DeepSkyGlowProps = {
  object: OrientedHorizonDeepSkyObject
}

function DeepSkyGlow({ object }: DeepSkyGlowProps) {
  const texture = useTexture(object.imagePath)
  const position = getPlanispherePosition(object)
  const horizonFade = MathUtils.smoothstep(object.altitude, 0, 18)
  const size = getDeepSkySize(object)
  const scale: [number, number, number] =
    [size * object.aspectRatio, size, 1]

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  const uniforms = useMemo(
    () => ({
      uAccent: { value: new Color(object.accentColor) },
      uAlphaHigh: { value: object.renderProfile.alphaHigh },
      uAlphaLow: { value: object.renderProfile.alphaLow },
      uColorMaskBoost: { value: object.renderProfile.colorMaskBoost },
      uContrast: { value: object.renderProfile.contrast },
      uEdgePower: { value: object.renderProfile.edgePower },
      uHazeStrength: { value: object.renderProfile.hazeStrength },
      uTexture: { value: texture },
      uTint: { value: new Color(object.color) },
      uIntensity: {
        value: MathUtils.lerp(0.38, object.glowStrength, horizonFade),
      },
      uOpacity: { value: object.renderProfile.opacity },
      uTintMix: { value: object.renderProfile.tintMix },
    }),
    [
      object.accentColor,
      horizonFade,
      object.color,
      object.glowStrength,
      object.renderProfile.alphaHigh,
      object.renderProfile.alphaLow,
      object.renderProfile.colorMaskBoost,
      object.renderProfile.contrast,
      object.renderProfile.edgePower,
      object.renderProfile.hazeStrength,
      object.renderProfile.opacity,
      object.renderProfile.tintMix,
      texture,
    ],
  )

  return (
    <group position={[position[0], position[1], 0.02]}>
      <mesh
        rotation={[0, 0, MathUtils.degToRad(object.skyNorthAngleDeg + object.rotationDeg)]}
        scale={scale}
      >
        <planeGeometry args={[2, 2, 1, 1]} />
        <shaderMaterial
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          fragmentShader={DEEP_SKY_FRAGMENT_SHADER}
          toneMapped={false}
          transparent
          uniforms={uniforms}
          vertexShader={DEEP_SKY_VERTEX_SHADER}
        />
      </mesh>
    </group>
  )
}

type PlanisphereStarFieldProps = {
  highlightedStarId: string | null
  stars: HorizonStar[]
}

function PlanisphereStarField({
  highlightedStarId,
  stars,
}: PlanisphereStarFieldProps) {
  const { colors, intensities, positions, sizes } = useMemo(() => {
    const nextPositions = new Float32Array(stars.length * 3)
    const nextColors = new Float32Array(stars.length * 3)
    const nextSizes = new Float32Array(stars.length)
    const nextIntensities = new Float32Array(stars.length)
    const color = new Color()

    stars.forEach((star, index) => {
      const magnitudeRank = MathUtils.clamp((6.1 - star.magnitude) / 7.6, 0, 1)
      const brightStar = magnitudeRank ** 1.65
      const horizonFade = MathUtils.smoothstep(star.altitude, 0, 14)
      const colorNeutrality = MathUtils.lerp(0.74, 0.5, magnitudeRank)
      const position = getPlanispherePosition(star)

      color
        .set(star.color)
        .lerp(STAR_WHITE, colorNeutrality)
        .multiplyScalar(MathUtils.lerp(0.88, 1.22, magnitudeRank))
      nextPositions[index * 3] = position[0]
      nextPositions[index * 3 + 1] = position[1]
      nextPositions[index * 3 + 2] = position[2]
      nextColors[index * 3] = color.r
      nextColors[index * 3 + 1] = color.g
      nextColors[index * 3 + 2] = color.b
      nextSizes[index] =
        MathUtils.lerp(2.9, 11.4, brightStar) *
        MathUtils.lerp(0.86, 1, horizonFade)
      nextIntensities[index] =
        MathUtils.lerp(0.42, 1.34, brightStar) *
        MathUtils.lerp(0.58, 1, horizonFade)
    })

    return {
      colors: nextColors,
      intensities: nextIntensities,
      positions: nextPositions,
      sizes: nextSizes,
    }
  }, [stars])
  const highlightedStar = useMemo(
    () =>
      highlightedStarId
        ? stars.find((star) => star.id === highlightedStarId) ?? null
        : null,
    [highlightedStarId, stars],
  )
  const highlightedPosition = highlightedStar
    ? getPlanispherePosition(highlightedStar)
    : null

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute
            attach="attributes-aIntensity"
            args={[intensities, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={STAR_FRAGMENT_SHADER}
          transparent
          vertexColors
          vertexShader={STAR_VERTEX_SHADER}
        />
      </points>
      {highlightedPosition ? (
        <group
          position={[highlightedPosition[0], highlightedPosition[1], 0.04]}
        >
          <mesh>
            <ringGeometry args={[0.052, 0.088, 48]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color="#ffffff"
              depthTest={false}
              depthWrite={false}
              opacity={0.95}
              transparent
            />
          </mesh>
          <mesh>
            <ringGeometry args={[0.102, 0.168, 56]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color="#67e8f9"
              depthTest={false}
              depthWrite={false}
              opacity={0.38}
              transparent
            />
          </mesh>
        </group>
      ) : null}
    </>
  )
}

function getPlanispherePosition(point: PlanispherePoint): [number, number, number] {
  const radius = ((90 - point.altitude) / 90) * SKY_CHART_RADIUS
  const azimuth = MathUtils.degToRad(point.azimuth)

  return [Math.sin(azimuth) * radius, Math.cos(azimuth) * radius, 0]
}

function computeVisibleDeepSkyObjects(
  activeLocation: ActiveLocation,
  utcDate: Date,
): OrientedHorizonDeepSkyObject[] {
  const projector = createHorizonProjector(activeLocation, utcDate)

  return computeHorizonObjects(
    activeLocation,
    utcDate,
    DEEP_SKY_OBJECTS,
  ).filter((object) => object.visible).map((object) => ({
    ...object,
    skyNorthAngleDeg: getProjectedNorthAngle(object, projector),
  }))
}

function getProjectedNorthAngle(
  object: HorizonDeepSkyObject,
  projector: HorizonProjector,
): number {
  const decStep = object.decDeg > 89.4 ? -0.35 : 0.35
  const northPoint = projector.toHorizontal({
    decDeg: MathUtils.clamp(object.decDeg + decStep, -89.8, 89.8),
    raDeg: object.raDeg,
  })
  const center = getPlanispherePosition(object)
  const north = getPlanispherePosition(northPoint)
  const dx = north[0] - center[0]
  const dy = north[1] - center[1]

  if (Math.abs(dx) + Math.abs(dy) < 0.0001) {
    return 0
  }

  return Math.atan2(-dx, dy) * MathUtils.RAD2DEG
}

function getDeepSkySize(object: HorizonDeepSkyObject): number {
  const angularRank = MathUtils.clamp(object.angularSizeArcMin / 120, 0, 1)
  const brightnessRank = MathUtils.clamp((9.4 - object.magnitude) / 8, 0, 1)

  return (
    MathUtils.lerp(0.12, 0.34, Math.max(angularRank, brightnessRank * 0.7)) *
    object.renderProfile.sizeScale
  )
}

function applyPlanisphereCamera(camera: Camera) {
  camera.position.copy(SKY_CHART_CAMERA)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
