# GenAI Digital Twin for Freight Disruption Prediction & Mitigation

Forecasting highway disruption in India for every vehicle on the road: trucks, buses, cars/taxis and vans.

This repository contains a clickable, browser-only prototype. It is designed to work from a local `file://` URL and on GitHub Pages without a build step.

## Screenshots

_Add prototype screenshots here._

## Live demo

Live demo: `https://<user>.github.io/<repo>/`

## Run locally

Open `index.html` directly in a modern browser. No server, dependency installation, password, or API key is needed.

## Scenario simulation

The Scenario Simulator runs deterministic Monte Carlo comparisons in the browser, with 100–5,000 runs, optional alternate-route comparisons, and current-forecast, heavy-rain, closure, and congestion scenarios. Results include route delay percentiles and an on-time estimate based on each route's travel-time buffer. Simulations and saved scenarios are stored in this browser's local storage.

## Assistant demo

The GenAI Assistant screen is a local, template-based demonstration grounded in the prototype's synthetic segment, trip, route, departure, and model facts. It does not connect to an AI service or provide live operational guidance; each answer links to its source screen.

## Fleet and trip records

Vehicles & Trips filters the selected corridor's synthetic fleet by vehicle type and trip status, with searchable, sortable trip records. Trip details show the assigned vehicle, current segment forecast, seeded timeline, and any reroute action stored in this browser.

## Departure planning

The Departure Planner compares 24 departure hours for a selected corridor segment and vehicle using the local seeded simulator. Its recommended window is the lowest estimated median delay in that comparison; results are synthetic planning estimates, not live traffic guidance. Hourly results link to the simulator with the selected departure time prefilled.

## Risk hotspots

Risk Hotspots summarizes illustrative 90-day disruption counts and average delays by corridor segment, alongside the separate synthetic hourly forecast. Select a segment to inspect its risk curve; search or filter the history table by cause and open segment details for more context.

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. In repository settings, open **Pages** and select the branch and folder containing `index.html`.
3. Open the published URL. All app assets use relative paths, so the prototype works below a repository sub-path.

## Folder map

```text
index.html
css/       Design tokens, base styles, layout, components, and page styles
js/        Browser-only app and router
           data.js holds synthetic data; charts.js and map.js draw SVG visuals;
           simulator.js runs deterministic Monte Carlo scenarios; ui.js provides
           reusable dialogs, tables, tabs, and notifications; pages/ contains
           one module per screen
```

Prototype with synthetic data – no backend, no API keys.
