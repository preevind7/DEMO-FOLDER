(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  let playbackTimer = null;
  let refreshTimer = null;
  let currentHour = 13;
  let sortMode = "route";
  let zoom = 1;

  function riskKind(risk) {
    return risk >= 0.6 ? "high" : risk >= 0.3 ? "moderate" : "low";
  }
  function render(root) {
    const corridor = FDT.data.getCorridor(FDT.state.corridorId);
    const segments = FDT.data.getSegments(corridor.id);
    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">PREDICT MODULE · <span class="simulated">Synthetic forecast</span></p><h1>Corridor Risk Map</h1><p>Risk of disruption for each segment and hour · ' + FDT.escapeHtml(corridor.name) + '</p></div><div class="page-actions"><button type="button" class="button button--primary" data-action="refresh-forecast">Refresh forecast <span class="simulated">Simulated</span></button></div></header>' +
      '<section class="card map-time-card"><div class="map-time-controls"><button type="button" class="button" id="play-hours" aria-pressed="false"><span aria-hidden="true">▶</span> Play 24 h</button><div class="time-slider-group"><label for="forecast-hour">Showing <strong id="hour-offset">+3 h</strong> · <strong id="hour-label">13:00</strong></label><input id="forecast-hour" type="range" min="0" max="23" value="13" step="1" aria-label="Forecast hour"></div><span class="pill pill--neutral">Time shown: IST</span></div></section>' +
      '<div class="risk-map-layout"><section class="card map-card"><div class="card__header"><div><h2>Digital twin view</h2><p>Approximate corridor geography · select a route segment or vehicle</p></div><div class="map-zoom-controls"><button class="button button--icon" type="button" data-zoom="out" aria-label="Zoom out">−</button><button class="button button--icon" type="button" data-zoom="in" aria-label="Zoom in">+</button><button class="button" type="button" data-zoom="reset">Reset</button></div></div><div id="corridor-map"></div><div class="risk-legend"><span><i class="legend-swatch legend-swatch--low"></i>Low</span><span><i class="legend-swatch legend-swatch--moderate"></i>Moderate</span><span><i class="legend-swatch legend-swatch--high"></i>High</span><span><i class="legend-swatch legend-swatch--alternate"></i>NH48A alternate</span><span><i class="legend-swatch legend-swatch--vehicle"></i>Active vehicle</span></div></section>' +
      '<section class="card segment-table-card"><div class="card__header"><div><h2>Segments</h2><p><span id="segment-count">' + segments.length + '</span> segments · forecast at <span data-table-hour>13:00</span></p></div><div class="segmented-control" role="group" aria-label="Segment sort order"><button type="button" data-sort="route" aria-pressed="true">Route order</button><button type="button" data-sort="risk" aria-pressed="false">Highest risk</button></div></div><div class="table-wrap"><table class="data-table segment-risk-table"><thead><tr><th scope="col">Segment</th><th scope="col">KM</th><th scope="col">Risk</th><th scope="col">Rain</th><th scope="col">Open</th></tr></thead><tbody id="segment-table-body"></tbody></table></div></section></div>' +
      '<aside class="design-note-placeholder"></aside>';

    const hourSlider = root.querySelector("#forecast-hour");
    const mapHost = root.querySelector("#corridor-map");
    const tableBody = root.querySelector("#segment-table-body");
    function formatHour(hour) { return String(hour).padStart(2, "0") + ":00"; }
    function renderMap() {
      mapHost.replaceChildren();
      const map = FDT.map.render({ corridorId: corridor.id, hour: currentHour, trips: FDT.data.trips });
      map.querySelector("svg").style.transform = "scale(" + zoom + ")";
      map.querySelector("svg").style.transformOrigin = "center center";
      mapHost.append(map);
    }
    function renderTable() {
      tableBody.replaceChildren();
      const ordered = segments.slice();
      if (sortMode === "risk") ordered.sort(function (a, b) { return b.risk[currentHour] - a.risk[currentHour]; });
      ordered.forEach(function (segment) {
        const risk = segment.risk[currentHour];
        const row = document.createElement("tr");
        const watched = FDT.state.watchedSegments.includes(segment.id);
        row.innerHTML =
          '<td data-label="Segment"><a class="table-primary-link" href="#/segment/' + encodeURIComponent(segment.id) + '">' + FDT.escapeHtml(segment.id) + '</a><small>' + FDT.escapeHtml(segment.name) + (watched ? ' <span class="pill pill--info">Watching</span>' : "") + '</small></td>' +
          '<td class="number" data-label="KM">' + segment.km + '</td>' +
          '<td data-label="Risk"><span class="number">' + risk.toFixed(2) + '</span> <span class="pill pill--' + riskKind(risk) + '">' + (risk >= 0.6 ? "High" : risk >= 0.3 ? "Moderate" : "Low") + '</span></td>' +
          '<td class="number" data-label="Rain">' + segment.rainMmHr[currentHour] + ' mm/h</td>' +
          '<td data-label="Open"><a class="button button--subtle" href="#/segment/' + encodeURIComponent(segment.id) + '" aria-label="Open ' + FDT.escapeHtml(segment.id) + '">→</a></td>';
        tableBody.append(row);
      });
    }
    function updateView() {
      hourSlider.value = String(currentHour);
      root.querySelector("#hour-offset").textContent = (currentHour - 10 >= 0 ? "+" : "") + (currentHour - 10) + " h";
      root.querySelector("#hour-label").textContent = formatHour(currentHour);
      root.querySelector("[data-table-hour]").textContent = formatHour(currentHour);
      renderMap();
      renderTable();
    }
    function stopPlayback() {
      window.clearInterval(playbackTimer);
      playbackTimer = null;
      const button = root.querySelector("#play-hours");
      if (button) {
        button.setAttribute("aria-pressed", "false");
        button.innerHTML = '<span aria-hidden="true">▶</span> Play 24 h';
      }
    }
    hourSlider.addEventListener("input", function () {
      currentHour = Number(hourSlider.value);
      updateView();
    });
    root.querySelector("#play-hours").addEventListener("click", function () {
      if (playbackTimer) {
        stopPlayback();
        return;
      }
      const button = root.querySelector("#play-hours");
      button.setAttribute("aria-pressed", "true");
      button.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
      playbackTimer = window.setInterval(function () {
        currentHour = (currentHour + 1) % 24;
        updateView();
      }, 700);
    });
    root.querySelectorAll("[data-sort]").forEach(function (button) {
      button.addEventListener("click", function () {
        sortMode = button.getAttribute("data-sort");
        root.querySelectorAll("[data-sort]").forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
        renderTable();
      });
    });
    root.querySelectorAll("[data-zoom]").forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.getAttribute("data-zoom");
        zoom = action === "reset" ? 1 : Math.min(1.6, Math.max(0.8, zoom + (action === "in" ? 0.1 : -0.1)));
        renderMap();
      });
    });
    const note = FDT.ui.designNote(1, "Move the time slider to see how corridor risk changes hour by hour.");
    if (note) root.querySelector(".design-note-placeholder").replaceWith(note);
    else root.querySelector(".design-note-placeholder").remove();
    updateView();

    const refresh = document.querySelector('[data-action="refresh-forecast"]');
    function onRefresh(event) {
      if (event.target !== refresh && !refresh.contains(event.target)) return;
      if (refresh.disabled) return;
      refresh.disabled = true;
      refresh.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Refreshing <span class="simulated">Simulated</span>';
      refreshTimer = window.setTimeout(function () {
        refresh.disabled = false;
        refresh.innerHTML = 'Refresh forecast <span class="simulated">Simulated</span>';
        FDT.toast("Forecast refreshed from synthetic data.");
        refreshTimer = null;
      }, 900);
    }
    document.addEventListener("click", onRefresh);
    FDT._riskMapCleanup = function () {
      stopPlayback();
      window.clearTimeout(refreshTimer);
      document.removeEventListener("click", onRefresh);
      FDT._riskMapCleanup = null;
    };
  }

  FDT.pages["risk-map"] = {
    title: "Corridor Risk Map",
    render: render,
    destroy: function () { if (FDT._riskMapCleanup) FDT._riskMapCleanup(); }
  };
}());
