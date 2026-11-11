(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};

  function number(value, digits) {
    return Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits === undefined ? 0 : digits, minimumFractionDigits: digits || 0 });
  }
  function routeCard(route, index, recommended) {
    const card = document.createElement("article");
    card.className = "card route-result-card" + (recommended ? " route-result-card--recommended" : "");
    card.innerHTML =
      '<div class="route-result-card__header"><div><p class="small muted">ROUTE ' + String.fromCharCode(65 + index) + '</p><h2>' + FDT.escapeHtml(route.name) + '</h2></div>' +
      (recommended ? '<span class="pill pill--success">Recommended</span>' : "") + '</div>' +
      '<div class="route-result-primary"><div><span>Expected delay <small>P50 · middle</small></span><strong class="number">' + number(route.p50) + ' <small>min</small></strong></div>' +
      '<div><span>Chance of arriving on time</span><strong class="number">' + route.onTime + '%</strong></div></div>' +
      '<dl class="route-result-stats"><div><dt>Distance</dt><dd class="number">' + number(route.km) + ' km</dd></div>' +
      '<div><dt>Delay P90 <small>worst likely</small></dt><dd class="number">' + number(route.p90) + ' min</dd></div>' +
      '<div><dt>Highest segment risk</dt><dd><span class="number">' + Number(route.maxRisk).toFixed(2) + '</span> <span class="pill pill--' + (route.maxRisk >= 0.6 ? "high" : route.maxRisk >= 0.3 ? "moderate" : "low") + '">' + (route.maxRisk >= 0.6 ? "High" : route.maxRisk >= 0.3 ? "Moderate" : "Low") + '</span></dd></div>' +
      '<div><dt>On-time buffer used</dt><dd class="number">' + number(route.onTimeBufferMin) + ' min</dd></div></dl>';
    return card;
  }
  function summaryText(result) {
    if (result.routes.length < 2) {
      return "The selected route has an expected delay of " + number(result.routes[0].p50) + " minutes (P50) and a " + result.routes[0].onTime + "% chance of arriving on time.";
    }
    const recommended = result.routes[result.recommended];
    const other = result.routes[result.recommended === 0 ? 1 : 0];
    const saved = Math.round(Math.abs(other.p50 - recommended.p50));
    const extraKm = Math.abs(other.km - recommended.km);
    return recommended.name + " is recommended — adds " + number(extraKm) + " km but saves about " + number(saved) +
      " min (P50) and changes the on-time chance from " + other.onTime + "% to " + recommended.onTime + "%.";
  }
  function render(root, params) {
    const result = FDT.state.simulations.find(function (item) { return item.simId === params.simId; });
    if (!result) {
      root.innerHTML = '<section class="card empty-state"><h1>Simulation results are not available</h1><p>Run a new simulation to create results. Results are saved in this browser.</p><a class="button button--primary" href="#/simulator">Open simulator</a></section>';
      return;
    }
    const trip = result.linkedTrip || null;
    const selected = result.routes[result.recommended];
    const saveExists = FDT.state.scenarioSaves.some(function (item) { return item.sourceSimId === result.simId; });
    root.innerHTML =
      '<header class="page-heading"><div><a class="back-link" href="#/simulator">← Edit scenario</a><p class="small muted">SIMULATED RESULT · ' + FDT.escapeHtml(result.simId) + ' · ' + FDT.escapeHtml(result.runs.toLocaleString("en-IN")) + ' runs in ' + Number(result.durationSeconds).toFixed(1) + ' s</p><h1>Results · ' + FDT.escapeHtml(result.corridorName) + '</h1><p>' + FDT.escapeHtml(({ current: "Current forecast", "heavy-rain": "Heavy rain", closure: "Road closure", congestion: "Congestion" })[result.scenario]) + ' · ' + FDT.escapeHtml(FDT.data.getVehicle(result.vehicleId).type) + ' · ' + FDT.escapeHtml(result.segmentId) + '</p></div><div class="page-actions"><button type="button" class="button" id="copy-summary">Copy summary</button><button type="button" class="button button--primary" id="save-scenario"' + (saveExists ? " disabled" : "") + '>' + (saveExists ? "Saved to library" : "Save to library") + '</button></div></header>' +
      '<section class="recommendation-banner"><span class="recommendation-banner__icon" aria-hidden="true">✓</span><p>' + FDT.escapeHtml(summaryText(result)) + '</p></section>' +
      '<section class="route-result-grid" aria-label="Route comparison"></section>' +
      '<section class="card results-histogram-card"><div class="card__header"><div><h2>Delay spread across ' + FDT.escapeHtml(result.runs.toLocaleString("en-IN")) + ' runs</h2><p>Each bar shows simulated run counts in a delay range. Hover or focus a bar for details.</p></div><span class="simulated">Monte Carlo</span></div><div id="results-histogram"></div><div class="histogram-legend"></div></section>' +
      '<section class="card next-step-card"><div class="card__header"><div><h2>Next step</h2><p>' + (trip ? 'Linked trip ' + FDT.escapeHtml(trip.id) + ' · ' + FDT.escapeHtml(trip.plate) + ' · driver ' + FDT.escapeHtml(trip.driver) : "You can apply the selected route to a linked trip or keep exploring.") + '</p></div></div><div class="page-actions">' +
      (trip ? '<button type="button" class="button button--primary" id="apply-reroute">Apply reroute to ' + FDT.escapeHtml(trip.id) + '</button>' : '<a class="button button--primary" href="#/simulator">Link a trip and simulate again</a>') +
      '<a class="button" href="#/assistant?q=' + encodeURIComponent("Should " + (trip ? trip.id : "this trip") + " take the reroute?") + '">Explain with assistant</a><a class="button" href="#/simulator">Change scenario & re-run</a></div></section>' +
      '<p class="results-footnote">Chance of arriving on time is calculated from the simulated delay samples and the deadline buffer shown on each route card. Synthetic results are not live traffic predictions.</p>';

    const routeGrid = root.querySelector(".route-result-grid");
    result.routes.forEach(function (route, index) {
      routeGrid.append(routeCard(route, index, index === result.recommended));
    });
    root.querySelector("#results-histogram").append(FDT.charts.histogram({
      label: "Delay distribution for each simulated route",
      series: result.histogramBins.bins,
      maxMinutes: result.histogramBins.maxMinutes
    }));
    const legend = root.querySelector(".histogram-legend");
    result.histogramBins.bins.forEach(function (series) {
      const item = document.createElement("span");
      item.innerHTML = '<i style="background:' + series.color + '"></i>' + FDT.escapeHtml(series.name);
      legend.append(item);
    });
    root.querySelector("#copy-summary").addEventListener("click", async function () {
      const text = summaryText(result);
      try {
        await navigator.clipboard.writeText(text);
        FDT.toast("Simulation summary copied.");
      } catch (error) {
        const field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.className = "clipboard-fallback";
        document.body.append(field);
        field.select();
        let copied = false;
        try { copied = document.execCommand("copy"); } catch (copyError) { copied = false; }
        field.remove();
        if (copied) FDT.toast("Simulation summary copied.");
        else FDT.toast("Copy is unavailable in this browser. You can select the summary text to copy it.");
      }
    });
    root.querySelector("#save-scenario").addEventListener("click", function (event) {
      const button = event.currentTarget;
      if (FDT.state.scenarioSaves.some(function (item) { return item.sourceSimId === result.simId; })) return;
      FDT.store.update(function (state) {
        state.scenarioSaves.push({
          id: result.simId,
          sourceSimId: result.simId,
          corridorId: result.corridorId,
          scenario: result.scenario,
          vehicleId: result.vehicleId,
          date: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.createdAt)),
          summary: summaryText(result),
          tripId: result.tripId,
          result: result
        });
      });
      button.textContent = "Saved to library";
      button.disabled = true;
      FDT.toast(result.simId + " saved to Scenario Library.");
    });
    const applyButton = root.querySelector("#apply-reroute");
    if (applyButton) {
      applyButton.addEventListener("click", async function () {
        const confirmed = await FDT.ui.confirm("Apply " + selected.name + " to " + trip.id + "? The trip status and linked alert will be updated in this prototype.", {
          title: "Confirm reroute",
          confirmText: "Apply reroute"
        });
        if (!confirmed) return;
        const timestamp = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()) + " IST";
        FDT.store.update(function (state) {
          if (!state.reroutedTrips.includes(trip.id)) state.reroutedTrips.push(trip.id);
          if (!state.closedAlerts.includes("ALT-1001")) state.closedAlerts.push("ALT-1001");
          const entry = { time: timestamp, title: "Reroute applied", detail: "Trip assigned to " + selected.name + ". Driver notification simulated." };
          state.tripEvents[trip.id] = (state.tripEvents[trip.id] || []).concat(entry);
          state.auditLog.push({ time: timestamp, action: "reroute-applied", tripId: trip.id, route: selected.name, simId: result.simId });
        });
        FDT.toast("Reroute applied to " + trip.id + ". Driver " + trip.driver + " notified (simulated). Trip status: Rerouted.");
        window.setTimeout(function () { FDT.router.navigate("/trip/" + encodeURIComponent(trip.id)); }, 350);
      });
    }
    const note = FDT.ui.designNote(1, "Compare delay distributions and uncertainty before applying a reroute.");
    if (note) root.append(note);
  }

  FDT.pages.results = {
    title: "Simulation results",
    render: render,
    destroy: function () {}
  };
}());
