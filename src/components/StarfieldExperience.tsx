import { Billboard, Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  DoubleSide,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  Quaternion,
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
import { computeHorizonStars, horizonToWorldPosition } from '../lib/astro'
import {
  EARTH_RADIUS,
  getSurfaceFrame,
  latLonToVector3,
  vector3ToLatLon,
  type SurfaceFrame,
} from '../lib/geo'
import type { ActiveLocation, ExperienceStage, LocationTarget } from '../types'

type StarfieldExperienceProps = {
  stage: ExperienceStage
  target: LocationTarget
  diveSignal: number
  utcDate: Date
  onStageChange: (stage: ExperienceStage) => void
  onTargetChange: (target: LocationTarget) => void
}

const CAMERA_HOME = new Vector3(0, 1.55, 5.15)
const SKY_RADIUS = 13
const MATRIX_SCRATCH = new Matrix4()

export function StarfieldExperience({
  stage,
  target,
  diveSignal,
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
        diveSignal={diveSignal}
        onStageChange={onStageChange}
        onTargetChange={onTargetChange}
        stage={stage}
        target={target}
        utcDate={utcDate}
      />
    </Canvas>
  )
}

type SceneContentProps = StarfieldExperienceProps

function SceneContent({
  stage,
  target,
  diveSignal,
  utcDate,
  onStageChange,
  onTargetChange,
}: SceneContentProps) {
  const { camera, gl } = useThree()
  const earthGroupRef = useRef<Group | null>(null)
  const transitionRef = useRef<gsap.core.Timeline | null>(null)
  const lastDiveSignalRef = useRef(0)
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(
    null,
  )

  const beginDive = useCallback(
    (nextTarget: LocationTarget, rotationY: number) => {
      if (stage !== 'EARTH') {
        return
      }

      transitionRef.current?.kill()

      const active: ActiveLocation = { ...nextTarget, rotationY }
      const frame = getSurfaceFrame(active.lat, active.lon, active.rotationY)
      const start = camera.position.clone()
      const end = frame.position.clone().addScaledVector(frame.up, 0.055)
      const control = start
        .clone()
        .lerp(end, 0.58)
        .addScaledVector(frame.up, 1.55)
        .addScaledVector(frame.east, 0.52)
      const pathPosition = new Vector3()
      const lookTarget = new Vector3()
      const lookDown = makeCameraQuaternion(
        end,
        new Vector3(0, 0, 0),
        frame.north,
      )
      const lookUp = makeCameraQuaternion(
        end,
        end.clone().add(frame.up),
        frame.north,
      )
      const flight = { descent: 0, flip: 0 }

      setActiveLocation(active)
      onTargetChange(nextTarget)
      onStageChange('TRANSITIONING')

      transitionRef.current = gsap
        .timeline({
          defaults: { overwrite: true },
          onComplete: () => {
            camera.position.copy(end)
            camera.quaternion.copy(lookUp)
            onStageChange('SKY')
          },
        })
        .to(flight, {
          descent: 1,
          duration: 3.2,
          ease: 'power4.out',
          onUpdate: () => {
            quadraticBezier(pathPosition, start, control, end, flight.descent)
            camera.position.copy(pathPosition)
            lookTarget.lerpVectors(
              new Vector3(0, 0, 0),
              frame.position,
              MathUtils.smoothstep(flight.descent, 0.46, 1),
            )
            camera.up.set(0, 1, 0)
            camera.lookAt(lookTarget)
          },
        })
        .call(() => onStageChange('FLIP'))
        .to(flight, {
          flip: 1,
          duration: 1.15,
          ease: 'expo.inOut',
          onUpdate: () => {
            camera.position.copy(end)
            camera.quaternion.slerpQuaternions(lookDown, lookUp, flight.flip)
          },
        })
    },
    [camera, onStageChange, onTargetChange, stage],
  )

  const handleGlobePick = useCallback(
    (pickedTarget: LocationTarget) => {
      const rotationY = earthGroupRef.current?.rotation.y ?? 0
      beginDive(pickedTarget, rotationY)
    },
    [beginDive],
  )

  useEffect(() => {
    if (diveSignal === lastDiveSignalRef.current) {
      return
    }

    lastDiveSignalRef.current = diveSignal

    if (diveSignal > 0) {
      beginDive(target, earthGroupRef.current?.rotation.y ?? 0)
    }
  }, [beginDive, diveSignal, target])

  useEffect(() => {
    if (stage !== 'EARTH') {
      return
    }

    transitionRef.current?.kill()
    setActiveLocation(null)
    camera.position.copy(CAMERA_HOME)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
  }, [camera, stage])

  useSkyLookControls(stage, activeLocation)

  useEffect(() => {
    gl.domElement.style.cursor = stage === 'SKY' ? 'grab' : 'default'

    return () => {
      gl.domElement.style.cursor = 'default'
    }
  }, [gl, stage])

  return (
    <>
      <StaticStarShell stage={stage} />
      <Earth
        activeLocation={activeLocation}
        groupRef={earthGroupRef}
        onPick={handleGlobePick}
        stage={stage}
      />
      {activeLocation && stage === 'SKY' ? (
        <LocalSky activeLocation={activeLocation} utcDate={utcDate} />
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
  const earthTexture = useMemo(() => createEarthTexture(), [])
  const cloudTexture = useMemo(() => createCloudTexture(), [])
  const cloudRef = useRef<Mesh | null>(null)
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

    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.014
    }
  })

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
          emissive="#07182a"
          emissiveIntensity={0.48}
          map={earthTexture}
          metalness={0.05}
          roughness={0.78}
        />
      </mesh>
      <mesh ref={cloudRef} scale={1.012}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshStandardMaterial
          alphaMap={cloudTexture}
          color="#ffffff"
          opacity={0.23}
          transparent
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
  utcDate: Date
}

function LocalSky({ activeLocation, utcDate }: LocalSkyProps) {
  const frame = useMemo(
    () =>
      getSurfaceFrame(
        activeLocation.lat,
        activeLocation.lon,
        activeLocation.rotationY,
      ),
    [activeLocation],
  )
  const stars = useMemo(
    () =>
      computeHorizonStars(activeLocation, utcDate).filter(
        (star) => star.altitude > -8,
      ),
    [activeLocation, utcDate],
  )
  const labelIds = useMemo(
    () =>
      new Set(
        stars
          .filter((star) => star.visible && star.magnitude <= 1.3)
          .slice(0, 8)
          .map((star) => star.id),
      ),
    [stars],
  )

  return (
    <group>
      <SkyGround frame={frame} />
      <AltitudeRing altitude={0} frame={frame} opacity={0.62} />
      <AltitudeRing altitude={30} frame={frame} opacity={0.28} />
      <AltitudeRing altitude={60} frame={frame} opacity={0.2} />
      {stars.map((star) => (
        <RealStar
          frame={frame}
          key={star.id}
          label={labelIds.has(star.id)}
          star={star}
        />
      ))}
    </group>
  )
}

type SkyGroundProps = {
  frame: SurfaceFrame
}

function SkyGround({ frame }: SkyGroundProps) {
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), frame.up),
    [frame],
  )
  const groundPosition = useMemo(
    () => frame.position.clone().addScaledVector(frame.up, -0.012),
    [frame],
  )

  return (
    <group position={groundPosition} quaternion={quaternion}>
      <mesh>
        <circleGeometry args={[SKY_RADIUS * 0.92, 160]} />
        <meshBasicMaterial
          color="#06111a"
          opacity={0.86}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <mesh>
        <torusGeometry args={[SKY_RADIUS * 0.92, 0.012, 8, 192]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#7dd8ff"
          opacity={0.45}
          transparent
        />
      </mesh>
    </group>
  )
}

type AltitudeRingProps = {
  altitude: number
  frame: SurfaceFrame
  opacity: number
}

function AltitudeRing({ altitude, frame, opacity }: AltitudeRingProps) {
  const points = useMemo(() => {
    const ring: Vector3[] = []

    for (let step = 0; step <= 192; step += 1) {
      ring.push(horizonToWorldPosition(frame, (step / 192) * 360, altitude, SKY_RADIUS))
    }

    return ring
  }, [altitude, frame])

  return (
    <Line
      color="#7dd8ff"
      depthWrite={false}
      lineWidth={1}
      opacity={opacity}
      points={points}
      transparent
    />
  )
}

type RealStarProps = {
  frame: SurfaceFrame
  label: boolean
  star: ReturnType<typeof computeHorizonStars>[number]
}

function RealStar({ frame, label, star }: RealStarProps) {
  const position = useMemo(
    () =>
      horizonToWorldPosition(frame, star.azimuth, star.altitude, SKY_RADIUS),
    [frame, star.altitude, star.azimuth],
  )
  const size = MathUtils.clamp(star.brightness * 0.018, 0.012, 0.07)
  const opacity = star.visible ? 1 : 0.23

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 18, 18]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color={star.color}
          opacity={opacity}
          toneMapped={false}
          transparent
        />
      </mesh>
      <mesh scale={2.65}>
        <sphereGeometry args={[size, 18, 18]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color={star.color}
          opacity={opacity * 0.18}
          toneMapped={false}
          transparent
        />
      </mesh>
      {label ? (
        <Billboard follow>
          <Text
            anchorX="center"
            anchorY="middle"
            color="#e9f5ff"
            fontSize={0.09}
            outlineBlur={0.012}
            outlineColor="#02050c"
            outlineOpacity={0.85}
            position={[0, 0.16, 0]}
          >
            {star.name}
          </Text>
        </Billboard>
      ) : null}
    </group>
  )
}

function useSkyLookControls(
  stage: ExperienceStage,
  activeLocation: ActiveLocation | null,
) {
  const { camera, gl } = useThree()
  const viewRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    pitch: MathUtils.degToRad(78),
    yaw: 0,
  })

  useEffect(() => {
    if (stage !== 'SKY' || !activeLocation) {
      return
    }

    viewRef.current.yaw = 0
    viewRef.current.pitch = MathUtils.degToRad(78)
    applySkyCamera(camera, activeLocation, viewRef.current.yaw, viewRef.current.pitch)
  }, [activeLocation, camera, stage])

  useEffect(() => {
    if (stage !== 'SKY' || !activeLocation) {
      return undefined
    }

    const canvas = gl.domElement
    const view = viewRef.current

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return
      }

      view.dragging = true
      view.lastX = event.clientX
      view.lastY = event.clientY
      canvas.style.cursor = 'grabbing'
      canvas.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!view.dragging) {
        return
      }

      const dx = event.clientX - view.lastX
      const dy = event.clientY - view.lastY
      view.lastX = event.clientX
      view.lastY = event.clientY
      view.yaw -= dx * 0.004
      view.pitch = MathUtils.clamp(
        view.pitch + dy * 0.003,
        MathUtils.degToRad(-8),
        MathUtils.degToRad(86),
      )
      applySkyCamera(camera, activeLocation, view.yaw, view.pitch)
    }

    const handlePointerUp = (event: PointerEvent) => {
      view.dragging = false
      canvas.style.cursor = 'grab'

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      view.dragging = false
    }
  }, [activeLocation, camera, gl, stage])
}

function applySkyCamera(
  camera: Camera,
  activeLocation: ActiveLocation,
  yaw: number,
  pitch: number,
) {
  const frame = getSurfaceFrame(
    activeLocation.lat,
    activeLocation.lon,
    activeLocation.rotationY,
  )
  const horizonDirection = frame.north
    .clone()
    .multiplyScalar(Math.cos(yaw))
    .addScaledVector(frame.east, Math.sin(yaw))
    .normalize()
  const direction = horizonDirection
    .multiplyScalar(Math.cos(pitch))
    .addScaledVector(frame.up, Math.sin(pitch))
    .normalize()
  const position = frame.position.clone().addScaledVector(frame.up, 0.055)
  const target = position.clone().add(direction)
  const safeUp =
    Math.abs(direction.dot(frame.up)) > 0.96 ? frame.north : frame.up

  camera.position.copy(position)
  camera.up.copy(safeUp)
  camera.lookAt(target)
}

function makeCameraQuaternion(
  position: Vector3,
  target: Vector3,
  up: Vector3,
): Quaternion {
  return new Quaternion().setFromRotationMatrix(
    MATRIX_SCRATCH.lookAt(position, target, up),
  )
}

function quadraticBezier(
  output: Vector3,
  start: Vector3,
  control: Vector3,
  end: Vector3,
  t: number,
): Vector3 {
  const inverse = 1 - t

  return output
    .copy(start)
    .multiplyScalar(inverse * inverse)
    .addScaledVector(control, 2 * inverse * t)
    .addScaledVector(end, t * t)
}

function createEarthTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')

  if (!context) {
    return new CanvasTexture(canvas)
  }

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height)
  ocean.addColorStop(0, '#123f75')
  ocean.addColorStop(0.46, '#0d6e93')
  ocean.addColorStop(1, '#071f48')
  context.fillStyle = ocean
  context.fillRect(0, 0, canvas.width, canvas.height)

  drawLand(context, canvas, [
    [-168, 70],
    [-126, 72],
    [-95, 52],
    [-70, 45],
    [-55, 20],
    [-88, 8],
    [-118, 22],
    [-138, 45],
  ])
  drawLand(context, canvas, [
    [-82, 12],
    [-45, -4],
    [-36, -26],
    [-58, -54],
    [-72, -40],
    [-78, -12],
  ])
  drawLand(context, canvas, [
    [-18, 36],
    [12, 58],
    [72, 70],
    [136, 52],
    [146, 24],
    [105, 7],
    [70, 23],
    [36, 8],
    [9, 28],
  ])
  drawLand(context, canvas, [
    [-17, 30],
    [35, 33],
    [50, 8],
    [31, -34],
    [8, -36],
    [-7, -5],
  ])
  drawLand(context, canvas, [
    [111, -11],
    [154, -18],
    [148, -41],
    [114, -35],
  ])
  drawLand(context, canvas, [
    [-180, -62],
    [-90, -70],
    [0, -66],
    [90, -70],
    [180, -62],
    [180, -88],
    [-180, -88],
  ])

  context.globalAlpha = 0.18
  context.fillStyle = '#b8f1ff'

  for (let y = 24; y < canvas.height; y += 52) {
    context.fillRect(0, y, canvas.width, 1)
  }

  context.globalAlpha = 1

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true

  return texture
}

function createCloudTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')

  if (!context) {
    return new CanvasTexture(canvas)
  }

  const random = mulberry32(17)
  context.fillStyle = '#000000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalCompositeOperation = 'lighter'

  for (let i = 0; i < 180; i += 1) {
    const x = random() * canvas.width
    const y = 70 + random() * (canvas.height - 140)
    const width = 40 + random() * 180
    const height = 5 + random() * 20
    const alpha = 0.18 + random() * 0.28

    context.fillStyle = `rgba(255, 255, 255, ${alpha})`
    context.beginPath()
    context.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2)
    context.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true

  return texture
}

function drawLand(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  points: Array<[number, number]>,
) {
  const [firstLon, firstLat] = points[0] ?? [0, 0]
  const [firstX, firstY] = projectToCanvas(canvas, firstLon, firstLat)

  context.beginPath()
  context.moveTo(firstX, firstY)

  for (const [lon, lat] of points.slice(1)) {
    const [x, y] = projectToCanvas(canvas, lon, lat)
    context.lineTo(x, y)
  }

  context.closePath()
  context.fillStyle = '#39896f'
  context.fill()
  context.strokeStyle = '#9bd6a7'
  context.lineWidth = 2
  context.stroke()
}

function projectToCanvas(
  canvas: HTMLCanvasElement,
  lon: number,
  lat: number,
): [number, number] {
  return [
    ((lon + 180) / 360) * canvas.width,
    ((90 - lat) / 180) * canvas.height,
  ]
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
