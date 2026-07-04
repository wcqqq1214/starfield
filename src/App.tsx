import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Globe2,
  LocateFixed,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { StarfieldExperience } from './components/StarfieldExperience'
import { CITY_LOCATIONS, DEFAULT_CITY } from './data/cities'
import { computeHorizonStars, type HorizonStar } from './lib/astro'
import {
  loadD3CelestialCatalog,
  type CelestialCatalog,
} from './lib/celestialCatalog'
import type { ExperienceStage, LocationTarget } from './types'

function App() {
  const [stage, setStage] = useState<ExperienceStage>('EARTH')
  const [target, setTarget] = useState<LocationTarget>(DEFAULT_CITY)
  const [form, setForm] = useState({
    lat: DEFAULT_CITY.lat.toString(),
    lon: DEFAULT_CITY.lon.toString(),
  })
  const [citySearch, setCitySearch] = useState('')
  const [citySearchOpen, setCitySearchOpen] = useState(false)
  const [activeCitySuggestionIndex, setActiveCitySuggestionIndex] = useState(0)
  const [locationOpen, setLocationOpen] = useState(true)
  const [starPanelOpen, setStarPanelOpen] = useState(false)
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null)
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null)
  const [skySignal, setSkySignal] = useState(0)
  const [utcDate, setUtcDate] = useState(() => new Date())
  const [catalog, setCatalog] = useState<CelestialCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setUtcDate(new Date()), 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true

    loadD3CelestialCatalog()
      .then((nextCatalog) => {
        if (active) {
          setCatalog(nextCatalog)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCatalogError(
            error instanceof Error ? error.message : 'Failed to load catalog',
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  const skyMinute = Math.floor(utcDate.getTime() / 60_000)
  const skyDate = useMemo(() => new Date(skyMinute * 60_000), [skyMinute])

  const horizonStars = useMemo(
    () => (catalog ? computeHorizonStars(target, skyDate, catalog.stars) : []),
    [catalog, skyDate, target],
  )
  const visibleStars = useMemo(
    () => horizonStars.filter((star) => star.visible).slice(0, 5),
    [horizonStars],
  )
  const selectedStar = useMemo(
    () =>
      selectedStarId
        ? horizonStars.find(
            (star) => star.id === selectedStarId && star.visible,
          ) ?? null
        : null,
    [horizonStars, selectedStarId],
  )

  useEffect(() => {
    if (!selectedStarId || selectedStar) {
      return
    }

    setSelectedStarId(null)
  }, [selectedStar, selectedStarId])

  const citySuggestions = useMemo(() => {
    const query = normalizeSearchText(citySearch)

    if (!query) {
      return []
    }

    return CITY_LOCATIONS.filter((location) =>
      matchesWordPrefix(location.name, query),
    ).slice(0, 5)
  }, [citySearch])

  const selectLocation = (location: LocationTarget) => {
    setTarget(location)
    setForm({
      lat: location.lat.toFixed(4),
      lon: location.lon.toFixed(4),
    })
    setCitySearch(location.name)
    setCitySearchOpen(false)
    setActiveCitySuggestionIndex(0)
  }

  const resolveFormTarget = (): LocationTarget => {
    const lat = clampNumber(Number.parseFloat(form.lat), -90, 90)
    const lon = normalizeLongitude(Number.parseFloat(form.lon))
    const keepsSelectedLocation =
      Math.abs(lat - target.lat) < 0.0001 && Math.abs(lon - target.lon) < 0.0001
    const nextTarget: LocationTarget = keepsSelectedLocation
      ? { ...target, lat, lon }
      : {
          name: 'Manual coordinates',
          lat,
          lon,
          note: 'Entered from the coordinate panel',
        }

    setTarget(nextTarget)
    setForm({
      lat: lat.toFixed(4),
      lon: lon.toFixed(4),
    })

    return nextTarget
  }

  const showSky = () => {
    if (stage !== 'EARTH') {
      return
    }

    resolveFormTarget()
    setStarPanelOpen(false)
    setSelectedStarId(null)
    setHoveredStarId(null)
    setSkySignal((value) => value + 1)
  }

  const resetToEarth = () => {
    setStage('EARTH')
    setStarPanelOpen(false)
    setSelectedStarId(null)
    setHoveredStarId(null)
  }

  const handleTargetChange = (nextTarget: LocationTarget) => {
    setTarget(nextTarget)
    setForm({
      lat: nextTarget.lat.toFixed(4),
      lon: nextTarget.lon.toFixed(4),
    })
    setCitySearch(
      CITY_LOCATIONS.some((location) => location.name === nextTarget.name)
        ? nextTarget.name
        : '',
    )
    setActiveCitySuggestionIndex(0)
    setSelectedStarId(null)
    setHoveredStarId(null)
  }

  const collapseStarPanel = () => {
    setStarPanelOpen(false)
    setSelectedStarId(null)
    setHoveredStarId(null)
  }

  const handleStarSelect = (starId: string) => {
    setStarPanelOpen(true)
    setSelectedStarId(starId)
  }

  const showLocationPanel = stage === 'EARTH'
  const showStarPanel = stage === 'SKY'
  const highlightedStarId = starPanelOpen
    ? hoveredStarId ?? selectedStarId
    : null

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-[#02050c] text-slate-100">
      <StarfieldExperience
        catalog={catalog}
        highlightedStarId={highlightedStarId}
        onStageChange={setStage}
        onTargetChange={handleTargetChange}
        skySignal={skySignal}
        stage={stage}
        target={target}
        utcDate={skyDate}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(42,170,255,0.14),transparent_36%),linear-gradient(180deg,rgba(2,5,12,0)_60%,rgba(2,5,12,0.84)_100%)]" />
      {stage === 'SKY' ? (
        <div className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2">
          <button
            aria-label="Exit sky view"
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-[#07111f]/72 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-cyan-300/45 hover:bg-[#0a1728]/82"
            onClick={resetToEarth}
            title="Exit sky view"
            type="button"
          >
            <ArrowLeft className="size-4" />
          </button>
        </div>
      ) : null}
      <section className="pointer-events-none absolute inset-0 grid grid-cols-[360px_1fr_320px] content-start gap-4 p-5">
        {showLocationPanel ? (
          <motion.aside
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto max-w-full self-start rounded-lg border border-white/12 bg-[#07111f]/72 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl"
            initial={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
          <button
            aria-expanded={locationOpen}
            aria-label={
              locationOpen ? 'Collapse location panel' : 'Expand location panel'
            }
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => {
              setLocationOpen((value) => !value)
              setCitySearchOpen(false)
            }}
            type="button"
          >
            <span className="min-w-0">
              <span className="block text-xs font-medium uppercase text-slate-400">
                Location
              </span>
              <span className="mt-1 block truncate text-lg font-semibold tracking-normal text-white">
                {target.name}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-cyan-200">
              <Globe2 className="size-5" />
              {locationOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </span>
          </button>

          {locationOpen ? (
            <div>
              <div className="relative mt-5">
                <label className="text-xs font-medium uppercase text-slate-400">
                  City
                  <div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3 transition focus-within:border-cyan-300/60">
                    <Search className="size-4 shrink-0 text-slate-500" />
                    <input
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      disabled={stage !== 'EARTH'}
                      onBlur={() => setCitySearchOpen(false)}
                      onChange={(event) => {
                        setCitySearch(event.target.value)
                        setCitySearchOpen(true)
                        setActiveCitySuggestionIndex(0)
                      }}
                      onFocus={() => setCitySearchOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault()
                          setCitySearchOpen(true)
                          setActiveCitySuggestionIndex((value) =>
                            citySuggestions.length
                              ? (value + 1) % citySuggestions.length
                              : 0,
                          )
                        }

                        if (event.key === 'ArrowUp') {
                          event.preventDefault()
                          setCitySearchOpen(true)
                          setActiveCitySuggestionIndex((value) =>
                            citySuggestions.length
                              ? (value - 1 + citySuggestions.length) %
                                citySuggestions.length
                              : 0,
                          )
                        }

                        if (event.key === 'Enter') {
                          const selectedLocation =
                            citySuggestions[activeCitySuggestionIndex] ??
                            citySuggestions[0]

                          if (selectedLocation) {
                            event.preventDefault()
                            selectLocation(selectedLocation)
                          }
                        }

                        if (event.key === 'Escape') {
                          setCitySearchOpen(false)
                        }
                      }}
                      placeholder="Search city"
                      value={citySearch}
                    />
                  </div>
                </label>

                {citySearchOpen && citySuggestions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-white/12 bg-[#07111f]/96 shadow-2xl shadow-black/35 backdrop-blur-xl">
                    {citySuggestions.map((location, index) => (
                      <button
                        className={`flex h-10 w-full items-center justify-between gap-3 px-3 text-left text-sm text-slate-100 transition hover:bg-cyan-300/10 ${
                          index === activeCitySuggestionIndex
                            ? 'bg-cyan-300/12 text-cyan-50'
                            : ''
                        }`}
                        key={`${location.name}-${location.note}-${location.lat}-${location.lon}`}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          selectLocation(location)
                        }}
                        onMouseEnter={() =>
                          setActiveCitySuggestionIndex(index)
                        }
                        type="button"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {location.name}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {location.note}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs font-medium uppercase text-slate-400">
                  Latitude
                  <input
                    className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                    disabled={stage !== 'EARTH'}
                    inputMode="decimal"
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        lat: event.target.value,
                      }))
                    }
                    value={form.lat}
                  />
                </label>
                <label className="text-xs font-medium uppercase text-slate-400">
                  Longitude
                  <input
                    className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                    disabled={stage !== 'EARTH'}
                    inputMode="decimal"
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        lon: event.target.value,
                      }))
                    }
                    value={form.lon}
                  />
                </label>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-900"
                  disabled={stage !== 'EARTH'}
                  onClick={showSky}
                  type="button"
                >
                  <LocateFixed className="size-4" />
                  Show sky
                </button>
                <button
                  aria-label="Reset to Earth"
                  className="inline-flex size-11 items-center justify-center rounded-md border border-white/12 bg-white/[0.06] text-slate-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
                  onClick={resetToEarth}
                  type="button"
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
          </motion.aside>
        ) : null}

        {showStarPanel ? (
          <motion.aside
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto col-start-3 self-start rounded-lg border border-white/12 bg-[#07111f]/72 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl"
            initial={{ opacity: 0, x: 16 }}
            transition={{ delay: 0.16, duration: 0.45, ease: 'easeOut' }}
          >
            <button
              aria-expanded={starPanelOpen}
              aria-label={
                starPanelOpen ? 'Collapse star panel' : 'Expand star panel'
              }
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => {
                if (starPanelOpen) {
                  collapseStarPanel()
                } else {
                  setStarPanelOpen(true)
                }
              }}
              type="button"
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium uppercase text-slate-400">
                  Featured stars
                </span>
                <span className="mt-1 block truncate text-lg font-semibold tracking-normal text-white">
                  {selectedStar ? selectedStar.displayName : 'Bright tonight'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-cyan-200">
                <Sparkles className="size-5" />
                {starPanelOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </span>
            </button>

            {starPanelOpen ? (
              <div className="mt-4">
                {selectedStar ? (
                  <StarDetails
                    onBack={() => setSelectedStarId(null)}
                    star={selectedStar}
                  />
                ) : (
                  <StarList
                    catalogError={catalogError}
                    loading={!catalog && !catalogError}
                    onHover={setHoveredStarId}
                    onSelect={handleStarSelect}
                    selectedStarId={selectedStarId}
                    stars={visibleStars}
                  />
                )}
              </div>
            ) : null}
          </motion.aside>
        ) : null}
      </section>
    </main>
  )
}

type StarListProps = {
  catalogError: string | null
  loading: boolean
  selectedStarId: string | null
  stars: HorizonStar[]
  onHover: (starId: string | null) => void
  onSelect: (starId: string) => void
}

function StarList({
  catalogError,
  loading,
  selectedStarId,
  stars,
  onHover,
  onSelect,
}: StarListProps) {
  return (
    <div className="space-y-2">
      {catalogError ? (
        <div className="rounded-md border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm text-red-100">
          {catalogError}
        </div>
      ) : null}
      {loading ? (
        <div className="rounded-md border border-white/8 bg-white/[0.045] px-3 py-2 text-sm text-slate-300">
          Loading d3-celestial catalog
        </div>
      ) : null}
      {stars.map((star) => (
        <StarSummary
          key={star.id}
          onSelect={() => onSelect(star.id)}
          onHover={() => onHover(star.id)}
          onUnhover={() => onHover(null)}
          selected={star.id === selectedStarId}
          star={star}
        />
      ))}
    </div>
  )
}

type StarSummaryProps = {
  onSelect: () => void
  onHover: () => void
  onUnhover: () => void
  selected: boolean
  star: HorizonStar
}

function StarSummary({
  onSelect,
  onHover,
  onUnhover,
  selected,
  star,
}: StarSummaryProps) {
  const content = (
    <>
      <div>
        <div className="text-sm font-medium text-white">{star.displayName}</div>
        <div className="text-xs text-slate-400">{star.constellation}</div>
      </div>
      <div className="text-right text-xs text-cyan-100">
        <div>{formatDegrees(star.altitude, 1)} alt</div>
        <div className="text-slate-400">{formatDegrees(star.azimuth, 0)} az</div>
      </div>
    </>
  )
  const className =
    'grid w-full grid-cols-[1fr_auto] gap-2 rounded-md border px-3 py-2'
  const stateClass = selected
    ? 'border-cyan-300/45 bg-cyan-300/13'
    : 'border-white/8 bg-white/[0.045]'

  return (
    <button
      aria-label={`Select ${star.displayName}`}
      className={`${className} ${stateClass} text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/10`}
      onBlur={onUnhover}
      onFocus={onHover}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      onPointerEnter={onHover}
      onPointerLeave={onUnhover}
      onClick={onSelect}
      type="button"
    >
      {content}
    </button>
  )
}

type StarDetailsProps = {
  onBack: () => void
  star: HorizonStar
}

function StarDetails({ onBack, star }: StarDetailsProps) {
  return (
    <div>
      <button
        className="inline-flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-2.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mt-4 truncate text-base font-semibold text-white">
            {star.displayName}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {star.constellation}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <DetailMetric label="Distance" value={formatDistance(star)} />
        <DetailMetric label="Magnitude" value={star.magnitude.toFixed(2)} />
        <DetailMetric label="Altitude" value={formatDegrees(star.altitude, 1)} />
        <DetailMetric label="Azimuth" value={formatDegrees(star.azimuth, 0)} />
        <DetailMetric label="Right ascension" value={formatRa(star.raHours)} />
        <DetailMetric
          label="Declination"
          value={formatSignedDegrees(star.decDeg)}
        />
        <DetailMetric label="Catalog ID" value={`HIP ${star.id}`} />
        <DetailMetric label="Color" swatch={star.color} value={star.color} />
      </div>
    </div>
  )
}

type DetailMetricProps = {
  label: string
  swatch?: string
  value: string
}

function DetailMetric({ label, swatch, value }: DetailMetricProps) {
  return (
    <div className="min-w-0 rounded-md border border-white/8 bg-black/18 px-2.5 py-2">
      <div className="text-[0.65rem] font-medium uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex min-h-5 items-center gap-2 text-sm font-medium text-white">
        {swatch ? (
          <span
            className="size-3 shrink-0 rounded-full border border-white/30"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        <span className="min-w-0 truncate">{value}</span>
      </div>
    </div>
  )
}

function formatDistance(star: HorizonStar): string {
  return star.distanceLy
    ? `${star.distanceLy.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      })} ly`
    : 'Not in catalog'
}

function formatRa(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const normalizedHours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60

  return `${normalizedHours.toString().padStart(2, '0')}h ${minutes
    .toString()
    .padStart(2, '0')}m`
}

function formatDegrees(value: number, fractionDigits: number): string {
  return `${value.toFixed(fractionDigits)} deg`
}

function formatSignedDegrees(value: number): string {
  const sign = value >= 0 ? '+' : ''

  return `${sign}${formatDegrees(value, 1)}`
}

function matchesWordPrefix(value: string, query: string): boolean {
  const normalizedName = normalizeSearchText(value)

  if (normalizedName.startsWith(query)) {
    return true
  }

  return normalizedName
    .split(/[\s-]+/)
    .some((word) => word.startsWith(query))
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ')
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return 0
  }

  return Math.min(Math.max(value, min), max)
}

function normalizeLongitude(value: number): number {
  if (Number.isNaN(value)) {
    return 0
  }

  const normalized = ((((value + 180) % 360) + 360) % 360) - 180

  return normalized === -180 ? 180 : normalized
}

export default App
