(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  let progressHandle = null;
  let animationInterval = null;
  let navigationTimeout = null;

  const scenarioLabels = {
    current: "Current forecast",
    "heavy-rain": "Heavy rain",
    closure: "Road closure",
    congestion: "Congestion"
  };
  function localDateTime(hour) {
    const now = new Date();
    now.setHours(hour, 0, 0, 0);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function populateSelect(select, values, selected) {
    select.replaceChildren();
    values.forEach(function (value) {
      const option = document.createElement("option");
      if (value && typeof value === "object") {
        option.value = value.value === undefined ? "" : value.value;
        option.textContent = value.label || String(option.value);
      } else {
        option.value = value;
        option.textContent = value;
      }
      select.append(option);
    });
    if (selected) select.value = selected;
  }
  function showScenarioInputs(root, scenario) {
    root.querySelectorAll("[data-scenario-input]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-scenario-input") !== scenario;
    });
  }
  function announceProgress() {
    const steps = ["Loading twin state", "Applying scenario", "Running Monte Carlo trips", "Writing explanation"];
    const content = document.createElement("div");
    content.className = "simulation-progress";
    content.innerHTML = '<p>Comparing routes with a seeded Monte Carlo run. This takes about 1.7 seconds.</p><ol class="progress-steps" aria-label="Simulation progress"></ol><div class="progress-track"><span></span></div><p class="muted small">All results are simulated in this browser.</p>';
    const list = content.querySelector("ol");
    steps.forEach(function (label, index) {
      const item = document.createElement("li");
      item.dataset.progressStep = String(index);
      item.innerHTML = '<span class="progress-step-icon" aria-hidden="true">' + (index + 1) + '</span><span>' + label + '</span>';
      list.append(item);
    });
    progressHandle = FDT.ui.modal({ title: "Running scenario simulation", content: content, closeOnBackdrop: false });
    let index = 0;
    let completed = false;
    let cancelled = false;
    function update() {
      if (!progressHandle) return;
      list.querySelectorAll("li").forEach(function (item, itemIndex) {
        item.classList.toggle("is-complete", itemIndex < index);
        item.classList.toggle("is-active", itemIndex === index);
      });
      content.querySelector(".progress-track span").style.width = Math.min(100, index / steps.length * 100) + "%";
      if (index >= steps.length) {
        window.clearInterval(animationInterval);
        animationInterval = null;
        completed = true;
        const handle = progressHandle;
        progressHandle = null;
        handle.close();
        return;
      }
      index += 1;
    }
    update();
    animationInterval = window.setInterval(update, 425);
    progressHandle.onClose(function () {
      if (!completed && progressHandle) {
        cancelled = true;
        progressHandle = null;
        window.clearInterval(animationInterval);
        animationInterval = null;
      }
    });
    return function () { return cancelled; };
  }
  function render(root, params) {
    params = params || {};
    const corridor = FDT.data.getCorridor(FDT.state.corridorId);
    const trips = FDT.data.getTrips(corridor.id).filter(function (trip) { return !trip.completed; });
    const linkedTrip = FDT.data.trips.find(function (trip) { return trip.id === params.trip; });
    const segmentId = (params.segment || "S12").toUpperCase();
    const segment = FDT.data.segmentById[segmentId] || FDT.data.getSegments(corridor.id)[0];
    const vehicleId = linkedTrip ? linkedTrip.vehicleId : "truck-16";
    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">TEST MODULE · <span class="simulated">Browser simulation</span></p><h1>Scenario Simulator</h1><p>Change a route or road condition and compare likely trip delays.</p></div><div class="page-actions"><a class="button" href="#/library">Scenario Library</a></div></header>' +
      '<form id="simulation-form" class="simulator-form" novalidate><div class="simulator-main">' +
      '<section class="card simulator-card"><div class="card__header"><div><span class="step-number">1</span><h2>Trip</h2><p>Choose the trip and vehicle to simulate.</p></div></div><div class="field-row"><div class="field"><label for="trip-origin">Origin</label><select id="trip-origin" required></select></div><div class="field"><label for="trip-destination">Destination</label><select id="trip-destination" required></select></div></div><div class="field-row"><div class="field"><label for="trip-departure">Departure</label><input id="trip-departure" type="datetime-local" required></div><div class="field"><label for="trip-deadline">Delivery deadline (hours from departure)</label><input id="trip-deadline" type="number" min="1" max="72" step="0.25" value="22.25" required><small class="field__hint">Default leaves about 66 minutes of delay buffer for a 973 km truck trip.</small></div></div><div class="field-row"><div class="field"><label for="trip-vehicle">Vehicle</label><select id="trip-vehicle" required></select></div><div class="field"><label for="linked-trip">Link to active trip (optional)</label><select id="linked-trip"></select></div></div></section>' +
      '<section class="card simulator-card"><div class="card__header"><div><span class="step-number">2</span><h2>Scenario</h2><p>Choose a road condition to test.</p></div></div><div class="scenario-choice-row" role="group" aria-label="Scenario type">' +
      Object.keys(scenarioLabels).map(function (value, index) { return '<button type="button" class="filter-chip" data-scenario="' + value + '" aria-pressed="' + String(index === 0) + '">' + scenarioLabels[value] + '</button>'; }).join("") +
      '</div><div class="field"><label for="affected-segment">Affected segment</label><select id="affected-segment" required></select><small class="field__hint">Choose a segment to apply forecast or road-condition changes.</small></div>' +
      '<div data-scenario-input="current"><p class="scenario-helper">Use the current segment forecast as the baseline. <span class="simulated">Synthetic forecast</span></p></div>' +
      '<div data-scenario-input="heavy-rain" hidden><div class="field"><label for="rain-amount">Rainfall: <output id="rain-output">80 mm/hr</output></label><input id="rain-amount" type="range" min="0" max="120" value="80" step="1"><small class="field__hint">The flood threshold on the selected segment is <span data-flood-threshold>50</span> mm/hr.</small></div></div>' +
      '<div data-scenario-input="closure" hidden><div class="field"><label for="closure-hours">Road closure length (hours)</label><input id="closure-hours" type="number" min="1" max="24" value="2"><small class="field__hint">A closure adds the closure time to the delay estimate.</small></div></div>' +
      '<div data-scenario-input="congestion" hidden><div class="field"><label for="speed-drop">Speed reduction: <output id="speed-output">30%</output></label><input id="speed-drop" type="range" min="0" max="80" value="30" step="5"></div></div></section>' +
      '<section class="card simulator-card"><div class="card__header"><div><span class="step-number">3</span><h2>Simulation settings</h2><p>More runs = tighter P90 bounds, slower.</p></div></div><div class="field"><label for="simulation-runs">Monte Carlo runs</label><select id="simulation-runs"><option value="100">100 runs</option><option value="500">500 runs</option><option value="1000" selected>1,000 runs</option><option value="5000">5,000 runs</option></select></div><label class="check-option"><input id="compare-alternate" type="checkbox" checked><span><strong>Compare alternate routes</strong><small>Include the NH48A option when available.</small></span></label><label class="check-option"><input id="generate-explanation" type="checkbox" checked><span><strong>Generate GenAI explanation</strong><small>A scripted explanation can be added to the results.</small></span></label><div class="what-you-get"><strong>What you’ll get</strong><ul><li>Expected delay (P50) and worst likely delay (P90)</li><li>Chance of arriving on time</li><li>Route risk and a delay spread chart</li></ul></div><div class="simulator-actions"><button type="button" class="button" id="reset-simulation">Reset form</button><button type="button" class="button" id="load-library">Load from library</button><button type="submit" class="button button--primary">Run simulation <span aria-hidden="true">→</span></button></div></section></div>' +
      '<aside class="card simulator-side-note"><h2>How to read results</h2><p><strong>P50</strong> is the middle simulated delay. Half of simulated trips had less delay and half had more.</p><p><strong>P90</strong> is the “worst likely” delay: 9 out of 10 simulated trips finished within this time.</p><p class="muted">Synthetic prototype · no road services, external APIs, or live vehicle data are called.</p></aside></form>';

    const origin = root.querySelector("#trip-origin");
    const destination = root.querySelector("#trip-destination");
    const vehicle = root.querySelector("#trip-vehicle");
    const linked = root.querySelector("#linked-trip");
    const affectedSegment = root.querySelector("#affected-segment");
    const cityOptions = corridor.id === "mumbai-bengaluru"
      ? ["Mumbai", "Panvel", "Pune", "Satara", "Karad", "Kolhapur", "Belagavi", "Hubballi", "Bengaluru"]
      : ["Chennai", "Poonamallee", "Vellore", "Krishnagiri", "Hosur", "Bengaluru"];
    populateSelect(origin, cityOptions, linkedTrip && cityOptions.includes(linkedTrip.origin) ? linkedTrip.origin : corridor.origin);
    populateSelect(destination, cityOptions, linkedTrip && cityOptions.includes(linkedTrip.destination) ? linkedTrip.destination : corridor.destination);
    populateSelect(vehicle, FDT.data.vehicles.map(function (item) { return { value: item.id, label: item.type }; }), vehicleId);
    populateSelect(linked, [{ value: "", label: "No linked trip" }].concat(trips.map(function (trip) { return { value: trip.id, label: trip.id + " · " + trip.plate }; })), linkedTrip ? linkedTrip.id : "");
    populateSelect(affectedSegment, FDT.data.getSegments(corridor.id).map(function (item) { return { value: item.id, label: item.id + " · " + item.name }; }), segment.corridorId === corridor.id ? segment.id : FDT.data.getSegments(corridor.id)[0].id);
    const requestedHour = Number(params.departureHour);
    const initialHour = Number.isInteger(requestedHour) && requestedHour >= 0 && requestedHour <= 23 ? requestedHour : 10;
    root.querySelector("#trip-departure").value = localDateTime(initialHour);
    const requestedDeadline = Number(params.deadlineHours);
    if (Number.isFinite(requestedDeadline) && requestedDeadline >= 1 && requestedDeadline <= 72) {
      root.querySelector("#trip-deadline").value = String(requestedDeadline);
    }
    root.querySelector("[data-flood-threshold]").textContent = segment.floodThresholdMmHr;

    root.querySelectorAll("[data-scenario]").forEach(function (button) {
      button.addEventListener("click", function () {
        root.querySelectorAll("[data-scenario]").forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
        showScenarioInputs(root, button.getAttribute("data-scenario"));
      });
    });
    if (params.scenario && scenarioLabels[params.scenario]) {
      const initialScenario = root.querySelector('[data-scenario="' + params.scenario + '"]');
      if (initialScenario) initialScenario.click();
    }
    root.querySelector("#rain-amount").addEventListener("input", function (event) { root.querySelector("#rain-output").textContent = event.target.value + " mm/hr"; });
    root.querySelector("#speed-drop").addEventListener("input", function (event) { root.querySelector("#speed-output").textContent = event.target.value + "%"; });
    affectedSegment.addEventListener("change", function () {
      const selectedSegment = FDT.data.segmentById[affectedSegment.value];
      root.querySelector("[data-flood-threshold]").textContent = selectedSegment.floodThresholdMmHr;
    });
    linked.addEventListener("change", function () {
      const trip = FDT.data.trips.find(function (item) { return item.id === linked.value; });
      if (!trip) return;
      if (cityOptions.includes(trip.origin)) origin.value = trip.origin;
      if (cityOptions.includes(trip.destination)) destination.value = trip.destination;
      vehicle.value = trip.vehicleId;
      if (FDT.data.segmentById[trip.currentSegment] && FDT.data.segmentById[trip.currentSegment].corridorId === corridor.id) affectedSegment.value = trip.currentSegment;
    });
    root.querySelector("#reset-simulation").addEventListener("click", function () {
      root.querySelector("#simulation-form").reset();
      root.querySelectorAll("[data-scenario]").forEach(function (item) { item.setAttribute("aria-pressed", String(item.dataset.scenario === "current")); });
      showScenarioInputs(root, "current");
      root.querySelector("#rain-output").textContent = root.querySelector("#rain-amount").value + " mm/hr";
      root.querySelector("#speed-output").textContent = root.querySelector("#speed-drop").value + "%";
    });
    root.querySelector("#load-library").addEventListener("click", function () {
      const entries = FDT.data.scenarios.filter(function (item) { return !FDT.state.deletedScenarioIds.includes(item.id); })
        .concat(FDT.state.scenarioSaves);
      if (!entries.length) {
        FDT.toast("There are no saved scenarios to load.");
        return;
      }
      const content = document.createElement("div");
      content.className = "scenario-library-picker";
      const picker = FDT.ui.modal({ title: "Load a saved scenario", content: content });
      entries.forEach(function (entry) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "scenario-picker-option";
        button.textContent = entry.id + " · " + (scenarioLabels[entry.scenario] || entry.type || "Current forecast") + " · " + FDT.data.getCorridor(entry.corridorId).name;
        button.addEventListener("click", function () {
          if (entry.vehicleId) vehicle.value = entry.vehicleId;
          if (entry.tripId) linked.value = entry.tripId;
          const scenarioValue = Object.keys(scenarioLabels).find(function (key) { return scenarioLabels[key] === entry.scenario; }) || entry.scenario || "current";
          root.querySelector('[data-scenario="' + scenarioValue + '"]').click();
          picker.close();
          FDT.toast("Scenario " + entry.id + " loaded into the form.");
        });
        content.append(button);
      });
    });

    const form = root.querySelector("#simulation-form");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const selectedScenario = root.querySelector("[data-scenario][aria-pressed=\"true\"]").dataset.scenario;
      const selectedSegment = FDT.data.segmentById[affectedSegment.value];
      const departure = new Date(root.querySelector("#trip-departure").value);
      const inputs = {
        corridorId: corridor.id,
        segmentId: selectedSegment.id,
        tripId: linked.value,
        vehicleId: vehicle.value,
        departureHour: departure.getHours(),
        deadlineHours: Number(root.querySelector("#trip-deadline").value),
        scenario: selectedScenario,
        rainMmHr: selectedScenario === "heavy-rain" ? Number(root.querySelector("#rain-amount").value) : selectedSegment.rainMmHr[10],
        closureHours: selectedScenario === "closure" ? Number(root.querySelector("#closure-hours").value) : 0,
        speedDropPercent: selectedScenario === "congestion" ? Number(root.querySelector("#speed-drop").value) : 0,
        runs: Number(root.querySelector("#simulation-runs").value),
        compareAlternate: root.querySelector("#compare-alternate").checked,
        generateExplanation: root.querySelector("#generate-explanation").checked,
        linkedTrip: linked.value ? (function () {
          const trip = FDT.data.trips.find(function (item) { return item.id === linked.value; });
          return trip ? { id: trip.id, plate: trip.plate, driver: trip.driver, origin: trip.origin, destination: trip.destination } : null;
        }()) : null
      };
      if (!form.reportValidity()) return;
      const result = FDT.simulator.simulate(inputs);
      result.tripOrigin = origin.value;
      result.tripDestination = destination.value;
      FDT.store.update(function (state) {
        state.simulations = state.simulations.filter(function (item) { return item.simId !== result.simId; }).concat(result);
      });
      const isCancelled = announceProgress();
      const finish = function () {
        if (progressHandle || isCancelled() || !FDT.state.simulations.some(function (item) { return item.simId === result.simId; })) return;
        window.clearTimeout(navigationTimeout);
        navigationTimeout = null;
        FDT.router.navigate("/results/" + encodeURIComponent(result.simId));
      };
      navigationTimeout = window.setTimeout(finish, 1800);
    });
  }

  FDT.pages.simulator = {
    title: "Scenario Simulator",
    render: render,
    destroy: function () {
      window.clearInterval(animationInterval);
      window.clearTimeout(navigationTimeout);
      animationInterval = null;
      navigationTimeout = null;
      if (progressHandle) {
        const handle = progressHandle;
        progressHandle = null;
        handle.close();
      }
    }
  };
}());
