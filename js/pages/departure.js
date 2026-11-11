(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};

  function hourLabel(hour) {
    return String(hour).padStart(2, "0") + ":00";
  }
  function riskKind(value) {
    return value >= 0.6 ? "danger" : value >= 0.3 ? "warning" : "success";
  }
  function render(root, params) {
    params = params || {};
    const corridor = FDT.data.getCorridor(FDT.state.corridorId);
    const segments = FDT.data.getSegments(corridor.id);
    const activeTrips = FDT.data.getTrips(corridor.id).filter(function (trip) { return !trip.completed; });
    const defaultSegment = segments.find(function (item) { return item.id === (params.segment || "").toUpperCase(); }) || segments.find(function (item) { return item.id === (corridor.id === "mumbai-bengaluru" ? "S12" : "C07"); }) || segments[0];
    const initialTrip = activeTrips.find(function (trip) { return trip.id === params.trip; });
    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">FLEET & PLANNING · <span class="simulated">Synthetic forecast</span></p><h1>Departure Planner</h1><p>Compare hourly departure conditions and choose a lower-risk window for this corridor.</p></div><div class="page-actions"><a class="button" href="#/risk-map">Corridor risk map</a></div></header>' +
      '<div class="departure-disclaimer" role="note"><strong>Planning estimate only</strong><span>Hourly risks and route delays are synthetic, local prototype data—not live traffic or an operational recommendation.</span></div>' +
      '<section class="card departure-controls"><div class="card__header"><div><h2>Plan a departure</h2><p>Select an active trip, vehicle and segment forecast.</p></div></div><div class="field-row"><div class="field"><label for="departure-trip">Active trip (optional)</label><select id="departure-trip"><option value="">Choose corridor defaults</option>' +
      activeTrips.map(function (trip) { return '<option value="' + FDT.escapeHtml(trip.id) + '"' + (initialTrip && initialTrip.id === trip.id ? " selected" : "") + '>' + FDT.escapeHtml(trip.id + " · " + trip.origin + " → " + trip.destination) + '</option>'; }).join("") +
      '</select></div><div class="field"><label for="departure-vehicle">Vehicle</label><select id="departure-vehicle">' +
      FDT.data.vehicles.map(function (vehicle) { return '<option value="' + FDT.escapeHtml(vehicle.id) + '"' + (initialTrip && initialTrip.vehicleId === vehicle.id || !initialTrip && vehicle.id === "truck-16" ? " selected" : "") + '>' + FDT.escapeHtml(vehicle.type) + '</option>'; }).join("") +
      '</select></div><div class="field"><label for="departure-segment">Forecast segment</label><select id="departure-segment">' +
      segments.map(function (segment) { return '<option value="' + FDT.escapeHtml(segment.id) + '"' + (segment.id === (initialTrip && FDT.data.segmentById[initialTrip.currentSegment] ? initialTrip.currentSegment : defaultSegment.id) ? " selected" : "") + '>' + FDT.escapeHtml(segment.id + " · " + segment.name) + '</option>'; }).join("") +
      '</select></div></div><div class="field-row"><div class="field"><label for="departure-deadline">Delivery deadline (hours from departure)</label><input id="departure-deadline" type="number" min="1" max="72" step="0.25" value="22.25" required><small class="field__hint">On-time chance uses this deadline and the route travel-time buffer.</small></div></div></section>' +
      '<section class="kpi-grid departure-kpis" aria-label="Recommended departure summary"><article class="kpi-card kpi-card--risk"><span class="kpi-card__label">Recommended window</span><strong class="kpi-card__value number" id="departure-recommendation">—</strong><span class="kpi-card__note" id="departure-recommendation-note"></span></article><article class="kpi-card"><span class="kpi-card__label">Estimated P50 delay</span><strong class="kpi-card__value number" id="departure-p50">—</strong><span class="kpi-card__note">Median delay for the default route</span></article><article class="kpi-card"><span class="kpi-card__label">Estimated on-time</span><strong class="kpi-card__value number" id="departure-on-time">—</strong><span class="kpi-card__note">Based on simulator route buffer</span></article><article class="kpi-card"><span class="kpi-card__label">Forecast segment risk</span><strong class="kpi-card__value number" id="departure-risk">—</strong><span class="kpi-card__note" id="departure-risk-note"></span></article></section>' +
      '<section class="card departure-chart-card"><div class="card__header"><div><h2>Expected delay by departure hour</h2><p>Default-route median from 100 seeded simulation runs per hour.</p></div><span class="simulated">Simulated</span></div><div id="departure-chart" class="departure-chart" role="group" aria-label="Expected delay by departure hour. Each bar opens a simulator for that hour."></div><div class="departure-chart-legend"><span><i class="legend-swatch legend-swatch--low"></i>Lower forecast risk</span><span><i class="legend-swatch legend-swatch--high"></i>Higher forecast risk</span></div></section>' +
      '<section class="card departure-table-card"><div class="card__header"><div><h2>Hourly comparison</h2><p>Risk, rainfall, delay estimate and on-time chance for the selected segment.</p></div><label class="field departure-time-filter"><span>Show</span><select id="departure-period"><option value="all">All hours</option><option value="morning">Morning · 06–11</option><option value="midday">Midday · 12–17</option><option value="evening">Evening · 18–23</option><option value="overnight">Overnight · 00–05</option></select></label></div><div class="table-wrap"><table class="data-table departure-table"><thead><tr><th scope="col">Departure</th><th scope="col">Segment risk</th><th scope="col">Rain</th><th scope="col">P50 delay</th><th scope="col">P90 delay</th><th scope="col">On-time</th><th scope="col">Action</th></tr></thead><tbody id="departure-rows"></tbody></table></div></section>';

    const tripSelect = FDT.$("#departure-trip", root);
    const vehicleSelect = FDT.$("#departure-vehicle", root);
    const segmentSelect = FDT.$("#departure-segment", root);
    const periodSelect = FDT.$("#departure-period", root);
    const deadlineField = FDT.$("#departure-deadline", root);

    function calculate() {
      if (!deadlineField.checkValidity()) {
        deadlineField.reportValidity();
        return;
      }
      const segment = FDT.data.segmentById[segmentSelect.value];
      const vehicle = FDT.data.getVehicle(vehicleSelect.value);
      const trip = activeTrips.find(function (item) { return item.id === tripSelect.value; });
      const deadlineHours = Number(deadlineField.value);
      if (!segment || segment.corridorId !== corridor.id) {
        throw new Error("Departure planner segment is not in the selected corridor.");
      }

      const hours = Array.from({ length: 24 }, function (_, hour) {
        const result = FDT.simulator.simulate({
          corridorId: corridor.id,
          segmentId: segment.id,
          vehicleId: vehicle.id,
          tripId: trip ? trip.id : "",
          departureHour: hour,
          deadlineHours: deadlineHours,
          runs: 100,
          compareAlternate: false,
          scenario: "current"
        });
        const route = result.routes[0];
        return {
          hour: hour,
          risk: segment.risk[hour],
          rain: segment.rainMmHr[hour],
          p50: route.p50,
          p90: route.p90,
          onTime: route.onTime
        };
      });
      const recommendation = hours.reduce(function (best, item) {
        return item.p50 < best.p50 || (item.p50 === best.p50 && item.onTime > best.onTime) ? item : best;
      }, hours[0]);
      FDT.$("#departure-recommendation", root).textContent = hourLabel(recommendation.hour);
      FDT.$("#departure-recommendation-note", root).textContent = segment.id + " · lowest estimated median delay";
      FDT.$("#departure-p50", root).textContent = Math.round(recommendation.p50) + " min";
      FDT.$("#departure-on-time", root).textContent = recommendation.onTime + "%";
      FDT.$("#departure-risk", root).textContent = recommendation.risk.toFixed(2);
      FDT.$("#departure-risk-note", root).textContent = segment.id + " at " + hourLabel(recommendation.hour);

      const maximum = Math.max.apply(null, hours.map(function (item) { return item.p50; })) || 1;
      FDT.$("#departure-chart", root).innerHTML = '<div class="departure-bars">' + hours.map(function (item) {
        const height = Math.max(4, item.p50 / maximum * 100);
        const isRecommended = item.hour === recommendation.hour;
        return '<a class="departure-bar' + (item.risk >= 0.6 ? ' departure-bar--high' : '') + (isRecommended ? ' departure-bar--recommended' : '') + '" href="#/simulator?segment=' + encodeURIComponent(segment.id) + '&departureHour=' + item.hour + '&deadlineHours=' + encodeURIComponent(String(deadlineHours)) + (trip ? '&trip=' + encodeURIComponent(trip.id) : '') + '" aria-label="' + hourLabel(item.hour) + ': P50 delay ' + Math.round(item.p50) + ' minutes, risk ' + item.risk.toFixed(2) + '" title="' + hourLabel(item.hour) + ' · P50 ' + Math.round(item.p50) + ' min · risk ' + item.risk.toFixed(2) + '"><span class="departure-bar__value">' + Math.round(item.p50) + '</span><span class="departure-bar__fill" style="height:' + height + '%"></span><span class="departure-bar__label">' + String(item.hour).padStart(2, "0") + '</span></a>';
      }).join("") + '</div>';

      const period = periodSelect.value;
      function inPeriod(hour) {
        if (period === "morning") return hour >= 6 && hour <= 11;
        if (period === "midday") return hour >= 12 && hour <= 17;
        if (period === "evening") return hour >= 18 && hour <= 23;
        if (period === "overnight") return hour <= 5;
        return true;
      }
      const tbody = FDT.$("#departure-rows", root);
      tbody.replaceChildren();
      hours.filter(function (item) { return inPeriod(item.hour); }).forEach(function (item) {
        const row = document.createElement("tr");
        const values = [
          hourLabel(item.hour),
          null,
          FDT.format.mmHr(item.rain),
          FDT.format.min(item.p50),
          FDT.format.min(item.p90),
          item.onTime + "%",
          null
        ];
        values.forEach(function (value, index) {
          const cell = document.createElement("td");
          cell.setAttribute("data-label", ["Departure", "Segment risk", "Rain", "P50 delay", "P90 delay", "On-time", "Action"][index]);
          if (index === 1) {
            const badge = FDT.ui.badge(item.risk.toFixed(2), riskKind(item.risk));
            cell.append(badge);
          } else if (index === 6) {
            const anchor = document.createElement("a");
            anchor.className = "button button--subtle";
            anchor.href = "#/simulator?segment=" + encodeURIComponent(segment.id) + "&departureHour=" + item.hour + "&deadlineHours=" + encodeURIComponent(String(deadlineHours)) + (trip ? "&trip=" + encodeURIComponent(trip.id) : "");
            anchor.textContent = "Simulate";
            cell.append(anchor);
          } else cell.textContent = value;
          row.append(cell);
        });
        tbody.append(row);
      });
    }

    tripSelect.addEventListener("change", function () {
      const trip = activeTrips.find(function (item) { return item.id === tripSelect.value; });
      if (!trip) {
        vehicleSelect.value = "truck-16";
        return calculate();
      }
      vehicleSelect.value = trip.vehicleId;
      if (FDT.data.segmentById[trip.currentSegment] && FDT.data.segmentById[trip.currentSegment].corridorId === corridor.id) segmentSelect.value = trip.currentSegment;
      calculate();
    });
    vehicleSelect.addEventListener("change", calculate);
    segmentSelect.addEventListener("change", calculate);
    periodSelect.addEventListener("change", calculate);
    deadlineField.addEventListener("change", calculate);
    calculate();
  }

  FDT.pages.departure = {
    title: "Departure Planner",
    render: render,
    destroy: function () {}
  };
}());
