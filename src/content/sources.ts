import type { ScientificSource } from '../ai/schemas';

// Content only. Developer B owns the registry loader. Verified 2026-09-26 UTC.
export const curatedSources: readonly ScientificSource[] = [
  {
    "id": "nasa-south-pole",
    "title": "Moon’s South Pole is Full of Mystery, Science, Intrigue",
    "organization": "NASA",
    "url": "https://www.nasa.gov/humans-in-space/moons-south-pole-is-full-of-mystery-science-intrigue/",
    "tags": [
      "south-pole",
      "terrain"
    ],
    "shortContext": "Low-angle sunlight and shadowed terrain complicate south-pole exploration. This provides context for planning power and thermal support."
  },
  {
    "id": "nasa-illumination",
    "title": "Illumination at the Moon’s South Pole, 2023 to 2030",
    "organization": "NASA",
    "url": "https://svs.gsfc.nasa.gov/4930/",
    "tags": [
      "illumination",
      "power",
      "layout"
    ],
    "shortContext": "Terrain-based visualizations show changing sunlight and shadow near the pole. They motivate site-aware energy planning, not the game’s numerical power rules."
  },
  {
    "id": "nasa-thermal",
    "title": "The Lunar South Pole Region",
    "organization": "NASA",
    "url": "https://www.nasa.gov/reference/moonbase-environment/",
    "tags": [
      "temperature",
      "south-pole"
    ],
    "shortContext": "Local lighting and terrain shape a highly variable thermal environment. Indoor crop temperature in the game is a controlled condition, not the lunar surface temperature."
  },
  {
    "id": "nasa-controlled-agriculture",
    "title": "NASA Research Launches a New Generation of Indoor Farming",
    "organization": "NASA",
    "url": "https://www.nasa.gov/technology/tech-transfer-spinoffs/nasa-research-launches-a-new-generation-of-indoor-farming/",
    "tags": [
      "controlled-environment",
      "water",
      "lighting"
    ],
    "shortContext": "NASA’s closed-environment crop research contributed to indoor cultivation techniques. It frames the trade-offs between lighting, water delivery, and food production."
  },
  {
    "id": "nasa-biomass",
    "title": "NASA’s Biomass Production Chamber: a testbed for bioregenerative life support studies",
    "organization": "NASA",
    "url": "https://ntrs.nasa.gov/citations/20040089951",
    "tags": [
      "biomass",
      "lettuce",
      "potato",
      "wheat"
    ],
    "shortContext": "Ground-based closed-chamber tests studied crop growth and exchanges of gases and water, including lettuce, potato, and wheat. These experiments are context, not validation of the simulation’s yields or turn lengths."
  },
  {
    "id": "nasa-space-crops",
    "title": "Growing Plants in Space",
    "organization": "NASA",
    "url": "https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/",
    "tags": [
      "space-crops",
      "veggie",
      "plant-habitat"
    ],
    "shortContext": "Veggie and the Advanced Plant Habitat support plant research aboard the space station. Orbital growing experiments do not establish a complete lunar farm design."
  },
  {
    "id": "nasa-meteoroids",
    "title": "MEO: Environments",
    "organization": "NASA",
    "url": "https://www.nasa.gov/meteoroid-environment-office/environments/",
    "tags": [
      "meteoroids",
      "hazards",
      "resilience"
    ],
    "shortContext": "Natural particles can damage exposed spacecraft systems. NASA studies different meteoroid environments, including the lunar environment; game impacts are simplified events."
  },
  {
    "id": "nasa-lunanet",
    "title": "LunaNet",
    "organization": "NASA",
    "url": "https://www.nasa.gov/communicating-with-missions/lunanet/",
    "tags": [
      "communications",
      "navigation",
      "resilience"
    ],
    "shortContext": "LunaNet provides a framework for interoperable lunar communications and navigation services. It motivates the importance of connectivity; the Mission Control advisor is a fictional game experience."
  },
  {
    "id": "esa-melissa",
    "title": "Closed Loop Concept",
    "organization": "ESA",
    "url": "https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Melissa/Closed_Loop_Concept",
    "tags": [
      "melissa",
      "life-support",
      "recycling"
    ],
    "shortContext": "MELiSSA investigates recovering food, water, and oxygen through linked biological and physical processes. It illustrates life-support interdependence without validating the game’s livestock model."
  }
];
